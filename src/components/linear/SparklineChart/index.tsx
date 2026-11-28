import { bisector } from 'd3-array';
import { format as d3Format } from 'd3-format';
import { scaleBand, scaleLinear, scalePoint } from 'd3-scale';
import { pointer, select, type Selection } from 'd3-selection';
import { curveCatmullRom, curveLinear, curveStep, line } from 'd3-shape';
import 'd3-transition';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

import useTooltip from '@/hooks/useTooltip';
import useChartSize from '@/hooks/useChartSize';
import type { AxisConfig, ChartProps, TooltipConfig } from '@/types';
import { chartClassName } from '@/utils';
import { isFiniteNumber } from '@/utils/domain';
import { warnOnceInDev } from '@/utils/devEnvironment';
import { interruptTransitions } from '@/utils/interruptTransitions';
import {
  createTimeScale,
  makeDateFormatter,
  makeDateParser,
  useTimeAxisWarnings,
} from '@/utils/timeScale';

// `any` default matches ChartProps<TData = any> and the other charts' props.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface SparklineSeries<TData = any> {
  /** Numeric key for this row. */
  key: Extract<keyof TData, string> | string;
  /** Display name (name label, tooltip, aria). Default: `key`. */
  label?: string;
  /** Row class (line and its dots). Use `text-*` / `stroke-*`; nothing is coloured by default. */
  className?: string;
  /** Default `'line'`. Same values as LineChart minus `bumpX`. */
  curve?: 'line' | 'step' | 'rounded';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface SparklineChartProps<TData = any>
  extends Omit<ChartProps<TData>, 'zooming'> {
  data: TData[];
  /**
   * Shared ordered x. Standard AxisConfig: `scalingFunction: 'time'`,
   * `time.isISO/format/utc` (UTC when `time.utc ?? isISO`), `start`/`end`
   * pins. `axis` is ignored (no axes are drawn).
   */
  x: AxisConfig<TData>;
  /** One row per entry, top to bottom in array order. */
  y: SparklineSeries<TData>[];
  /** Shared y domain pins. Default: min..max across all series; zero is not forced. */
  domain?: { start?: number; end?: number };
  /** Opt-in dots. Each `true` or `{ className }`. Default all off. */
  markers?: {
    last?: boolean | { className?: string };
    min?: boolean | { className?: string };
    max?: boolean | { className?: string };
  };
  /**
   * Opt-in text. Default all off. Labels sit in the margins and the chart
   * does not measure text: widen `margin.left` for names and `margin.right`
   * for last values.
   */
  labels?: {
    /** Series name, right-aligned in the left margin. */
    name?: boolean | { className?: string };
    /** Last value, left-aligned in the right margin. */
    last?: boolean | { className?: string; format?: (v: number) => string };
  };
  tooltip?: TooltipConfig;
  /** Accessible name → SVG `<title>` + `aria-labelledby`. */
  title?: string;
  /** Longer accessible description → SVG `<desc>` + `aria-describedby`. */
  description?: string;
  /** Used only when `title` is omitted. Default `"Sparkline chart"`. */
  ariaLabel?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface SparklineDatum<TData = any> {
  /** Source row. */
  data: TData;
  seriesKey: string;
  seriesLabel: string;
  x: Date | number | string;
  value: number;
  /** Row index in sorted data. */
  index: number;
}

type TooltipHandlers = Pick<
  ReturnType<typeof useTooltip>,
  'onMouseOver' | 'onMouseMove' | 'onMouseLeave'
>;

type Row = Record<string, unknown>;

const DEFAULT_STYLE = {};
const DEFAULT_DRAWING = { duration: 0 };
const DEFAULT_MARGIN = { top: 4, right: 4, bottom: 4, left: 4 };
const DEFAULT_ROW_PADDING = 0.3;
const MARKER_RADIUS = 2;
/** Clip rect overhang past the row band on every side. */
const CLIP_INSET = MARKER_RADIUS + 1;
const LABEL_OFFSET = 6;
const FADE_MS = 150;

const curves = { line: curveLinear, step: curveStep, rounded: curveCatmullRom };

const defaultValueFormat = d3Format(',~f');

const option = <T extends object>(opt: boolean | T | undefined): T | null =>
  opt === true ? ({} as T) : opt ? opt : null;

/** Default tooltip: label, then `x: value`. */
const makeDefaultHtml = (x: AxisConfig) => {
  const formatDate = makeDateFormatter(x);
  return (datum: unknown): string => {
    const d = datum as SparklineDatum | undefined;
    if (!d) return '';
    const xText =
      d.x instanceof Date
        ? formatDate(d.x)
        : typeof d.x === 'number'
        ? defaultValueFormat(d.x)
        : String(d.x);
    return `${d.seriesLabel}<br/>${xText}: ${defaultValueFormat(d.value)}`;
  };
};

interface Point {
  index: number;
  px: number;
  value: number;
}

/* catalog:start */
/**
 * One small axis-free line per series, stacked as equal-height rows on one
 * shared y scale, so trends and relative levels compare across many series.
 *
 * @remarks
 *
 * **Use when**
 * - Many series (beyond ~8) whose trends should be compared without
 *   overplotting
 * - A compact trend summary per series, where shape and relative level
 *   matter more than exact values
 * - Dashboard rows of KPIs on a common scale
 *
 * **Avoid when**
 * - Exact values or axis reading matter — use LineChart
 * - Series are on different units or scales, so a shared y would flatten
 *   some — use separate SparklineCharts or LineChart
 * - There are only one or two series — use LineChart
 *
 * Also called: sparkline, sparklines, sparkline chart, tufte sparkline, word-sized line chart.
 *
 * Answers: trend, comparison. Required props: `id`, `data`, `x`, `y`.
 *
 * @example
 * ```tsx
 * <SparklineChart
 *   id="kpis"
 *   className="w-64 h-48"
 *   data={data}
 *   x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
 *   y={[
 *     { key: 'revenue', label: 'Revenue', className: 'text-blue-500' },
 *     { key: 'users', label: 'Users', className: 'text-emerald-500' },
 *   ]}
 *   margin={{ left: 64, right: 40, top: 4, bottom: 4 }}
 *   markers={{ last: true, min: { className: 'text-red-500' }, max: { className: 'text-blue-700' } }}
 *   labels={{ name: true, last: true }}
 * />
 * ```
 *
 * @see LineChart — axes and exact reading matter, with few series
 * @see AreaChart — cumulative magnitude under the line matters
 */
/* catalog:end */
const SparklineChart = <TData = any,>({ // eslint-disable-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
  data,
  id,
  className,
  x,
  y,
  domain,
  markers,
  labels,
  padding,
  margin,
  drawing = DEFAULT_DRAWING,
  tooltip,
  title,
  description,
  ariaLabel,
  style = DEFAULT_STYLE,
}: SparklineChartProps<TData>) => {
  const plotRef = useRef<SVGGElement>(null);
  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: makeDefaultHtml(x),
  });

  // Handlers are new each render but read the latest config; d3 listeners
  // call them through a ref so a new `tooltip` identity doesn't redraw.
  const tooltipHandlers = useRef<TooltipHandlers | null>(null);
  useLayoutEffect(() => {
    tooltipHandlers.current = { onMouseOver, onMouseMove, onMouseLeave };
  });

  useTimeAxisWarnings('SparklineChart', id, data ?? [], x, { checkBarWidth: false });

  // Redraws when the svg's rendered size changes, including container-driven
  // resizes (#53). null until measured, so the first draw is at the real size.
  const svgRef = useRef<SVGSVGElement>(null);
  const size = useChartSize(svgRef);
  const measured = size !== null;
  const width = size?.width ?? 0;
  const height = size?.height ?? 0;

  const refreshChart = useCallback(() => {
    const plotNode = plotRef.current;
    if (!plotNode) return;
    interruptTransitions(plotNode);
    const root = select(plotNode);
    root.selectAll('*').remove();

    const m = { ...DEFAULT_MARGIN, ...margin };
    root.attr('transform', `translate(${m.left},${m.top})`);
    const innerWidth = Math.max(0, width - m.left - m.right);
    const innerHeight = Math.max(0, height - m.top - m.bottom);

    // Series: later duplicates are dropped.
    const seen = new Set<string>();
    const series = (y ?? []).filter((s) => {
      if (seen.has(s.key)) {
        warnOnceInDev(
          `SparklineChart#${id}:duplicate-series:${s.key}`,
          `[headless-charts] SparklineChart#${id}: y has more than one series with key "${s.key}"; the later one is dropped`
        );
        return false;
      }
      seen.add(s.key);
      return true;
    });
    const input = (data ?? []) as Row[];
    if (input.length === 0 || series.length === 0) return;

    // x: time, numeric linear, or point (input order).
    const rawX = (d: Row) => d?.[x.key];
    const isTime = x.scalingFunction === 'time';
    const isNumeric = !isTime && input.every((d) => isFiniteNumber(rawX(d)));
    type Parsed = { row: Row; x: Date | number | string };
    let rows: Parsed[];
    if (isTime) {
      const parse = makeDateParser(x);
      rows = input
        .flatMap((row) => {
          const date = parse(rawX(row));
          return date ? [{ row, x: date }] : [];
        })
        .sort((a, b) => +a.x - +b.x);
    } else if (isNumeric) {
      rows = input
        .map((row) => ({ row, x: rawX(row) as number }))
        .sort((a, b) => (a.x as number) - (b.x as number));
    } else {
      rows = input.map((row) => ({ row, x: String(rawX(row) ?? '') }));
    }
    if (rows.length === 0) return;

    let xPos: (v: Date | number | string) => number;
    if (isTime || isNumeric) {
      const nums = rows.map((r) => +r.x);
      const lo = isFiniteNumber(x.start) ? x.start : Math.min(...nums);
      const hi = isFiniteNumber(x.end) ? x.end : Math.max(...nums);
      const scale = isTime
        ? createTimeScale(x).domain([lo, hi]).range([0, innerWidth])
        : scaleLinear().domain([lo, hi]).range([0, innerWidth]);
      xPos = (v) => scale(v as number & Date);
    } else {
      const scale = scalePoint<string>()
        .domain(rows.map((r) => r.x as string))
        .range([0, innerWidth]);
      xPos = (v) => scale(v as string) ?? 0;
    }

    // Per-series finite points.
    const pointsBySeries: Point[][] = series.map((s) =>
      rows.flatMap((r, index) => {
        const v = r.row?.[s.key];
        return isFiniteNumber(v) ? [{ index, px: xPos(r.x), value: v }] : [];
      })
    );

    // Shared y domain: exact min..max, pins honoured, flat → v ± 1.
    const all = pointsBySeries.flat().map((p) => p.value);
    let pinStart = isFiniteNumber(domain?.start) ? domain!.start : undefined;
    let pinEnd = isFiniteNumber(domain?.end) ? domain!.end : undefined;
    if (pinStart !== undefined && pinEnd !== undefined && pinStart > pinEnd) {
      warnOnceInDev(
        `SparklineChart#${id}:domain:${pinStart}:${pinEnd}`,
        `[headless-charts] SparklineChart#${id}: domain.start (${pinStart}) is greater than domain.end (${pinEnd}); both are ignored`
      );
      pinStart = pinEnd = undefined;
    }
    let yLo = pinStart ?? (all.length ? Math.min(...all) : NaN);
    let yHi = pinEnd ?? (all.length ? Math.max(...all) : NaN);
    if (yLo === yHi) {
      yLo -= 1;
      yHi += 1;
    }
    const hasDomain = Number.isFinite(yLo) && Number.isFinite(yHi);

    const band = scaleBand<string>()
      .domain(series.map((s) => s.key))
      .range([0, innerHeight])
      .padding(padding?.bar ?? DEFAULT_ROW_PADDING);
    const bh = band.bandwidth();

    const duration = isFiniteNumber(drawing?.duration) && drawing.duration > 0 ? drawing.duration : 0;
    const delayStep = isFiniteNumber(drawing?.delay) && drawing.delay > 0 ? drawing.delay : 0;

    const markerOpts = {
      last: option(markers?.last),
      min: option(markers?.min),
      max: option(markers?.max),
    };
    const nameOpt = option(labels?.name);
    const lastOpt = option(labels?.last);
    const lastFormat = lastOpt?.format ?? defaultValueFormat;

    const defs = root.append('defs');
    const rowsG = root.append('g').attr('class', 'sparkline-rows');
    const hitG = root.append('g').attr('class', 'sparkline-hit-areas');

    series.forEach((s, i) => {
      const label = s.label ?? s.key;
      const top = band(s.key) ?? 0;
      const yScale = scaleLinear()
        .domain(hasDomain ? [yLo, yHi] : [0, 1])
        .range([top + bh, top]);
      const points = pointsBySeries[i];
      const last = points[points.length - 1];
      // One pass; strict comparisons keep the first occurrence on ties.
      let minP: Point | undefined;
      let maxP: Point | undefined;
      for (const p of points) {
        if (!minP || p.value < minP.value) minP = p;
        if (!maxP || p.value > maxP.value) maxP = p;
      }
      const fmt = (v: number | undefined) => (v === undefined ? 'n/a' : defaultValueFormat(v));
      const rowDelay = i * delayStep;

      const clipId = `${id}-sparkline-clip-${i}`;
      defs
        .append('clipPath')
        .attr('id', clipId)
        .append('rect')
        // Inset by a marker radius (+1 for the stroke) so edge dots and the
        // line's peak stroke at the domain ends aren't cut in half.
        .attr('x', -CLIP_INSET)
        .attr('y', top - CLIP_INSET)
        .attr('width', innerWidth + 2 * CLIP_INSET)
        .attr('height', bh + 2 * CLIP_INSET);

      const g = rowsG
        .append('g')
        .attr('data-testid', 'sparkline')
        .attr('data-series', s.key)
        .attr('aria-label',
          `${label}: first ${fmt(points[0]?.value)}, last ${fmt(last?.value)}, min ${fmt(minP?.value)}, max ${fmt(maxP?.value)}`
        )
        .attr('pointer-events', 'none');
      if (s.className) g.attr('class', s.className);

      const fadeIn = <E extends SVGElement>(sel: Selection<E, unknown, null, undefined>) => {
        if (!duration) return;
        sel
          .attr('opacity', 0)
          .transition()
          .delay(rowDelay + duration)
          .duration(FADE_MS)
          .attr('opacity', 1);
      };

      if (points.length) {
        const byIndex = new Map(points.map((p) => [p.index, p]));
        const path = g
          .append('path')
          .attr('data-testid', 'sparkline-line')
          .attr('clip-path', `url(#${clipId})`)
          .attr('fill', 'none')
          .attr('stroke', 'currentColor')
          .attr('vector-effect', 'non-scaling-stroke')
          .attr(
            'd',
            line<number>()
              .defined((idx) => byIndex.has(idx))
              .x((idx) => byIndex.get(idx)!.px)
              .y((idx) => yScale(byIndex.get(idx)!.value))
              .curve(curves[s.curve ?? 'line'] ?? curveLinear)(rows.map((_, idx) => idx))
          );
        if (duration) {
          const node = path.node();
          let length = NaN;
          try {
            length = node?.getTotalLength?.() ?? NaN;
          } catch {
            length = NaN;
          }
          if (!(length > 0)) {
            // No layout (jsdom): approximate with the polyline length.
            length = points.reduce(
              (sum, p, k) =>
                k === 0
                  ? 0
                  : sum +
                    Math.hypot(
                      p.px - points[k - 1].px,
                      yScale(p.value) - yScale(points[k - 1].value)
                    ),
              0
            ) || 1;
          }
          path
            .attr('stroke-dasharray', `${length} ${length}`)
            .attr('stroke-dashoffset', length)
            .transition()
            .delay(rowDelay)
            .duration(duration)
            .attr('stroke-dashoffset', 0)
            .on('end', function () {
              select(this).attr('stroke-dasharray', null).attr('stroke-dashoffset', null);
            });
        }

        const dot = (testid: string, p: Point, cls?: string) => {
          const c = g
            .append('circle')
            .attr('data-testid', testid)
            .attr('clip-path', `url(#${clipId})`)
            .attr('cx', p.px)
            .attr('cy', yScale(p.value))
            .attr('r', MARKER_RADIUS)
            .attr('fill', 'currentColor');
          if (cls) c.attr('class', cls);
          fadeIn(c);
        };
        if (markerOpts.min && minP) dot('sparkline-min', minP, markerOpts.min.className);
        if (markerOpts.max && maxP) dot('sparkline-max', maxP, markerOpts.max.className);
        if (markerOpts.last && last) dot('sparkline-last', last, markerOpts.last.className);

        if (lastOpt && last) {
          const t = g
            .append('text')
            .attr('data-testid', 'sparkline-last-value')
            .attr('x', innerWidth + LABEL_OFFSET)
            .attr('y', yScale(last.value))
            .attr('text-anchor', 'start')
            .attr('dominant-baseline', 'middle')
            .attr('fill', 'currentColor')
            .text(lastFormat(last.value));
          if (lastOpt.className) t.attr('class', lastOpt.className);
          fadeIn(t);
        }
      }

      if (nameOpt) {
        const t = g
          .append('text')
          .attr('data-testid', 'sparkline-name')
          .attr('x', -LABEL_OFFSET)
          .attr('y', top + bh / 2)
          .attr('text-anchor', 'end')
          .attr('dominant-baseline', 'middle')
          .attr('fill', 'currentColor')
          .text(label);
        if (nameOpt.className) t.attr('class', nameOpt.className);
        fadeIn(t);
      }

      // Hit area: the whole row band, so flat rows stay hoverable.
      const datumAt = (event: unknown): SparklineDatum<TData> | null => {
        if (!points.length) return null;
        const [mx] = pointer(event, plotNode);
        const p = points[bisector((q: Point) => q.px).center(points, mx)];
        const r = rows[p.index];
        return {
          data: r.row as TData,
          seriesKey: s.key,
          seriesLabel: label,
          x: r.x,
          value: p.value,
          index: p.index,
        };
      };
      const show = (event: unknown) => {
        const d = datumAt(event);
        if (d) tooltipHandlers.current?.onMouseOver(event, d);
      };
      hitG
        .append('rect')
        .attr('data-testid', 'sparkline-hit')
        .attr('data-series', s.key)
        .attr('x', 0)
        .attr('y', top)
        .attr('width', innerWidth)
        .attr('height', bh)
        .attr('fill', 'transparent')
        .attr('pointer-events', 'all')
        .on('mouseenter', show)
        .on('mousemove', show)
        .on('mouseleave', () => tooltipHandlers.current?.onMouseLeave());
    });
  }, [width, height, data, id, x, y, domain, markers, labels, padding, margin, drawing]);

  useEffect(() => {
    if (!measured) return;
    refreshChart();
    // Hold the node: cleanup runs after the svg has left the document.
    const plot = plotRef.current;
    return () => {
      interruptTransitions(plot);
    };
    // A style/className size change reaches refreshChart through useChartSize.
  }, [refreshChart, measured]);

  const titleId = title ? `${id}-title` : undefined;
  const descId = description ? `${id}-desc` : undefined;

  return (
    <svg
      ref={svgRef}
      id={id}
      style={style}
      className={chartClassName(className)}
      role='img'
      aria-labelledby={titleId}
      aria-describedby={descId}
      aria-label={title ? undefined : ariaLabel ?? 'Sparkline chart'}
      data-testid='sparkline-chart'
    >
      {title ? <title id={titleId}>{title}</title> : null}
      {description ? <desc id={descId}>{description}</desc> : null}
      <g ref={plotRef} className='sparkline-plot' />
    </svg>
  );
};

export default SparklineChart;

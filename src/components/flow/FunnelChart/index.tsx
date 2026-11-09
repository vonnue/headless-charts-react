import { scaleBand } from 'd3-scale';
import { select } from 'd3-selection';
import 'd3-transition';
import { useCallback, useEffect, useRef } from 'react';
import { twMerge } from 'tailwind-merge';

import useTooltip from '@/hooks/useTooltip';
import { ChartProps, TooltipConfig } from '@/types';
import { defaultChartClassNames } from '@/utils';
import { isFiniteNumber } from '@/utils/domain';
import measureSvg from '@/utils/measureSvg';
import { warnOnceInDev } from '@/utils/devEnvironment';
import {
  FUNNEL_POLICY,
  PercentKind,
  formatPercent,
  isInvalidValue,
  markLength,
  polygonPath,
  sanitizeValue,
  stageGeometry,
  stagePercents,
  valueDomain,
} from './geometry';

export type { PercentKind } from './geometry';

// `any` default matches ChartProps<TData = any> and the other charts' props.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface FunnelChartProps<TData = any> extends ChartProps<TData> {
  data: TData[];
  /** Ordered category key. Array order is stage order; the chart does not sort. */
  stage: {
    key: Extract<keyof TData, string> | string;
    /** Stage-label text class. */
    className?: string;
  };
  /** Quantitative key. Length of each mark. */
  value: {
    key: Extract<keyof TData, string> | string;
    /** Default mark fill/stroke class for every stage. */
    className?: string;
    /** Pin the upper end of the value domain. Ignored when non-finite. */
    end?: number;
    /**
     * Pinning `start` away from 0 would truncate length encoding. Finite
     * `start` is ignored with a one-time dev warning; the scale always
     * includes 0.
     */
    start?: number;
  };
  /** Default `'vertical'` — stages top → bottom. `'horizontal'` — left → right. */
  orientation?: 'vertical' | 'horizontal';
  /** Default `'bar'` — centred rectangles. `'trapezoid'` — connected segments. */
  shape?: 'bar' | 'trapezoid';
  /**
   * Per-stage mark class, keyed by the stage label string. Overrides
   * `value.className` for that stage. Colour identifies stage identity; it
   * must not encode magnitude.
   */
  classNameMap?: Record<string, string>;
  labels?: {
    /** Default `false`. */
    stage?:
      | boolean
      | {
          className?: string;
          format?: (stage: string, d: TData, i: number) => string;
        };
    /** Default `false`. */
    value?:
      | boolean
      | {
          className?: string;
          format?: (value: number, d: TData, i: number) => string;
        };
    /**
     * Default `false`. `'ofFirst'` | `'ofPrevious'` | `'both'`, or an object.
     * Percents are ratios in `[0, +∞)`; `null` when the divisor is 0 / missing.
     */
    percent?:
      | false
      | 'ofFirst'
      | 'ofPrevious'
      | 'both'
      | {
          of: 'first' | 'previous' | 'both';
          className?: string;
          format?: (
            pct: number | null,
            kind: PercentKind,
            d: TData,
            i: number
          ) => string;
        };
  };
  tooltip?: TooltipConfig;
  /**
   * Accessible name written into SVG `<title>` and wired with
   * `aria-labelledby`. Prefer this over a bare `aria-label`.
   */
  title?: string;
  /** Longer accessible description → SVG `<desc>` + `aria-describedby`. */
  description?: string;
  /** Used only when `title` is omitted. Default `"Funnel chart"`. */
  ariaLabel?: string;
}

/** Computed values attached to the datum passed to tooltip handlers. */
export interface FunnelDatumInfo {
  index: number;
  ofFirst: number | null;
  ofPrevious: number | null;
}

/** A data row as read by key; rows are user records of unknown shape. */
type Row = Record<string, unknown>;

const DEFAULT_STYLE = {};
const DEFAULT_DRAWING = { duration: 0 };
const DEFAULT_BAND_PADDING = 0.1;

type LabelOption<F> = { className?: string; format?: F } | null;

/** `true` → `{}`, object → itself, anything else → `null` (off). */
const labelOption = <F,>(
  opt: boolean | { className?: string; format?: F } | undefined
): LabelOption<F> => (opt === true ? {} : opt ? opt : null);

type PercentFormat = NonNullable<
  Extract<
    NonNullable<NonNullable<FunnelChartProps['labels']>['percent']>,
    object
  >['format']
>;

/** Normalises `labels.percent` to the kinds to print plus class/format. */
const percentOption = (
  opt: NonNullable<FunnelChartProps['labels']>['percent']
): { kinds: PercentKind[]; className?: string; format?: PercentFormat } | null => {
  if (!opt) return null;
  const of = typeof opt === 'string' ? opt : opt.of;
  const kinds: PercentKind[] =
    of === 'both'
      ? ['ofFirst', 'ofPrevious']
      : of === 'ofFirst' || of === 'first'
      ? ['ofFirst']
      : ['ofPrevious'];
  return typeof opt === 'string'
    ? { kinds }
    : { kinds, className: opt.className, format: opt.format };
};

/** Default tooltip: stage, value (as drawn), then both percents. */
const defaultTooltipHtml =
  (stageKey: string, valueKey: string) =>
  (datum: unknown): string => {
    const d = (datum ?? {}) as Row & { __funnel?: FunnelDatumInfo };
    const info = d.__funnel;
    return `${String(d?.[stageKey] ?? '')}<br/>${sanitizeValue(
      d?.[valueKey]
    )}<br/>of first: ${formatPercent(
      info?.ofFirst ?? null
    )}<br/>of previous: ${formatPercent(info?.ofPrevious ?? null)}`;
  };

/* catalog:start */
/**
 * Ordered conversion stages drawn as centred bars or connected trapezoids
 * whose length encodes each stage value, so drop-off along the path is the
 * story.
 *
 * @remarks
 *
 * **Use when**
 * - Counts move through a fixed ordered path and the drop-off between stages
 *   is the message, e.g. visit → signup → paid
 * - Each stage should be read as a share of the first stage or of the
 *   previous one — set `labels.percent` to `"ofFirst"`, `"ofPrevious"` or
 *   `"both"`
 * - Stages should stay in the given order rather than being sorted by value
 *
 * **Avoid when**
 * - The parts are an unordered split of one whole — use PieChart
 * - It is a ranked snapshot with no stage-to-stage drop-off story — use
 *   BarChart
 * - The steps are additive bridge steps to a total — use ColumnChartStacked
 *   with `waterfall`
 * - Colour is used to encode magnitude (darker = larger) — length already
 *   encodes value; keep `classNameMap` / `value.className` as stage identity
 *   only
 * - The flow is volume between arbitrary nodes rather than one ordered path
 *   — Network only shows topology; a Sankey fits once available
 *
 * Also called: funnel, funnel chart, conversion funnel.
 *
 * Answers: composition, comparison. Required props: `id`, `data`, `stage`, `value`.
 *
 * @example
 * ```tsx
 * <FunnelChart
 *   id="signup"
 *   className="w-full h-80"
 *   data={data}
 *   stage={{ key: 'name' }}
 *   value={{ key: 'count', className: 'fill-slate-400' }}
 *   classNameMap={{ Visit: 'fill-slate-500', Signup: 'fill-slate-400', Paid: 'fill-slate-300' }}
 *   shape="trapezoid"
 *   labels={{ stage: true, value: true, percent: 'ofFirst' }}
 *   title="Signup conversion"
 * />
 * ```
 *
 * @see BarChart — a ranked snapshot with no stage-to-stage drop-off
 * @see ColumnChartStacked — additive steps to a total (waterfall)
 * @see PieChart — an unordered part-to-whole split
 */
/* catalog:end */
const FunnelChart = <TData = any,>({ // eslint-disable-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
  data,
  id,
  className,
  stage,
  value,
  orientation = 'vertical',
  shape = 'bar',
  classNameMap,
  labels,
  padding,
  margin,
  drawing = DEFAULT_DRAWING,
  tooltip,
  title,
  description,
  ariaLabel,
  style = DEFAULT_STYLE,
}: FunnelChartProps<TData>) => {
  const plotRef = useRef<SVGGElement>(null);
  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: defaultTooltipHtml(stage.key, value.key),
  });

  const refreshChart = useCallback(() => {
    if (!plotRef.current) return;
    const svgNode = plotRef.current.ownerSVGElement;
    const root = select(plotRef.current);
    root.selectAll('*').remove();

    const rows = (data ?? []) as Row[];
    if (rows.length === 0) return;

    const stageLabelOpt = labelOption(labels?.stage);
    const valueLabelOpt = labelOption(labels?.value);
    const percentOpt = percentOption(labels?.percent);

    // Stage labels sit outside the plot (left of a vertical funnel, below a
    // horizontal one), so leave room for them by default.
    const m = {
      top: 20,
      right: 20,
      bottom: orientation === 'horizontal' && stageLabelOpt ? 40 : 20,
      left: orientation === 'vertical' && stageLabelOpt ? 100 : 20,
      ...margin,
    };
    const p = { top: 0, right: 0, bottom: 0, left: 0, ...padding };

    const { width, height } = measureSvg(svgNode);
    const plotLeft = m.left + p.left,
      plotRight = Math.max(plotLeft, width - m.right - p.right),
      plotTop = m.top + p.top,
      plotBottom = Math.max(plotTop, height - m.bottom - p.bottom);

    const rawValues = rows.map((d) => d?.[value.key]);
    if (rawValues.some(isInvalidValue))
      warnOnceInDev(
        `FunnelChart#${id}:value`,
        `FunnelChart#${id}: negative or non-numeric values for value.key "${value.key}" are drawn as 0.`
      );
    if (!FUNNEL_POLICY.honorValueStart && isFiniteNumber(value.start))
      warnOnceInDev(
        `FunnelChart#${id}:value.start`,
        `FunnelChart#${id}: value.start (${value.start}) is ignored; a funnel's length encoding always starts at 0.`
      );

    const values = rawValues.map(sanitizeValue);
    const stages = rows.map((d) => String(d?.[stage.key] ?? ''));
    const percents = stagePercents(values);
    const domain = valueDomain(values, value);

    const vertical = orientation === 'vertical';
    const [alongStart, alongEnd] = vertical
      ? [plotTop, plotBottom]
      : [plotLeft, plotRight];
    const [crossStart, crossEnd] = vertical
      ? [plotLeft, plotRight]
      : [plotTop, plotBottom];
    const span = crossEnd - crossStart;
    const centre = (crossStart + crossEnd) / 2;

    const bandFn = scaleBand<number>()
      .domain(rows.map((_, i) => i))
      .range([alongStart, alongEnd])
      .padding(p.bar ?? DEFAULT_BAND_PADDING);
    const bandSize = bandFn.bandwidth();

    const lengths = values.map((v) => markLength(v, domain, span));
    const geoms = rows.map((_, i) =>
      stageGeometry({
        lengths,
        i,
        shape,
        orientation,
        bandStart: bandFn(i) ?? alongStart,
        bandSize,
        centre,
      })
    );

    // The datum handed to tooltip handlers: the original row plus computed info.
    const datums = rows.map((d, i) => ({
      ...d,
      __funnel: { index: i, ...percents[i] } as FunnelDatumInfo,
    }));

    const markClass = (i: number) =>
      twMerge(
        'fill-current',
        (classNameMap && Object.prototype.hasOwnProperty.call(classNameMap, stages[i])
          ? classNameMap[stages[i]]
          : value.className) || ''
      );

    const marksG = root.append('g').attr('class', 'marks');
    const duration = drawing?.duration ?? 0;
    const delay = drawing?.delay ?? 0;
    const indices = rows.map((_, i) => i);

    if (shape === 'bar') {
      const rectAttrs = (i: number, grow: number) => {
        const g = geoms[i];
        const len = g.near * grow;
        return vertical
          ? { x: centre - len / 2, y: g.points[0][1], width: len, height: bandSize }
          : { x: g.points[0][0], y: centre - len / 2, width: bandSize, height: len };
      };
      const rects = marksG
        .selectAll('rect')
        .data(indices)
        .enter()
        .append('rect')
        .attr('data-testid', 'funnel-stage')
        .attr('data-index', (i) => i)
        .attr('data-stage', (i) => stages[i])
        .attr('data-near', (i) => geoms[i].near)
        .attr('data-far', (i) => geoms[i].far)
        .attr('class', markClass)
        .attr('x', (i) => rectAttrs(i, duration ? 0 : 1).x)
        .attr('y', (i) => rectAttrs(i, duration ? 0 : 1).y)
        .attr('width', (i) => rectAttrs(i, duration ? 0 : 1).width)
        .attr('height', (i) => rectAttrs(i, duration ? 0 : 1).height);
      if (duration)
        rects
          .transition()
          .duration(duration)
          .delay((_, idx) => delay + idx * 100)
          .attr('x', (i) => rectAttrs(i, 1).x)
          .attr('y', (i) => rectAttrs(i, 1).y)
          .attr('width', (i) => rectAttrs(i, 1).width)
          .attr('height', (i) => rectAttrs(i, 1).height);
    } else {
      // Collapsed onto the midline, for the grow-in transition.
      const collapsed = (i: number) =>
        polygonPath(
          geoms[i].points.map(([x, y]) =>
            vertical ? [centre, y] : [x, centre]
          ) as [number, number][]
        );
      const paths = marksG
        .selectAll('path')
        .data(indices)
        .enter()
        .append('path')
        .attr('data-testid', 'funnel-stage')
        .attr('data-index', (i) => i)
        .attr('data-stage', (i) => stages[i])
        .attr('data-near', (i) => geoms[i].near)
        .attr('data-far', (i) => geoms[i].far)
        .attr('class', markClass)
        .attr('d', (i) => (duration ? collapsed(i) : polygonPath(geoms[i].points)));
      if (duration)
        paths
          .transition()
          .duration(duration)
          .delay((_, idx) => delay + idx * 100)
          .attr('d', (i) => polygonPath(geoms[i].points));
    }

    // Hit targets: one transparent rect per stage covering its whole band
    // (full plot length × bandwidth), drawn over the marks, so tiny, zero
    // and tapered stages are still hoverable. Marks carry no handlers, so
    // events fire once.
    root
      .append('g')
      .attr('class', 'hit-areas')
      .selectAll('rect')
      .data(indices)
      .enter()
      .append('rect')
      .attr('data-testid', 'funnel-hit')
      .attr('data-index', (i) => i)
      .attr('x', (i) => (vertical ? crossStart : bandFn(i) ?? alongStart))
      .attr('y', (i) => (vertical ? bandFn(i) ?? alongStart : crossStart))
      .attr('width', vertical ? span : bandSize)
      .attr('height', vertical ? bandSize : span)
      .attr('fill', 'transparent')
      .attr('pointer-events', 'all')
      .on('mouseenter', (event, i) => onMouseOver(event, datums[i]))
      .on('mousemove', onMouseMove)
      .on('mouseleave', onMouseLeave);

    // Stage labels: outside the plot, beside each band.
    if (stageLabelOpt) {
      root
        .append('g')
        .attr('class', 'stage-labels')
        .selectAll('text')
        .data(indices)
        .enter()
        .append('text')
        .attr('data-testid', 'funnel-label-stage')
        .attr('class', twMerge('fill-current', stage.className, stageLabelOpt.className))
        .attr('x', (i) => (vertical ? plotLeft - 8 : geoms[i].cx))
        .attr('y', (i) => (vertical ? geoms[i].cy : plotBottom + 16))
        .attr('text-anchor', vertical ? 'end' : 'middle')
        .attr('dominant-baseline', 'middle')
        .text((i) =>
          stageLabelOpt.format
            ? stageLabelOpt.format(stages[i], data[i], i)
            : stages[i]
        );
    }

    // Value and percent labels: centred on each mark, stacked as lines.
    type Line = { i: number; text: string; testid: string; className: string; kind?: PercentKind };
    const lines: Line[][] = indices.map((i) => {
      const out: Line[] = [];
      if (valueLabelOpt)
        out.push({
          i,
          testid: 'funnel-label-value',
          className: valueLabelOpt.className ?? '',
          text: valueLabelOpt.format
            ? valueLabelOpt.format(values[i], data[i], i)
            : String(values[i]),
        });
      percentOpt?.kinds.forEach((kind) =>
        out.push({
          i,
          kind,
          testid: 'funnel-label-percent',
          className: percentOpt.className ?? '',
          text: percentOpt.format
            ? percentOpt.format(percents[i][kind], kind, data[i], i)
            : formatPercent(percents[i][kind]),
        })
      );
      return out;
    });
    const flat = lines.flatMap((ls) =>
      ls.map((l, k) => ({ ...l, offset: k - (ls.length - 1) / 2 }))
    );
    if (flat.length)
      root
        .append('g')
        .attr('class', 'value-labels')
        .selectAll('text')
        .data(flat)
        .enter()
        .append('text')
        .attr('data-testid', (l) => l.testid)
        .attr('data-index', (l) => l.i)
        .attr('data-kind', (l) => l.kind ?? null)
        .attr('class', (l) => twMerge('fill-current', l.className))
        .attr('x', (l) => geoms[l.i].cx)
        .attr('y', (l) => geoms[l.i].cy)
        .attr('dy', (l) => `${l.offset * 1.2}em`)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('pointer-events', 'none')
        .text((l) => l.text);
  }, [
    data,
    id,
    stage,
    value,
    orientation,
    shape,
    classNameMap,
    labels,
    padding,
    margin,
    drawing,
    onMouseOver,
    onMouseMove,
    onMouseLeave,
  ]);

  useEffect(() => {
    refreshChart();
    // style is not read by refreshChart, but it sets the size refreshChart measures.
  }, [refreshChart, style?.width, style?.height]);

  const titleId = title ? `${id}-title` : undefined;
  const descId = description ? `${id}-desc` : undefined;

  return (
    <svg
      id={id}
      style={style}
      className={twMerge(defaultChartClassNames, className)}
      role='img'
      aria-labelledby={titleId}
      aria-describedby={descId}
      aria-label={title ? undefined : ariaLabel ?? 'Funnel chart'}
      data-testid='funnel-chart'
    >
      {title ? <title id={titleId}>{title}</title> : null}
      {description ? <desc id={descId}>{description}</desc> : null}
      <g ref={plotRef} className='funnel-plot' />
    </svg>
  );
};

export default FunnelChart;

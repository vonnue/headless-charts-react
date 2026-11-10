import { format as d3format } from 'd3-format';
import { scaleBand, scaleLinear } from 'd3-scale';
import { Selection, select } from 'd3-selection';
import { area, curveBasis } from 'd3-shape';
import 'd3-transition';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { twMerge } from 'tailwind-merge';

import { drawAxis } from '@/hooks/useAxis';
import useTooltip from '@/hooks/useTooltip';
import { ChartProps, TooltipConfig } from '@/types';
import { defaultChartClassNames } from '@/utils';
import { isFiniteNumber } from '@/utils/domain';
import measureSvg from '@/utils/measureSvg';
import { warnOnceInDev } from '@/utils/devEnvironment';
import {
  BandwidthRule,
  DensityPoint,
  GroupStats,
  KernelType,
  SMALL_N,
  densityAt,
  groupRows,
  groupStats,
  hashUnit,
  kde,
  resolveBandwidth,
} from './stats';

// `any` default matches ChartProps<TData = any> and the other charts' props.
export interface ViolinChartProps<TData = any> extends ChartProps<TData> { // eslint-disable-line @typescript-eslint/no-explicit-any
  /** Raw observations, one row per sample. Precomputed densities are not accepted. */
  data: TData[];
  /** Grouping key. One violin per distinct value. */
  category: {
    key: Extract<keyof TData, string> | string;
    /** Category-axis tick text class. */
    className?: string;
    /**
     * Explicit group order. Listed groups come first, in this order; unlisted
     * groups follow in first-appearance order; listed groups absent from the
     * data are dropped.
     */
    order?: string[];
    axis?: { label?: string; className?: string };
  };
  /** Quantitative key. Position along the value axis. */
  value: {
    key: Extract<keyof TData, string> | string;
    /** Default violin fill/stroke class for every group. */
    className?: string;
    /** Pin the lower end of the value domain (finite only; 0 is not forced). */
    start?: number;
    /** Pin the upper end of the value domain (finite only). */
    end?: number;
    /** Tooltip / label number formatter. Default `d3.format('~g')`. */
    format?: (v: number) => string;
    axis?: { label?: string; ticks?: number; className?: string };
  };
  /** Default `'vertical'`: categories along x, values along y (like BoxPlotV). */
  orientation?: 'vertical' | 'horizontal';
  density?: {
    /** Kernel bandwidth in value units, or a rule. Default `'silverman'`, per group. */
    bandwidth?: number | BandwidthRule;
    /** Multiplier on the resolved bandwidth. Default `1`. Must be finite and > 0. */
    adjust?: number;
    /** Default `'gaussian'`. */
    kernel?: KernelType;
    /** Evaluation points per group. Default `100`, clamped to `[16, 512]`. */
    resolution?: number;
    /** Default `'data'` ([min, max] per group). `'tails'` extends 3 × bandwidth. */
    extent?: 'data' | 'tails';
    /** Width mapping across groups. Default `'area'`; `'count'` ∝ n; `'width'` per-group peak. */
    scale?: 'area' | 'count' | 'width';
  };
  /** Default `'both'` (mirrored). `'start'` / `'end'` draw one half (half-violin / raincloud). */
  side?: 'both' | 'start' | 'end';
  /** Inner summary. Default `'box'`. */
  inner?:
    | 'box'
    | 'quartiles'
    | 'median'
    | 'none'
    | {
        type: 'box' | 'quartiles' | 'median';
        className?: string;
        /** Box width as a fraction of the band. Default `0.1`. Box type only. */
        width?: number;
      };
  /** Raw-sample overlay. Default `false`. */
  points?:
    | boolean
    | {
        className?: string;
        /** Radius in px. Default `2`. */
        radius?: number;
        /** Deterministic jitter spread as a fraction of the half-band. Default `0.5`; `0` = strip. */
        jitter?: number;
      };
  /** Per-group violin class, keyed by category string. Overrides `value.className`. */
  classNameMap?: Record<string, string>;
  tooltip?: TooltipConfig;
  /** Accessible name → SVG `<title>` + `aria-labelledby`. */
  title?: string;
  /** Longer accessible description → SVG `<desc>` + `aria-describedby`. */
  description?: string;
  /** Used only when `title` is omitted. Default `"Violin chart"`. */
  ariaLabel?: string;
}

/** Datum given to tooltip handlers, `tooltip.html` and `tooltip.keys`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ViolinDatum<TData = any> {
  category: string;
  /** Finite samples used. */
  n: number;
  /** Summary stats; `NaN` when n = 0 (printed as `'n/a'`). */
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean: number;
  /** `null` when degenerate (n < 2 or zero spread). */
  bandwidth: number | null;
  /** The original rows of this group (valid samples only). */
  rows: TData[];
}

type TooltipHandlers = Pick<
  ReturnType<typeof useTooltip>,
  'onMouseOver' | 'onMouseMove' | 'onMouseLeave'
>;
type Row = Record<string, unknown>;

const DEFAULT_STYLE = {};
const DEFAULT_DRAWING = { duration: 0 };
const DEFAULT_BAND_PADDING = 0.2;
const DEFAULT_BOX_WIDTH = 0.1;
const DEGENERATE_TICK_WIDTH = 0.5;
const defaultNumberFormat = d3format('~g');

/** Formats a stat, `'n/a'` for non-finite values (never NaN / Infinity). */
const fmtStat = (fmt: (v: number) => string, v: number) =>
  Number.isFinite(v) ? fmt(v) : 'n/a';

const defaultTooltipHtml =
  (fmt: (v: number) => string) =>
  (datum: unknown): string => {
    const d = datum as ViolinDatum;
    const f = (v: number) => fmtStat(fmt, v);
    return `${d.category}<br/>n: ${d.n}<br/>median: ${f(d.median)}<br/>IQR: ${f(d.q1)}–${f(
      d.q3
    )}<br/>range: ${f(d.min)}–${f(d.max)}`;
  };

interface Group {
  key: string;
  rows: Row[];
  stats: GroupStats;
  h: number | null;
  curve: DensityPoint[];
  /** Density multiplier for the shared scale (`count` → n). */
  weight: number;
}

/* catalog:start */
/**
 * Mirrored kernel-density shapes, one per group, showing the full distribution
 * of a raw numeric measure — including multimodality and skew that a
 * five-number summary hides.
 *
 * @remarks
 *
 * **Use when**
 * - The full shape of a distribution (peaks, skew, multimodality or gaps)
 *   matters across groups, and a five-number summary would hide it
 * - Each group has enough raw samples (about 20 or more) for a stable
 *   density
 *
 * **Avoid when**
 * - Only the median and quartiles matter, or the audience will not read
 *   densities — use BoxPlotV or BoxPlotH
 * - The five-number summary is already computed and there are no raw samples
 *   — use BoxPlotV or BoxPlotH
 * - Groups have very few samples (well under 20) — use ScatterPlot, or
 *   BoxPlotV / BoxPlotH if a summary is enough
 * - Only one group's distribution is shown — use ColumnChart with `x.bin`
 * - Densities are already precomputed — use AreaChart; ViolinChart always
 *   estimates from raw rows
 * - Colour would encode magnitude — colour names the group; density is width
 *   only
 *
 * **Specialised types**
 * - Raincloud plot — Set `side: 'start'` and `points: true`.
 *
 * Also called: violin, violin plot, violin chart.
 *
 * Answers: distribution, comparison. Required props: `id`, `data`, `category`, `value`.
 *
 * @example
 * ```tsx
 * <ViolinChart
 *   id="salaries"
 *   className="w-full h-80"
 *   data={data}
 *   category={{ key: 'dept' }}
 *   value={{ key: 'salary', className: 'fill-slate-300 stroke-slate-500', axis: { label: 'Salary' } }}
 *   classNameMap={{ Eng: 'fill-slate-400', Sales: 'fill-slate-300' }}
 *   inner="box"
 *   title="Salary distribution by department"
 * />
 * ```
 *
 * @example Raincloud plot
 * ```tsx
 * <ViolinChart
 *   id="raincloud"
 *   className="w-full h-80"
 *   data={data}
 *   category={{ key: 'dept' }}
 *   value={{ key: 'salary', className: 'fill-slate-300' }}
 *   side="start"
 *   points
 * />
 * ```
 *
 * @see BoxPlotV — only the five-number summary matters
 * @see BoxPlotH — the five-number summary with long category labels
 * @see ColumnChart — one group's distribution as a histogram — set
 *   `x.bin`
 * @see ScatterPlot — very small samples per group, or every point should
 *   stay visible
 */
/* catalog:end */
const ViolinChart = <TData = any,>({ // eslint-disable-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
  data,
  id,
  className,
  category,
  value,
  orientation = 'vertical',
  density,
  side = 'both',
  inner = 'box',
  points = false,
  classNameMap,
  padding,
  margin,
  drawing = DEFAULT_DRAWING,
  tooltip,
  title,
  description,
  ariaLabel,
  style = DEFAULT_STYLE,
}: ViolinChartProps<TData>) => {
  const plotRef = useRef<SVGGElement>(null);
  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: defaultTooltipHtml(value.format ?? defaultNumberFormat),
  });

  // The hook handlers are new each render but read the latest config, so the
  // d3 listeners call them through a ref instead of making them redraw deps.
  const tooltipHandlers = useRef<TooltipHandlers | null>(null);
  useLayoutEffect(() => {
    tooltipHandlers.current = { onMouseOver, onMouseMove, onMouseLeave };
  });

  const refreshChart = useCallback(() => {
    if (!plotRef.current) return;
    const svgNode = plotRef.current.ownerSVGElement;
    const root = select(plotRef.current);
    root.selectAll('*').interrupt();
    root.selectAll('*').remove();

    const rowsIn = ((data ?? []) as unknown[]) as Row[];
    const grouped = groupRows(rowsIn, category.key, value.key, category.order);
    if (grouped.invalidValues > 0)
      warnOnceInDev(
        `ViolinChart#${id}:value`,
        `ViolinChart#${id}: ${grouped.invalidValues} non-finite value(s) for value.key "${value.key}" were excluded (not drawn as 0).`
      );
    if (grouped.missingCategory > 0)
      warnOnceInDev(
        `ViolinChart#${id}:category`,
        `ViolinChart#${id}: ${grouped.missingCategory} row(s) with a null/undefined category.key "${category.key}" were skipped.`
      );
    if (grouped.order.length === 0) return;

    // --- statistics + KDE per group
    let invalidBandwidth = false;
    const kernel = density?.kernel ?? 'gaussian';
    const extent = density?.extent ?? 'data';
    const scaleMode = density?.scale ?? 'area';
    const groups: Group[] = grouped.order.map((key) => {
      const rows = grouped.rows.get(key) ?? [];
      const stats = groupStats(rows.map((r) => r[value.key] as number));
      const { h, invalid } = resolveBandwidth(stats, density?.bandwidth, density?.adjust);
      invalidBandwidth ||= invalid;
      const curve = h === null ? [] : kde(stats, h, { kernel, resolution: density?.resolution, extent });
      return { key, rows, stats, h, curve, weight: scaleMode === 'count' ? stats.n : 1 };
    });
    if (invalidBandwidth)
      warnOnceInDev(
        `ViolinChart#${id}:bandwidth`,
        `ViolinChart#${id}: density.bandwidth / density.adjust must be finite and > 0; falling back to the Silverman rule / adjust 1.`
      );
    groups.forEach((g) => {
      if (g.stats.n === 0)
        warnOnceInDev(
          `ViolinChart#${id}:empty-group`,
          `ViolinChart#${id}: group "${g.key}" has no finite samples; its band is left empty.`
        );
      else if (g.stats.n === 1 || g.stats.min === g.stats.max)
        warnOnceInDev(
          `ViolinChart#${id}:degenerate`,
          `ViolinChart#${id}: group "${g.key}" has ${
            g.stats.n === 1 ? 'one sample' : 'zero spread'
          }; drawn as a tick, no density.`
        );
      else if (g.stats.n < SMALL_N)
        warnOnceInDev(
          `ViolinChart#${id}:small-n`,
          `ViolinChart#${id}: group "${g.key}" has only ${g.stats.n} samples; the density is unreliable — consider \`points\`.`
        );
    });

    // --- value domain: union of drawn extents, niced; pins override
    const lows: number[] = [],
      highs: number[] = [];
    groups.forEach((g) => {
      if (g.curve.length) {
        lows.push(g.curve[0].v);
        highs.push(g.curve[g.curve.length - 1].v);
      } else if (g.stats.n > 0) {
        lows.push(g.stats.min);
        highs.push(g.stats.max);
      }
    });
    const anyKde = groups.some((g) => g.curve.length > 0);
    let lo = lows.length ? Math.min(...lows) : 0;
    let hi = highs.length ? Math.max(...highs) : 0;
    // All groups degenerate (or empty): pad by 1 so the domain is never zero-width.
    if (!anyKde || hi === lo) {
      lo -= 1;
      hi += 1;
    }
    const niced = scaleLinear().domain([lo, hi]).nice().domain();
    let start = isFiniteNumber(value.start) ? value.start : undefined;
    let end = isFiniteNumber(value.end) ? value.end : undefined;
    if (start !== undefined && end !== undefined && start > end) {
      warnOnceInDev(
        `ViolinChart#${id}:domain`,
        `ViolinChart#${id}: value.start (${start}) > value.end (${end}); both pins are ignored.`
      );
      start = end = undefined;
    }
    const domain: [number, number] = [start ?? niced[0], end ?? niced[1]];

    // --- plot rect and scales
    const vertical = orientation === 'vertical';
    const m = { top: 20, right: 20, bottom: 40, left: 50, ...margin };
    const p = { top: 0, right: 0, bottom: 0, left: 0, ...padding };
    const { width, height } = measureSvg(svgNode);
    const plotLeft = m.left + p.left,
      plotRight = Math.max(plotLeft, width - m.right - p.right),
      plotTop = m.top + p.top,
      plotBottom = Math.max(plotTop, height - m.bottom - p.bottom);

    const bandFn = scaleBand<string>()
      .domain(groups.map((g) => g.key))
      .range(vertical ? [plotLeft, plotRight] : [plotTop, plotBottom])
      .padding(p.bar ?? DEFAULT_BAND_PADDING);
    const valueFn = scaleLinear()
      .domain(domain)
      .range(vertical ? [plotBottom, plotTop] : [plotLeft, plotRight]);
    const band = bandFn.bandwidth();
    const halfBand = Math.max(0, band / 2 - 1);
    const mid = (g: Group) => (bandFn(g.key) ?? 0) + band / 2;

    // --- density → half-width
    const sharedMax = Math.max(
      0,
      ...groups.flatMap((g) => g.curve.map((pt) => pt.f * g.weight))
    );
    const halfWidthFn = (g: Group) => {
      const peak =
        scaleMode === 'width' ? Math.max(0, ...g.curve.map((pt) => pt.f)) : sharedMax;
      const w = scaleMode === 'width' ? 1 : g.weight;
      return (f: number) => (peak > 0 ? ((f * w) / peak) * halfBand : 0);
    };

    // Across-axis offsets for each side: [toward start, toward end] multipliers.
    const lowSide = side === 'end' ? 0 : 1;
    const highSide = side === 'start' ? 0 : 1;

    // --- axes
    const axesG = root.append('g').attr('class', 'axes');
    const bandAxis = drawAxis({
      g: axesG,
      scale: bandFn,
      config: { axis: { label: category.axis?.label } },
      dimensions: { width, height },
      margin: m,
      padding: p,
      orientation: vertical ? 'horizontal' : 'vertical',
      className: twMerge(
        `axis axis--${vertical ? 'x' : 'y'} axis--category`,
        category.axis?.className
      ),
    });
    if (category.className)
      bandAxis.axisG.selectAll('.tick text').attr('class', category.className);
    drawAxis({
      g: axesG,
      scale: valueFn,
      config: { axis: { label: value.axis?.label, ticks: value.axis?.ticks ?? 5 } },
      dimensions: { width, height },
      margin: m,
      padding: p,
      orientation: vertical ? 'vertical' : 'horizontal',
      className: twMerge(
        `axis axis--${vertical ? 'y' : 'x'} axis--value`,
        value.axis?.className
      ),
    });

    // --- marks, clipped to the plot (pinned domains may be narrower than data)
    const clipId = `${id}-plot-clip`;
    root
      .append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('x', plotLeft)
      .attr('y', plotTop)
      .attr('width', plotRight - plotLeft)
      .attr('height', plotBottom - plotTop);
    const marksG = root
      .append('g')
      .attr('class', 'marks')
      .attr('clip-path', `url(#${clipId})`);

    // (value, across) → [x, y]
    const xy = (v: number, across: number): [number, number] =>
      vertical ? [across, valueFn(v)] : [valueFn(v), across];
    const line = (
      sel: Selection<SVGGElement, unknown, null, undefined>,
      v: number,
      a0: number,
      a1: number
    ) => {
      const [x1, y1] = xy(v, a0),
        [x2, y2] = xy(v, a1);
      return sel
        .append('line')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2);
    };

    const innerType = typeof inner === 'string' ? inner : inner.type;
    const innerClass = typeof inner === 'string' ? undefined : inner.className;
    const boxFraction =
      typeof inner === 'object' && isFiniteNumber(inner.width) && inner.width >= 0
        ? inner.width
        : DEFAULT_BOX_WIDTH;
    const pointOpt = points === true ? {} : points || null;
    // Jitter is seeded by each row's index in `data`, so it is stable.
    const rowIndex = new Map<Row, number>(rowsIn.map((row, i) => [row, i]));
    const duration = drawing?.duration ?? 0;
    const delay = drawing?.delay ?? 0;

    const violinPath = (g: Group, grow: number) => {
      const c = mid(g);
      const hw = halfWidthFn(g);
      const gen = vertical
        ? area<DensityPoint>()
            .y((pt) => valueFn(pt.v))
            .x0((pt) => c - lowSide * hw(pt.f) * grow)
            .x1((pt) => c + highSide * hw(pt.f) * grow)
        : area<DensityPoint>()
            .x((pt) => valueFn(pt.v))
            .y0((pt) => c - lowSide * hw(pt.f) * grow)
            .y1((pt) => c + highSide * hw(pt.f) * grow);
      return gen.curve(curveBasis)(g.curve) ?? '';
    };

    groups.forEach((g, gi) => {
      const gG = marksG
        .append('g')
        .attr('class', 'violin-group')
        .attr('data-category', g.key)
        .attr('data-index', gi);
      if (g.stats.n === 0) return;
      const c = mid(g);
      const groupClass = twMerge(
        'fill-current',
        (classNameMap && Object.prototype.hasOwnProperty.call(classNameMap, g.key)
          ? classNameMap[g.key]
          : value.className) || ''
      );

      if (g.curve.length) {
        const shape = gG
          .append('path')
          .attr('data-testid', 'violin-shape')
          .attr('data-category', g.key)
          .attr('class', groupClass)
          .attr('d', violinPath(g, duration ? 0 : 1));
        if (duration)
          shape
            .transition()
            .duration(duration)
            .delay(delay + gi * 100)
            .attr('d', violinPath(g, 1));
      } else {
        // n = 1 or zero spread: a visible tick, no density.
        const tw = (DEGENERATE_TICK_WIDTH * band) / 2;
        line(gG, g.stats.median, c - lowSide * tw, c + highSide * tw)
          .attr('data-testid', 'violin-degenerate')
          .attr('data-category', g.key)
          .attr('class', twMerge('violin-degenerate stroke-current', groupClass));
      }

      // Inner summary (on the midline; on the flat edge for half-violins).
      if (innerType !== 'none') {
        const innerG = gG.append('g').attr('class', 'violin-inner-group');
        const tag = <E extends SVGElement>(
          sel: Selection<E, unknown, null, undefined>,
          part: string
        ) =>
          sel
            .attr('data-testid', 'violin-inner')
            .attr('data-part', part)
            .attr('data-category', g.key);
        const hw = halfWidthFn(g);
        const acrossAt = (v: number) =>
          g.h === null ? (DEGENERATE_TICK_WIDTH * band) / 2 : hw(densityAt(v, g.stats.values, g.h, kernel));
        const bw = (boxFraction * band) / 2;
        const s = g.stats;
        if (innerType === 'box' && g.h !== null) {
          // Whisker: min–max along the value axis, on the midline.
          const [wx1, wy1] = xy(s.min, c),
            [wx2, wy2] = xy(s.max, c);
          tag(
            innerG
              .append('line')
              .attr('x1', wx1)
              .attr('y1', wy1)
              .attr('x2', wx2)
              .attr('y2', wy2),
            'whisker'
          ).attr('class', twMerge('stroke-current', innerClass));
          const [bx0, by0] = xy(s.q3, c - lowSide * bw);
          const [bx1, by1] = xy(s.q1, c + highSide * bw);
          tag(
            innerG
              .append('rect')
              .attr('x', Math.min(bx0, bx1))
              .attr('y', Math.min(by0, by1))
              .attr('width', Math.abs(bx1 - bx0))
              .attr('height', Math.abs(by1 - by0)),
            'box'
          ).attr('class', twMerge('fill-current stroke-current', innerClass));
          tag(line(innerG, s.median, c - lowSide * bw, c + highSide * bw), 'median').attr(
            'class',
            twMerge('stroke-current', innerClass)
          );
        } else if (innerType === 'quartiles' && g.h !== null) {
          (
            [
              ['q1', s.q1, '4 2'],
              ['median', s.median, null],
              ['q3', s.q3, '4 2'],
            ] as const
          ).forEach(([part, v, dash]) =>
            tag(line(innerG, v, c - lowSide * acrossAt(v), c + highSide * acrossAt(v)), part)
              .attr('stroke-dasharray', dash)
              .attr('class', twMerge('stroke-current', innerClass))
          );
        } else {
          // 'median', and the inner median of degenerate groups.
          const w = g.h === null ? bw : acrossAt(s.median);
          tag(line(innerG, s.median, c - lowSide * w, c + highSide * w), 'median').attr(
            'class',
            twMerge('stroke-current', innerClass)
          );
        }
      }

      // Points: deterministic jitter; on the empty half for half-violins.
      if (pointOpt) {
        const r = isFiniteNumber(pointOpt.radius) && pointOpt.radius >= 0 ? pointOpt.radius : 2;
        const jitter = isFiniteNumber(pointOpt.jitter) && pointOpt.jitter >= 0 ? pointOpt.jitter : 0.5;
        const offset = (row: Row) => {
          const u = hashUnit(rowIndex.get(row) ?? 0);
          const spread = jitter * halfBand;
          return side === 'start' ? u * spread : side === 'end' ? -u * spread : (u * 2 - 1) * spread;
        };
        gG.append('g')
          .attr('class', 'violin-points')
          .selectAll('circle')
          .data(g.rows)
          .enter()
          .append('circle')
          .attr('data-testid', 'violin-point')
          .attr('data-category', g.key)
          .attr('class', twMerge('fill-current', pointOpt.className))
          .attr('r', r)
          .attr('cx', (row) => xy(row[value.key] as number, c + offset(row))[0])
          .attr('cy', (row) => xy(row[value.key] as number, c + offset(row))[1]);
      }
    });

    // --- hit areas: full band × full value span, above marks and points.
    const datums: ViolinDatum<TData>[] = groups.map((g) => ({
      category: g.key,
      n: g.stats.n,
      min: g.stats.min,
      q1: g.stats.q1,
      median: g.stats.median,
      q3: g.stats.q3,
      max: g.stats.max,
      mean: g.stats.mean,
      bandwidth: g.h,
      rows: g.rows as unknown as TData[],
    }));
    root
      .append('g')
      .attr('class', 'hit-areas')
      .selectAll('rect')
      .data(groups.map((_, i) => i))
      .enter()
      .append('rect')
      .attr('data-testid', 'violin-hit')
      .attr('data-index', (i) => i)
      .attr('data-category', (i) => groups[i].key)
      .attr('x', (i) => (vertical ? bandFn(groups[i].key) ?? plotLeft : plotLeft))
      .attr('y', (i) => (vertical ? plotTop : bandFn(groups[i].key) ?? plotTop))
      .attr('width', vertical ? band : plotRight - plotLeft)
      .attr('height', vertical ? plotBottom - plotTop : band)
      .attr('fill', 'transparent')
      .attr('pointer-events', 'all')
      .on('mouseenter', (event, i) =>
        tooltipHandlers.current?.onMouseOver(event, datums[i])
      )
      .on('mousemove', (event) => tooltipHandlers.current?.onMouseMove(event))
      .on('mouseleave', () => tooltipHandlers.current?.onMouseLeave());
  }, [
    data,
    id,
    category,
    value,
    orientation,
    density,
    side,
    inner,
    points,
    classNameMap,
    padding,
    margin,
    drawing,
  ]);

  useEffect(() => {
    refreshChart();
    // Hold the node: on unmount the cleanup runs after the svg has left the
    // document, so interrupt through this reference, not a lookup by id.
    const plot = plotRef.current;
    return () => {
      if (plot) select(plot).selectAll('*').interrupt();
    };
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
      aria-label={title ? undefined : ariaLabel ?? 'Violin chart'}
      data-testid='violin-chart'
    >
      {title ? <title id={titleId}>{title}</title> : null}
      {description ? <desc id={descId}>{description}</desc> : null}
      <g ref={plotRef} className='violin-plot' />
    </svg>
  );
};

export default ViolinChart;

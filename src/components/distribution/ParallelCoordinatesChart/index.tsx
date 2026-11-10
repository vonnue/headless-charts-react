import { axisBottom, axisLeft, AxisScale } from 'd3-axis';
import { brushX, brushY, D3BrushEvent } from 'd3-brush';
import { format as d3Format } from 'd3-format';
import { scaleLinear, scaleLog, scalePoint } from 'd3-scale';
import { select } from 'd3-selection';
import { curveBumpX, curveBumpY, curveLinear, line as d3Line } from 'd3-shape';
import 'd3-transition';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { twMerge } from 'tailwind-merge';

import useTooltip from '@/hooks/useTooltip';
import { ChartProps, TooltipConfig } from '@/types';
import { defaultChartClassNames } from '@/utils';
import { isFiniteNumber } from '@/utils/domain';
import measureSvg from '@/utils/measureSvg';
import { warnOnceInDev } from '@/utils/devEnvironment';

// `any` default matches ChartProps<TData = any> and the other charts' props.
export interface PCDimension<TData = any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  key: Extract<keyof TData, string> | string;
  /** Axis title. Default: the key. */
  label?: string;
  /**
   * Default: inferred. `'linear'` if every present value is a finite number,
   * otherwise `'point'` (categorical).
   */
  type?: 'linear' | 'log' | 'point';
  /** Pin numeric domain ends (finite only; 0 is a real bound). Ignored for `'point'`. */
  start?: number;
  end?: number;
  /** Flip the axis so high values sit at the bottom (or left when horizontal). Default `false`. */
  reverse?: boolean;
  /** Category order for `'point'` axes. Unlisted categories follow in first-appearance order. */
  order?: string[];
  /** Tick and tooltip formatter. Default `d3.format('~g')` for numbers, `String` for points. */
  format?: (v: number | string) => string;
  /** Tick count for numeric axes. Default `5`. */
  ticks?: number;
  /** Axis group class. */
  className?: string;
}

export interface PCBrushSelection<TData = any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  /** Active brush per dimension key: a numeric `[lo, hi]` interval, or the categories covered on a point axis. */
  active: Record<string, [number, number] | string[]>;
  /** Records passing every active brush. Equals all drawn records when none is active. */
  selected: TData[];
  /** Indices into `data` of `selected`. */
  indices: number[];
}

export interface PCDatum<TData = any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  data: TData;
  /** Index into `data`. */
  index: number;
  /** Value per dimension key; `null` = missing / invalid. */
  values: Record<string, number | string | null>;
  /** Brush state; `true` when no brush is active. */
  selected: boolean;
}

export interface ParallelCoordinatesChartProps<TData = any> // eslint-disable-line @typescript-eslint/no-explicit-any
  extends ChartProps<TData> {
  data: TData[];
  /** At least 2. Array order is axis order. Strings are shorthand for `{ key }`. */
  dimensions: Array<string | PCDimension<TData>>;
  /** Record identity shown first in the tooltip (e.g. a name). Optional. */
  label?: { key: Extract<keyof TData, string> | string };
  line?: {
    /** Default line class for every record. */
    className?: string;
    /** Default `'linear'`. `'bump'` uses curveBumpX/Y (smooth, still passes through each axis value). */
    curve?: 'linear' | 'bump';
    /**
     * Presentation-attribute `stroke-opacity`. Default `'auto'`:
     * `clamp(50 / n, 0.1, 1)` (opaque up to 50 lines). CSS classes override it.
     */
    opacity?: number | 'auto';
  };
  /** Colour lines by a categorical field. Colour names the category, not a value. */
  color?: {
    key: Extract<keyof TData, string> | string;
    classNameMap?: Record<string, string>;
  };
  /** Default `'gap'`. `'drop'` removes any record missing a value on any dimension. */
  missing?: 'gap' | 'drop';
  /** Default `'vertical'`: vertical axes, laid out left → right. `'horizontal'`: horizontal axes, laid out top → bottom. */
  orientation?: 'vertical' | 'horizontal';
  /** Default `true`: hovering a line highlights it and dims the rest. */
  highlight?: boolean;
  /** Per-axis 1-D brushing. Default `false`. */
  brushing?:
    | boolean
    | {
        /** Fired on brush end and on clear. Not fired while dragging. */
        onChange?: (selection: PCBrushSelection<TData>) => void;
        /** Brush selection rect class. */
        className?: string;
      };
  tooltip?: TooltipConfig;
  title?: string;
  description?: string;
  /** Used when `title` is omitted. Default `"Parallel coordinates chart"`. */
  ariaLabel?: string;
}

type Value = number | string | null;
type Row = Record<string, unknown>;
type TooltipHandlers = Pick<
  ReturnType<typeof useTooltip>,
  'onMouseOver' | 'onMouseMove' | 'onMouseLeave'
>;
/** A persisted brush, in data units, so it survives rescaling. */
type BrushState =
  | { kind: 'numeric'; range: [number, number] }
  | { kind: 'point'; categories: string[] };

interface ResolvedDim {
  key: string;
  label: string;
  type: 'linear' | 'log' | 'point';
  format: (v: number | string) => string;
  ticks: number;
  className?: string;
  /** Pixel position of a present value across the axis. */
  position: (v: number | string) => number;
  /** Data value at a pixel (numeric axes only). */
  invert?: (px: number) => number;
  /** Category → pixel, in domain order (point axes only). */
  categories?: string[];
  axisScale: AxisScale<number | string>;
  /** No present values: the axis is drawn without domain ticks. */
  empty: boolean;
  /** Midpoint of the value range, for the flat draw-in. */
  mid: number;
}

const NAME = 'ParallelCoordinatesChart';
const DEFAULT_STYLE = {};
const DEFAULT_DRAWING = { duration: 0 };
const DEFAULT_TICKS = 5;
const BRUSH_WIDTH = 16;
const HIT_WIDTH = 8;
const ISOLATED_R = 2;
const ISOLATED_HIT_R = 6;
const LABEL_OFFSET = 8;
const EPS = 1e-6;
const defaultNumberFormat = d3Format('~g');

const hasOwn = (o: object | undefined, k: string) =>
  !!o && Object.prototype.hasOwnProperty.call(o, k);

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Strings → `{ key }`; first of each key wins. No warnings here (render-safe). */
const normalizeDimensions = (
  dimensions: ReadonlyArray<string | PCDimension> | undefined
): { dims: PCDimension[]; duplicates: string[] } => {
  const seen = new Set<string>();
  const dims: PCDimension[] = [];
  const duplicates: string[] = [];
  (Array.isArray(dimensions) ? dimensions : []).forEach((d) => {
    const cfg: PCDimension | undefined =
      typeof d === 'string' ? { key: d } : d && typeof d.key === 'string' ? d : undefined;
    if (!cfg) return;
    if (seen.has(cfg.key)) {
      duplicates.push(cfg.key);
      return;
    }
    seen.add(cfg.key);
    dims.push(cfg);
  });
  return { dims, duplicates };
};

const formatterOf = (dim: PCDimension, isPoint: boolean) =>
  dim.format ??
  ((v: number | string) =>
    isPoint || typeof v !== 'number' ? String(v) : defaultNumberFormat(v));

/** Missing: null, undefined, NaN, ±Infinity. Everything else is "present" for inference. */
const isAbsent = (v: unknown) =>
  v === null || v === undefined || (typeof v === 'number' && !Number.isFinite(v));

const inferType = (raw: unknown[]): 'linear' | 'point' =>
  raw.every((v) => isAbsent(v) || typeof v === 'number') ? 'linear' : 'point';

/** Default tooltip: label, then one line per dimension (formatted, or `n/a`). */
const tooltipHtml = (
  d: PCDatum,
  dims: PCDimension[],
  labelKey: string | undefined,
  keys?: string[]
) => {
  const rows: string[] = [];
  const allow = (k: string) => !keys || keys.includes(k);
  if (labelKey && allow(labelKey)) {
    const v = (d.data as Row | undefined)?.[labelKey];
    if (!isAbsent(v)) rows.push(escapeHtml(String(v)));
  }
  dims.forEach((dim) => {
    if (!allow(dim.key)) return;
    const v = d.values[dim.key];
    const text =
      v === null || v === undefined
        ? 'n/a'
        : formatterOf(dim, typeof v === 'string')(v);
    rows.push(`${escapeHtml(dim.label ?? dim.key)}: ${escapeHtml(String(text))}`);
  });
  return rows.join('<br/>');
};

/* catalog:start */
/**
 * One axis per measure, each with its own scale, and one line per record
 * across them, showing clusters, trade-offs and outliers across many measures.
 *
 * @remarks
 *
 * **Use when**
 * - Many records across 3–12 measures with different units
 * - Finding clusters or trade-offs (crossing lines between adjacent axes)
 *   across measures
 * - Filtering records interactively by ranges on several measures
 *   (`brushing`)
 *
 * **Avoid when**
 * - A few entities on one shared scale — use RadarChart
 * - Only two measures — use ScatterPlot
 * - One measure's distribution per group — use BoxPlotV (or ViolinChart once
 *   exported)
 * - Colour is wanted to encode a value — the axes already encode values;
 *   colour names categories only
 * - The audience needs exact values — use a table
 *
 * Also called: parallel coordinates, parallel coordinates plot, parallel coordinates chart, parallel plot.
 *
 * Answers: profile, correlation, distribution. Required props: `id`, `data`, `dimensions`.
 *
 * @example
 * ```tsx
 * <ParallelCoordinatesChart
 *   id="cars"
 *   className="w-full h-96"
 *   data={cars}
 *   label={{ key: 'model' }}
 *   dimensions={[
 *     'mpg',
 *     { key: 'hp', label: 'Horsepower' },
 *     { key: 'weight', format: (v) => `${v} kg` },
 *     { key: 'origin', type: 'point', order: ['US', 'EU', 'JP'] },
 *   ]}
 *   color={{ key: 'origin', classNameMap: { US: 'stroke-slate-600', EU: 'stroke-sky-600', JP: 'stroke-amber-600' } }}
 *   line={{ className: 'stroke-slate-400' }}
 *   brushing={{ onChange: (s) => setSelected(s.indices) }}
 *   tooltip={{ className: 'bg-white text-xs p-2 shadow' }}
 *   title="Cars by economy, power and weight"
 * />
 * ```
 *
 * @see RadarChart — a few entities compared on one shared scale
 * @see ScatterPlot — only two measures are being related
 * @see BoxPlotV — one measure's distribution per group
 */
/* catalog:end */
const ParallelCoordinatesChart = <TData = any,>({ // eslint-disable-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
  data,
  id,
  className,
  dimensions,
  label,
  line,
  color,
  missing = 'gap',
  orientation = 'vertical',
  highlight = true,
  brushing = false,
  padding,
  margin,
  drawing = DEFAULT_DRAWING,
  tooltip,
  title,
  description,
  ariaLabel,
  style = DEFAULT_STYLE,
}: ParallelCoordinatesChartProps<TData>) => {
  const plotRef = useRef<SVGGElement>(null);

  // Tooltip: the default HTML (and a `keys` restriction) needs the current
  // dimensions, so it is built per render; useTooltip reads the latest config.
  const { dims: renderDims } = normalizeDimensions(dimensions);
  const labelKey = label?.key;
  const tooltipConfig: TooltipConfig | undefined =
    tooltip && !tooltip.html && tooltip.keys
      ? {
          ...tooltip,
          keys: undefined,
          html: (d: PCDatum) => tooltipHtml(d, renderDims, labelKey, tooltip.keys),
        }
      : tooltip;
  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip: tooltipConfig,
    defaultHtml: (d: PCDatum) => tooltipHtml(d, renderDims, labelKey),
  });

  // The hook handlers (and brushing.onChange) are new each render but must not
  // be redraw deps, so the d3 listeners call them through refs.
  const tooltipHandlers = useRef<TooltipHandlers | null>(null);
  const onBrushChange = useRef<((s: PCBrushSelection<TData>) => void) | undefined>(
    undefined
  );
  const brushOnChange = typeof brushing === 'object' ? brushing.onChange : undefined;
  useLayoutEffect(() => {
    tooltipHandlers.current = { onMouseOver, onMouseMove, onMouseLeave };
    onBrushChange.current = brushOnChange;
  });

  // Brush state that outlives a redraw: extents in data units per dimension
  // key, and the last selected index set (to fire onChange only on change).
  const brushStates = useRef(new Map<string, BrushState>());
  const lastSelection = useRef<string | null>(null);
  const brushEnabled = !!brushing;
  const brushClassName = typeof brushing === 'object' ? brushing.className : undefined;

  const refreshChart = useCallback(() => {
    if (!plotRef.current) return;
    const svgNode = plotRef.current.ownerSVGElement;
    const root = select(plotRef.current);
    root.selectAll('*').interrupt();
    root.selectAll('*').remove();
    let gesture = false;

    const warn = (suffix: string, message: string) =>
      warnOnceInDev(`${NAME}#${id}:${suffix}`, `${NAME}#${id}: ${message}`);

    const { dims: dimConfigs, duplicates } = normalizeDimensions(dimensions);
    duplicates.forEach((k) =>
      warn(`duplicate:${k}`, `dimension key "${k}" is listed more than once; the first entry is used.`)
    );
    if (dimConfigs.length === 0) {
      warn('no-dimensions', 'no dimensions given; nothing is drawn.');
      brushStates.current.clear();
      lastSelection.current = null;
      return;
    }
    if (dimConfigs.length === 1)
      warn(
        'one-dimension',
        `only one dimension ("${dimConfigs[0].key}"); parallel coordinates need at least 2. For one measure's distribution, use ViolinChart or BoxPlot.`
      );

    const rows: Row[] = Array.isArray(data) ? (data as Row[]) : [];
    if (rows.length === 0) {
      lastSelection.current = null;
      return;
    }

    const vertical = orientation !== 'horizontal';
    const defaultMargin = vertical
      ? { top: 24, right: 32, bottom: 16, left: 32 }
      : { top: 24, right: 16, bottom: 24, left: 16 };
    const m = { ...defaultMargin, ...margin };
    const p = { top: 0, right: 0, bottom: 0, left: 0, ...padding };
    const { width, height } = measureSvg(svgNode);
    const left = m.left + p.left;
    const top = m.top + p.top;
    const right = Math.max(left, width - m.right - p.right);
    const bottom = Math.max(top, height - m.bottom - p.bottom);

    // Cross-axis pixel range of a value: low at the bottom (vertical) or the
    // left (horizontal); `reverse` flips it.
    const valueRange = (reverse?: boolean): [number, number] => {
      const r: [number, number] = vertical ? [bottom, top] : [left, right];
      return reverse ? [r[1], r[0]] : r;
    };

    // ---- Dimensions: type, domain, scale, values per row ----
    const values: Value[][] = rows.map(() => []);
    const dims: ResolvedDim[] = dimConfigs.map((cfg, k) => {
      const key = cfg.key;
      const raw = rows.map((r) => (r == null ? undefined : r[key]));
      if (raw.every((v) => v === undefined))
        warn(`unknown:${key}`, `dimension key "${key}" is absent from every row; its values are treated as missing.`);
      const type = cfg.type ?? inferType(raw);
      const label = cfg.label ?? key;
      const ticks = isFiniteNumber(cfg.ticks) ? cfg.ticks : DEFAULT_TICKS;

      if (type === 'point') {
        const cats: string[] = [];
        const seen = new Set<string>();
        const add = (c: string) => {
          if (!seen.has(c)) {
            seen.add(c);
            cats.push(c);
          }
        };
        (cfg.order ?? []).forEach((c) => add(String(c)));
        raw.forEach((v, i) => {
          const s = isAbsent(v) ? null : String(v);
          values[i][k] = s;
          if (s !== null) add(s);
        });
        // Categories read top → bottom (vertical) or left → right; `reverse` flips.
        const range: [number, number] = vertical ? [top, bottom] : [left, right];
        const scale = scalePoint<string>()
          .domain(cats)
          .range(cfg.reverse ? [range[1], range[0]] : range)
          .padding(0.5);
        return {
          key,
          label,
          type,
          format: formatterOf(cfg, true),
          ticks,
          className: cfg.className,
          position: (v) => scale(String(v)) ?? NaN,
          categories: cats,
          axisScale: scale as unknown as AxisScale<number | string>,
          empty: cats.length === 0,
          mid: (range[0] + range[1]) / 2,
        };
      }

      // Numeric ('linear' | 'log').
      const isLog = type === 'log';
      let nonPositive = false;
      const nums: (number | null)[] = raw.map((v) => {
        if (!isFiniteNumber(v)) return null;
        if (isLog && v <= 0) {
          nonPositive = true;
          return null;
        }
        return v;
      });
      if (nonPositive)
        warn(`log:${key}`, `log axis "${key}" has values ≤ 0; they are treated as missing.`);

      let start: number | undefined = isFiniteNumber(cfg.start) ? cfg.start : undefined;
      let end: number | undefined = isFiniteNumber(cfg.end) ? cfg.end : undefined;
      if (isLog) {
        if (start !== undefined && start <= 0) start = undefined;
        if (end !== undefined && end <= 0) end = undefined;
      }
      if (start !== undefined && end !== undefined && start > end) {
        warn(`pins:${key}`, `dimension "${key}" has start > end; both pins are ignored.`);
        start = end = undefined;
      }

      const present = nums.filter((v): v is number => v !== null);
      const make = () => (isLog ? scaleLog() : scaleLinear());
      const zeroSpread = (v: number): [number, number] =>
        isLog ? [v / 10, v * 10] : [v - 1, v + 1];
      let domain: [number, number];
      let empty = false;
      if (present.length === 0) {
        if (start !== undefined && end !== undefined)
          domain = start === end ? zeroSpread(start) : [start, end];
        else {
          empty = true;
          domain = isLog ? [1, 10] : [0, 1];
        }
      } else {
        const lo = Math.min(...present);
        const hi = Math.max(...present);
        const niced = (
          lo === hi ? zeroSpread(lo) : (make().domain([lo, hi]).nice().domain() as [number, number])
        );
        let dLo = start ?? niced[0];
        let dHi = end ?? niced[1];
        if (dLo > dHi) {
          // A single pin beyond the data's other end: fall back to the data.
          warn(`pins:${key}`, `dimension "${key}" has a pin beyond the data extent; the pin is ignored.`);
          [dLo, dHi] = niced;
        } else if (dLo === dHi) [dLo, dHi] = zeroSpread(dLo);
        domain = [dLo, dHi];
      }

      // Out of a pinned domain → missing (clamping would draw a false value).
      let outOfDomain = false;
      nums.forEach((v, i) => {
        if (v !== null && (v < domain[0] - EPS * Math.abs(domain[0]) || v > domain[1] + EPS * Math.abs(domain[1]))) {
          outOfDomain = true;
          values[i][k] = null;
        } else values[i][k] = v;
      });
      if (outOfDomain)
        warn(`out-of-domain:${key}`, `dimension "${key}" has values outside its pinned domain; they are treated as missing.`);

      const range = valueRange(cfg.reverse);
      const scale = make().domain(domain).range(range);
      return {
        key,
        label,
        type,
        format: formatterOf(cfg, false),
        ticks,
        className: cfg.className,
        position: (v) => scale(v as number),
        invert: (px) => scale.invert(px),
        axisScale: scale as unknown as AxisScale<number | string>,
        empty,
        mid: (range[0] + range[1]) / 2,
      };
    });

    // ---- Records ----
    type Rec = { index: number; vals: Value[] };
    let missingCount = 0;
    const records: Rec[] = [];
    rows.forEach((_, i) => {
      const vals = values[i];
      const presentCount = vals.filter((v) => v !== null).length;
      const anyMissing = presentCount < dims.length;
      if (anyMissing) missingCount++;
      if (presentCount === 0) return;
      if (missing === 'drop' && anyMissing) return;
      records.push({ index: i, vals });
    });
    if (missingCount > 0)
      warn(
        'missing',
        missing === 'drop'
          ? `${missingCount} record(s) have missing or invalid values and were dropped (missing: 'drop').`
          : `${missingCount} record(s) have missing or invalid values; their lines break at those axes (missing: 'gap').`
      );

    const valuesByKey = (r: Rec) =>
      Object.fromEntries(dims.map((d, k) => [d.key, r.vals[k]])) as Record<string, Value>;

    // ---- Layout ----
    const dimPos = scalePoint<string>()
      .domain(dims.map((d) => d.key))
      .range(vertical ? [left, right] : [top, bottom])
      .padding(0);
    const along = (k: number) => dimPos(dims[k].key) ?? 0;
    const across = (k: number, v: Value) => (v === null ? NaN : dims[k].position(v));
    const xy = (k: number, c: number): [number, number] =>
      vertical ? [along(k), c] : [c, along(k)];

    const curve =
      line?.curve === 'bump' ? (vertical ? curveBumpX : curveBumpY) : curveLinear;
    const pathFor = (flat: boolean) =>
      d3Line<Value>()
        .defined((v) => v !== null)
        .x((v, k) => xy(k, flat ? dims[k].mid : across(k, v))[0])
        .y((v, k) => xy(k, flat ? dims[k].mid : across(k, v))[1])
        .curve(curve);
    const realPath = pathFor(false);
    const flatPath = pathFor(true);

    const n = records.length;
    const opacity =
      typeof line?.opacity === 'number' && Number.isFinite(line.opacity)
        ? line.opacity
        : Math.min(1, Math.max(0.1, 50 / Math.max(1, n)));

    const lineClass = (r: Rec) => {
      const row = rows[r.index];
      const cat = color ? String(row?.[color.key]) : undefined;
      const mapped =
        color && cat !== undefined && hasOwn(color.classNameMap, cat)
          ? color.classNameMap![cat]
          : line?.className;
      return twMerge('stroke-current', mapped || '');
    };

    // Present values whose neighbours on both sides are missing (or absent).
    type Iso = { rec: Rec; k: number };
    const isolated: Iso[] = records.flatMap((rec) =>
      rec.vals.flatMap((v, k) =>
        v !== null &&
        (k === 0 || rec.vals[k - 1] === null) &&
        (k === dims.length - 1 || rec.vals[k + 1] === null)
          ? [{ rec, k }]
          : []
      )
    );

    const duration = drawing?.duration ?? 0;
    const delay = drawing?.delay ?? 0;

    // ---- Painted lines ----
    const lines = root
      .append('g')
      .attr('class', 'pc-lines')
      .attr('pointer-events', 'none')
      .selectAll<SVGPathElement, Rec>('path')
      .data(records)
      .enter()
      .append('path')
      .attr('data-testid', 'pc-line')
      .attr('data-index', (r) => r.index)
      .attr('class', lineClass)
      .attr('fill', 'none')
      .attr('stroke-opacity', opacity)
      .attr('d', (r) => (duration ? flatPath(r.vals) : realPath(r.vals)));
    if (duration)
      lines
        .transition()
        .duration(duration)
        .delay(delay)
        .attr('d', (r) => realPath(r.vals));

    const dots = root
      .append('g')
      .attr('class', 'pc-isolated')
      .attr('pointer-events', 'none')
      .selectAll<SVGCircleElement, Iso>('circle')
      .data(isolated)
      .enter()
      .append('circle')
      .attr('data-testid', 'pc-isolated')
      .attr('data-index', (d) => d.rec.index)
      .attr('data-key', (d) => dims[d.k].key)
      .attr('class', (d) => lineClass(d.rec))
      .attr('fill', 'none')
      .attr('stroke-opacity', opacity)
      .attr('r', ISOLATED_R)
      .attr('cx', (d) => xy(d.k, duration ? dims[d.k].mid : across(d.k, d.rec.vals[d.k]))[0])
      .attr('cy', (d) => xy(d.k, duration ? dims[d.k].mid : across(d.k, d.rec.vals[d.k]))[1]);
    if (duration)
      dots
        .transition()
        .duration(duration)
        .delay(delay)
        .attr('cx', (d) => xy(d.k, across(d.k, d.rec.vals[d.k]))[0])
        .attr('cy', (d) => xy(d.k, across(d.k, d.rec.vals[d.k]))[1]);

    // ---- Axes ----
    const axes = root.append('g').attr('class', 'pc-axes');
    dims.forEach((dim, k) => {
      const g = axes
        .append('g')
        .attr('data-testid', 'pc-axis')
        .attr('data-key', dim.key)
        .attr('class', dim.className ?? null)
        .attr('transform', vertical ? `translate(${along(k)},0)` : `translate(0,${along(k)})`);
      const axis = (vertical ? axisLeft : axisBottom)(dim.axisScale).tickFormat((v) =>
        dim.format(v)
      );
      if (dim.empty) axis.tickValues([]);
      else if (dim.type !== 'point') axis.ticks(dim.ticks);
      g.call(axis);
      g.append('text')
        .attr('data-testid', 'pc-axis-label')
        .attr('class', 'fill-current')
        .attr('x', vertical ? 0 : left)
        .attr('y', vertical ? top - LABEL_OFFSET : -LABEL_OFFSET)
        .attr('text-anchor', vertical ? 'middle' : 'start')
        .text(dim.label);
    });

    // ---- Highlight overlay (above lines and axes; never hit-tested) ----
    const overlay = root
      .append('g')
      .attr('class', 'pc-highlight')
      .attr('pointer-events', 'none');
    const clearHighlight = () => {
      lines.attr('data-highlighted', null).attr('data-dimmed', null);
      dots.attr('data-highlighted', null).attr('data-dimmed', null);
      overlay.selectAll('*').remove();
    };
    const highlightRecord = (rec: Rec) => {
      if (!highlight) return;
      clearHighlight();
      const on = (r: Rec) => (r.index === rec.index ? 'true' : null);
      const off = (r: Rec) => (r.index === rec.index ? null : 'true');
      lines.attr('data-highlighted', on).attr('data-dimmed', off);
      dots
        .attr('data-highlighted', (d) => on(d.rec))
        .attr('data-dimmed', (d) => off(d.rec));
      overlay
        .append('path')
        .attr('data-testid', 'pc-line-highlight')
        .attr('data-index', rec.index)
        .attr('class', lineClass(rec))
        .attr('fill', 'none')
        .attr('stroke-opacity', 1)
        .attr('d', realPath(rec.vals));
      isolated
        .filter((d) => d.rec.index === rec.index)
        .forEach((d) => {
          const [cx, cy] = xy(d.k, across(d.k, d.rec.vals[d.k]));
          overlay
            .append('circle')
            .attr('data-testid', 'pc-isolated-highlight')
            .attr('class', lineClass(rec))
            .attr('fill', 'none')
            .attr('stroke-opacity', 1)
            .attr('r', ISOLATED_R)
            .attr('cx', cx)
            .attr('cy', cy);
        });
    };

    // ---- Brush selection state ----
    const spans = new Map<string, [number, number]>(); // pixel spans per key
    let selected = new Set(records.map((r) => r.index));
    const inSpan = (px: number, s: [number, number]) =>
      Number.isFinite(px) && px >= s[0] - EPS && px <= s[1] + EPS;
    const computeSelected = () => {
      const active = dims
        .map((d, k) => ({ k, span: spans.get(d.key) }))
        .filter((a): a is { k: number; span: [number, number] } => !!a.span);
      return new Set(
        records
          .filter((r) => active.every(({ k, span }) => inSpan(across(k, r.vals[k]), span)))
          .map((r) => r.index)
      );
    };
    const applyFilter = () => {
      selected = computeSelected();
      if (!brushEnabled) return;
      const filtered = (index: number) => (selected.has(index) ? null : 'true');
      lines.attr('data-filtered', (r) => filtered(r.index));
      dots.attr('data-filtered', (d) => filtered(d.rec.index));
    };
    const selectionKey = () => [...selected].sort((a, b) => a - b).join(',');
    const emit = () => {
      const active: PCBrushSelection['active'] = {};
      dims.forEach((d) => {
        const st = brushStates.current.get(d.key);
        if (!st || !spans.has(d.key)) return;
        active[d.key] = st.kind === 'numeric' ? [...st.range] : [...st.categories];
      });
      const indices = records.filter((r) => selected.has(r.index)).map((r) => r.index);
      lastSelection.current = selectionKey();
      onBrushChange.current?.({
        active,
        selected: indices.map((i) => data[i]),
        indices,
      });
    };

    // ---- Hit areas: the only elements with mouse handlers ----
    const datum = (rec: Rec): PCDatum<TData> => ({
      data: data[rec.index],
      index: rec.index,
      values: valuesByKey(rec),
      selected: selected.has(rec.index),
    });
    const enter = (event: MouseEvent, rec: Rec) => {
      if (gesture) return;
      highlightRecord(rec);
      tooltipHandlers.current?.onMouseOver(event, datum(rec));
    };
    const move = (event: MouseEvent) => {
      if (gesture) return;
      tooltipHandlers.current?.onMouseMove(event);
    };
    const leave = () => {
      clearHighlight();
      tooltipHandlers.current?.onMouseLeave();
    };
    const hits = root.append('g').attr('class', 'pc-hit-areas');
    hits
      .selectAll<SVGPathElement, Rec>('path')
      .data(records)
      .enter()
      .append('path')
      .attr('data-testid', 'pc-line-hit')
      .attr('data-index', (r) => r.index)
      .attr('d', (r) => realPath(r.vals))
      .attr('fill', 'none')
      .attr('stroke', 'transparent')
      .attr('stroke-width', HIT_WIDTH)
      .attr('pointer-events', 'stroke')
      .on('mouseenter', (event, r) => enter(event, r))
      .on('mousemove', (event) => move(event))
      .on('mouseleave', leave);
    hits
      .selectAll<SVGCircleElement, Iso>('circle')
      .data(isolated)
      .enter()
      .append('circle')
      .attr('data-testid', 'pc-isolated-hit')
      .attr('data-index', (d) => d.rec.index)
      .attr('r', ISOLATED_HIT_R)
      .attr('cx', (d) => xy(d.k, across(d.k, d.rec.vals[d.k]))[0])
      .attr('cy', (d) => xy(d.k, across(d.k, d.rec.vals[d.k]))[1])
      .attr('fill', 'transparent')
      .attr('pointer-events', 'all')
      .on('mouseenter', (event, d) => enter(event, d.rec))
      .on('mousemove', (event) => move(event))
      .on('mouseleave', leave);

    // ---- Brushing ----
    if (!brushEnabled) {
      brushStates.current.clear();
      lastSelection.current = null;
      return;
    }
    // Forget brushes on dimensions that are gone or changed kind.
    const kindOf = (d: ResolvedDim) => (d.type === 'point' ? 'point' : 'numeric');
    [...brushStates.current.keys()].forEach((key) => {
      const d = dims.find((x) => x.key === key);
      if (!d || d.empty || kindOf(d) !== brushStates.current.get(key)!.kind)
        brushStates.current.delete(key);
    });

    const persist = (d: ResolvedDim, span: [number, number] | undefined) => {
      if (!span) {
        brushStates.current.delete(d.key);
        return;
      }
      if (d.type === 'point')
        brushStates.current.set(d.key, {
          kind: 'point',
          categories: (d.categories ?? []).filter((c) => inSpan(d.position(c), span)),
        });
      else {
        const a = d.invert!(span[0]);
        const b = d.invert!(span[1]);
        brushStates.current.set(d.key, { kind: 'numeric', range: a <= b ? [a, b] : [b, a] });
      }
    };
    /** Pixel span of a persisted brush on the current scales. */
    const restoreSpan = (d: ResolvedDim, st: BrushState): [number, number] | undefined => {
      if (st.kind === 'numeric') {
        const a = d.position(st.range[0]);
        const b = d.position(st.range[1]);
        const s: [number, number] = a <= b ? [a, b] : [b, a];
        return Number.isFinite(s[0]) && Number.isFinite(s[1]) && s[1] > s[0] ? s : undefined;
      }
      const px = st.categories
        .filter((c) => d.categories?.includes(c))
        .map((c) => d.position(c))
        .filter(Number.isFinite);
      if (px.length === 0) return undefined;
      const scale = d.axisScale as unknown as { step: () => number };
      const pad = Math.max(1, scale.step() / 4);
      return [Math.min(...px) - pad, Math.max(...px) + pad];
    };

    const brushLayer = root.append('g').attr('class', 'pc-brushes');
    dims.forEach((d, k) => {
      if (d.empty) return;
      const pos = along(k);
      const half = BRUSH_WIDTH / 2;
      const behaviour = (vertical ? brushY() : brushX()).extent(
        vertical
          ? [
              [pos - half, top],
              [pos + half, bottom],
            ]
          : [
              [left, pos - half],
              [right, pos + half],
            ]
      );
      const toSpan = (sel: D3BrushEvent<unknown>['selection']) => {
        if (!sel) return undefined;
        const [a, b] = sel as [number, number];
        return (a <= b ? [a, b] : [b, a]) as [number, number];
      };
      const setSpan = (span: [number, number] | undefined) => {
        if (span) spans.set(d.key, span);
        else spans.delete(d.key);
      };
      behaviour
        // Programmatic moves (restoring a brush) have no sourceEvent.
        .on('start', (event: D3BrushEvent<unknown>) => {
          if (!event.sourceEvent) return;
          gesture = true;
          leave();
        })
        .on('brush', (event: D3BrushEvent<unknown>) => {
          if (!event.sourceEvent) return;
          setSpan(toSpan(event.selection));
          applyFilter();
        })
        .on('end', (event: D3BrushEvent<unknown>) => {
          if (!event.sourceEvent) return;
          gesture = false;
          const span = toSpan(event.selection);
          setSpan(span);
          persist(d, span);
          applyFilter();
          emit();
        });
      const g = brushLayer
        .append('g')
        .attr('data-testid', 'pc-brush')
        .attr('data-key', d.key)
        .call(behaviour);
      g.select('.selection').attr('class', twMerge('selection', brushClassName));
      const st = brushStates.current.get(d.key);
      const span = st ? restoreSpan(d, st) : undefined;
      if (st && !span) brushStates.current.delete(d.key);
      if (span) {
        spans.set(d.key, span);
        g.call(behaviour.move, span);
      }
    });
    applyFilter();
    // After a redraw, fire only if the selected set actually changed.
    const key = selectionKey();
    if (lastSelection.current !== null && lastSelection.current !== key) emit();
    lastSelection.current = key;
  }, [
    data,
    id,
    dimensions,
    line,
    color,
    missing,
    orientation,
    highlight,
    brushEnabled,
    brushClassName,
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
      aria-label={title ? undefined : ariaLabel ?? 'Parallel coordinates chart'}
      data-testid='parallel-coordinates-chart'
    >
      {title ? <title id={titleId}>{title}</title> : null}
      {description ? <desc id={descId}>{description}</desc> : null}
      <g ref={plotRef} className='pc-plot' />
    </svg>
  );
};

export default ParallelCoordinatesChart;

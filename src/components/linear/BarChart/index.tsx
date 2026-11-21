import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type CSSProperties,
} from 'react';
import { max, min } from 'd3-array';
import { format as d3format } from 'd3-format';
import {
  scaleBand,
  scaleLinear,
  type ScaleBand,
  type ScaleTime,
} from 'd3-scale';
import { select } from 'd3-selection';
import 'd3-transition';
import { twMerge } from 'tailwind-merge';

import { drawAxis } from '@/hooks/useAxis';
import useChartSize from '@/hooks/useChartSize';
import useTooltip, { type UseTooltipResult } from '@/hooks/useTooltip';
import type {
  AxisConfig,
  ChartOrientation,
  ChartProps,
  TooltipConfig,
} from '@/types';
import { defaultChartClassNames, bin1D } from '@/utils';
import { clampToDomain, isFiniteNumber, pinnedEnd, pinnedStart } from '@/utils/domain';
import { warnOnceInDev } from '@/utils/devEnvironment';
import { interruptTransitions } from '@/utils/interruptTransitions';
import {
  orientationMessages,
  resolveOrientation,
  type OrientationEvidence,
  warnOrientation,
  warnOrientationResolution,
} from '@/utils/orientation';
import {
  createTimeBarLayout,
  makeDateAccessor,
  makeDateFormatter,
  timePosition,
  useTimeAxisWarnings,
  warnIfBarWidthCapped,
} from '@/utils/timeScale';

/** A value series: one bar (or segment) per row. */
export interface BarSeriesConfig<TData = any> extends AxisConfig<TData> {
  /** Corner radius in px. Default 0. */
  rx?: number;
}

/** The category axis. */
export interface BarCategoryConfig<TData = any> extends AxisConfig<TData> {
  /** Px removed from each bar's thickness (BarChart's `y.padding` today). Default 0. */
  padding?: number;
}

/** @deprecated Use {@link BarSeriesConfig}. */
export type BarAxisConfig<TData = any> = BarSeriesConfig<TData>;

/** A line across the plot at a value. Use `y` in vertical and `x` in horizontal. */
export interface BarReferenceLine {
  x?: number;
  y?: number;
  className?: string;
}

export type BarStacking =
  | { type: 'normal' }
  | { type: '100%' }
  | { type: 'diverging'; negative: string[]; neutral?: string; percent?: boolean };

export interface BarDataLabel<TData = any> {
  className?: string;
  /** Label text. Default: the value (the share for '100%' stacking). */
  text?: (row: TData, series: BarSeriesConfig<TData>) => string;
}

interface BarChartBaseProps<TData> extends ChartProps<TData> {
  data: TData[];
  /**
   * Omitted = grouped. `'normal'` stacks from 0 in series order (negatives
   * stack the other way), `'100%'` normalises each row to its total, and
   * `'diverging'` puts the `negative` series on the negative side of 0.
   */
  stacking?: BarStacking;
  /** Each series becomes a step of a running total. Wins over `stacking`. */
  waterfall?: boolean | { padding?: number };
  /** Horizontal only: bars grow to the right (default) or to the left. */
  direction?: 'left' | 'right';
  referenceLines?: BarReferenceLine[];
  dataLabel?: BarDataLabel<TData>;
  /** d3-format specifier for value-axis ticks. */
  tickFormat?: string;
  /** Integer value-axis ticks. */
  wholeNumbers?: boolean;
  /** @deprecated Use `padding.bar`. Read only when `padding.bar` is not set. */
  paddingBar?: number;
  tooltip?: TooltipConfig;
}

/** Vertical (default): categories on x, series on y. */
export interface BarChartVerticalProps<TData = any> extends BarChartBaseProps<TData> {
  orientation?: 'vertical';
  x: BarCategoryConfig<TData>;
  y: BarSeriesConfig<TData>[];
}

/** Horizontal: categories on y, series on x. */
export interface BarChartHorizontalProps<TData = any> extends BarChartBaseProps<TData> {
  orientation?: 'horizontal';
  y: BarCategoryConfig<TData>;
  x: BarSeriesConfig<TData>[];
}

export type BarChartProps<TData = any> =
  | BarChartVerticalProps<TData>
  | BarChartHorizontalProps<TData>;

/**
 * @deprecated Use {@link BarChartVerticalProps}. Will be removed in 0.4.0.
 */
export type ColumnChartProps<TData = any> = BarChartVerticalProps<TData>;
/** @deprecated Use {@link BarChartVerticalProps}. Will be removed in 0.4.0. */
export type ColumnChartGroupedProps<TData = any> = ColumnChartProps<TData>;

/** Wrapper props: `stacking` defaults to `{ type: 'normal' }`. */
export type BarChartStackedProps<TData = any> = BarChartHorizontalProps<TData>;
export type ColumnChartStackedProps<TData = any> = BarChartVerticalProps<TData>;

export type BarChartName =
  | 'BarChart'
  | 'ColumnChart'
  | 'BarChartStacked'
  | 'ColumnChartStacked';

/** Set by the public component or a wrapper; not part of the public props. */
export interface BarRendererProps {
  /** The component the caller rendered, for warnings */
  chartName: BarChartName;
  /** Orientation a wrapper pins */
  pinned?: ChartOrientation;
  /** A wrapper's default margin (BarChartStacked) */
  defaultMargin?: NonNullable<ChartProps['margin']>;
  /** A wrapper's default band padding (BarChartStacked: 0.3) */
  defaultBandPadding?: number;
}

type Layout = 'grouped' | 'normal' | '100%' | 'diverging' | 'waterfall';
/** One drawn segment: value-axis extent [lo, hi] in domain units. */
interface Segment {
  lo: number;
  hi: number;
  /** The row's raw value (NaN when missing) */
  value: number;
  /** Share of the row ('100%' and diverging `percent`) */
  share?: number;
}
const PERCENT = d3format('.0%');

type Row = Record<string, unknown>;
type TooltipHandlers = Pick<
  UseTooltipResult,
  'onMouseOver' | 'onMouseMove' | 'onMouseLeave'
>;

const VERTICAL_MARGIN = { top: 40, bottom: 40, left: 40, right: 40 };
const DEFAULT_PADDING: NonNullable<ChartProps['padding']> = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_DRAWING: NonNullable<ChartProps['drawing']> = { duration: 0 };
const DEFAULT_STYLE: CSSProperties = {};
const DEFAULT_REFERENCE_LINES: BarReferenceLine[] = [];
const EMPTY_DATA: never[] = [];
const NO_TIME_AXIS: AxisConfig = { key: '' };
const COUNT_KEY = 'count';

const num = (d: Row, key: string): number => {
  const v = d[key];
  // null/'' would coerce to 0; treat them as missing so the non-finite rule applies.
  return v == null || v === '' ? Number.NaN : Number(v);
};

const isSeriesArray = (value: unknown): value is BarSeriesConfig[] =>
  Array.isArray(value);

const barEvidence = (x: unknown, y: unknown): OrientationEvidence | null => {
  const xArr = isSeriesArray(x);
  const yArr = isSeriesArray(y);
  if (xArr && !yArr) return { orientation: 'horizontal', clause: 'the series array is on x' };
  if (yArr && !xArr) return { orientation: 'vertical', clause: 'the series array is on y' };
  return null;
};

const horizontalMargin = (
  series: BarSeriesConfig[] | undefined,
  direction: 'left' | 'right',
) => ({
  top: series?.some((column) => column.axis?.location === 'top') ? 60 : 40,
  bottom: series?.some((column) => column.axis?.location === 'bottom') ? 60 : 40,
  left: 60,
  right: direction === 'right' ? 20 : 40,
});

/**
 * Segments per series (outer) and row (inner) for a stacked or waterfall
 * layout. Missing values (NaN) give zero-length segments.
 */
const stackSegments = (
  layout: Exclude<Layout, 'grouped'>,
  rows: Row[],
  keys: string[],
  diverging: { negative: Set<string>; neutral?: string; percent: boolean },
): Segment[][] => {
  const out: Segment[][] = keys.map(() => []);
  rows.forEach((row) => {
    const values = keys.map((key) => num(row, key));
    if (layout === 'waterfall') {
      let cum = 0;
      values.forEach((v, i) => {
        const prev = cum;
        if (Number.isFinite(v)) cum += v;
        out[i].push({ lo: Math.min(prev, cum), hi: Math.max(prev, cum), value: v });
      });
    } else if (layout === 'normal') {
      let pos = 0;
      let neg = 0;
      values.forEach((v, i) => {
        if (!Number.isFinite(v)) {
          out[i].push({ lo: pos, hi: pos, value: v });
        } else if (v >= 0) {
          out[i].push({ lo: pos, hi: pos + v, value: v });
          pos += v;
        } else {
          out[i].push({ lo: neg + v, hi: neg, value: v });
          neg += v;
        }
      });
    } else if (layout === '100%') {
      const parts = values.map((v) => (Number.isFinite(v) ? Math.max(0, v) : 0));
      const total = parts.reduce((a, b) => a + b, 0);
      let cum = 0;
      parts.forEach((part, i) => {
        const share = total > 0 ? part / total : 0;
        out[i].push({ lo: cum, hi: cum + share, value: values[i], share });
        cum += share;
      });
    } else {
      const parts = values.map((v) => (Number.isFinite(v) ? Math.abs(v) : 0));
      const total = parts.reduce((a, b) => a + b, 0);
      const scale = diverging.percent ? (total > 0 ? 1 / total : 0) : 1;
      const neutralIndex = diverging.neutral ? keys.indexOf(diverging.neutral) : -1;
      const half = neutralIndex >= 0 ? (parts[neutralIndex] * scale) / 2 : 0;
      const segs: Segment[] = keys.map(() => ({ lo: 0, hi: 0, value: Number.NaN }));
      let negCur = -half;
      // The last `negative` key touches 0, so walk them from the end outward.
      for (let i = keys.length - 1; i >= 0; i -= 1) {
        if (!diverging.negative.has(keys[i]) || i === neutralIndex) continue;
        const len = parts[i] * scale;
        segs[i] = { lo: negCur - len, hi: negCur, value: values[i] };
        negCur -= len;
      }
      let posCur = half;
      keys.forEach((key, i) => {
        if (i === neutralIndex) {
          segs[i] = { lo: -half, hi: half, value: values[i] };
          return;
        }
        if (diverging.negative.has(key)) return;
        const len = parts[i] * scale;
        segs[i] = { lo: posCur, hi: posCur + len, value: values[i] };
        posCur += len;
      });
      segs.forEach((seg, i) => {
        if (diverging.percent) seg.share = parts[i] * scale;
        out[i].push(seg);
      });
    }
  });
  return out;
};

const resolveBandPadding = (
  paddingBarProp: number | undefined,
  paddingBarKey: number | undefined,
  fallback: number,
): number => {
  if (isFiniteNumber(paddingBarKey)) return paddingBarKey;
  if (isFiniteNumber(paddingBarProp)) return paddingBarProp;
  return fallback;
};


/**
 * The shared renderer behind `BarChart` and `ColumnChart`.
 * @internal Use one of the exported components.
 */
export const BarRenderer = <TData,>(
  props: BarChartProps<TData> & BarRendererProps,
) => {
  const {
    chartName,
    pinned,
    defaultMargin,
    defaultBandPadding,
    stacking: stackingProp,
    waterfall: waterfallProp,
    className,
    data: dataProp,
    id,
    direction: givenDirection,
    referenceLines = DEFAULT_REFERENCE_LINES,
    dataLabel,
    tickFormat,
    wholeNumbers = false,
    paddingBar,
    tooltip,
    drawing = DEFAULT_DRAWING,
    style = DEFAULT_STYLE,
    orientation: givenOrientation,
  } = props;
  const data = (dataProp ?? EMPTY_DATA) as TData[];
  const svgRef = useRef<SVGSVGElement>(null);
  // Redraws when the svg's rendered size changes, including container-driven
  // resizes (#53). null until measured, so the first draw is at the real size.
  const size = useChartSize(svgRef);
  const measured = size !== null;
  const width = size?.width ?? 0;
  const height = size?.height ?? 0;

  const evidence = barEvidence(props.x, props.y);
  const resolution = resolveOrientation({
    pinned,
    given: givenOrientation,
    evidence,
  });
  const orientation = resolution.orientation;
  const isVertical = orientation === 'vertical';
  const mismatch = resolution.mismatch;
  const direction: 'left' | 'right' =
    isVertical ? 'right' : givenDirection === 'left' ? 'left' : 'right';

  const series = (isVertical ? props.y : props.x) as BarSeriesConfig<TData>[] | undefined;
  const category = (isVertical ? props.x : props.y) as BarCategoryConfig<TData> | undefined;

  const padding = props.padding ?? DEFAULT_PADDING;
  const margin = useMemo(
    () =>
      props.margin
      ?? defaultMargin
      ?? (isVertical ? VERTICAL_MARGIN : horizontalMargin(series, direction)),
    [props.margin, defaultMargin, isVertical, series, direction],
  );
  const bandPadding = resolveBandPadding(
    paddingBar,
    padding.bar,
    defaultBandPadding ?? (isVertical ? 0.2 : 0.1),
  );

  const valueAxis = isVertical ? 'y' : 'x';
  const categoryAxis = isVertical ? 'x' : 'y';
  const otherAxis = isVertical ? 'x' : 'y';

  const categoryBin = category?.bin;
  const legacySeriesBin =
    !isVertical && isSeriesArray(props.x) ? props.x[0]?.bin : undefined;
  const timeRequested = category?.scalingFunction === 'time';
  const isTime = isVertical && timeRequested;
  const binConfig = isTime ? undefined : (categoryBin ?? legacySeriesBin);
  const isBinned = binConfig != null;

  // Inline `stacking={{ … }}` objects are new every render; key them by value.
  const stackingKey = stackingProp ? JSON.stringify(stackingProp) : '';
  const stacking = useMemo<BarStacking | undefined>(
    () => (stackingKey ? (JSON.parse(stackingKey) as BarStacking) : undefined),
    [stackingKey],
  );
  const waterfallOn = !!waterfallProp;
  const waterfallPadding =
    typeof waterfallProp === 'object' && isFiniteNumber(waterfallProp.padding)
      ? waterfallProp.padding
      : 0;
  const requestedLayout: Layout = waterfallOn
    ? 'waterfall'
    : stacking?.type ?? 'grouped';
  const layout: Layout = isBinned ? 'grouped' : requestedLayout;
  const seriesKeyList = isSeriesArray(series) ? series.map((column) => column.key) : [];
  const seriesKeysJoined = seriesKeyList.join('\u0000');
  const diverging = useMemo(() => {
    const keys = seriesKeysJoined ? seriesKeysJoined.split('\u0000') : [];
    const spec = stacking?.type === 'diverging' ? stacking : undefined;
    const neutral = spec?.neutral && keys.includes(spec.neutral) ? spec.neutral : undefined;
    const negative = new Set(
      (spec?.negative ?? []).filter((key) => keys.includes(key) && key !== neutral),
    );
    return { negative, neutral, percent: !!spec?.percent };
  }, [stacking, seriesKeysJoined]);

  useEffect(() => {
    warnOrientationResolution(chartName, 'BarChart', id, resolution);
    if (!isVertical && timeRequested) {
      warnOrientation(
        chartName,
        id,
        'time-ignored',
        orientationMessages.timeIgnored(),
      );
    }
    if (isVertical && givenDirection) {
      warnOnceInDev(
        `${chartName}#${id}:direction-ignored`,
        `[headless-charts] ${chartName}#${id}: direction is only read when orientation is "horizontal".`,
      );
    }
    if (isBinned && requestedLayout !== 'grouped') {
      warnOnceInDev(
        `${chartName}#${id}:bin-layout`,
        `[headless-charts] ${chartName}#${id}: bin draws one count series; stacking/waterfall are ignored.`,
      );
    }
    if (waterfallOn && stacking) {
      warnOnceInDev(
        `${chartName}#${id}:waterfall-stacking`,
        `[headless-charts] ${chartName}#${id}: waterfall and stacking are both set; waterfall wins and stacking is ignored.`,
      );
    }
    if (stacking?.type === 'diverging' && !isBinned && !waterfallOn) {
      const keys = seriesKeysJoined ? seriesKeysJoined.split('\u0000') : [];
      const unknown = [
        ...(stacking.negative ?? []),
        ...(stacking.neutral ? [stacking.neutral] : []),
      ].filter((key) => !keys.includes(key));
      if (unknown.length) {
        warnOnceInDev(
          `${chartName}#${id}:diverging-unknown`,
          `[headless-charts] ${chartName}#${id}: stacking keys ${unknown.map((k) => `"${k}"`).join(', ')} are not series keys and are ignored.`,
        );
      }
      if (stacking.neutral && stacking.negative?.includes(stacking.neutral)) {
        warnOnceInDev(
          `${chartName}#${id}:diverging-neutral`,
          `[headless-charts] ${chartName}#${id}: stacking.neutral "${stacking.neutral}" is also in stacking.negative; it is treated as neutral.`,
        );
      }
    }
    if (!isVertical && categoryBin && legacySeriesBin) {
      warnOnceInDev(
        `${chartName}#${id}:bin-both`,
        `[headless-charts] ${chartName}#${id}: bin is set on both y and x[0]; x[0].bin is ignored.`,
      );
    }
  }, [
    chartName,
    id,
    resolution,
    isVertical,
    timeRequested,
    givenDirection,
    categoryBin,
    legacySeriesBin,
    isBinned,
    requestedLayout,
    waterfallOn,
    stacking,
    seriesKeysJoined,
  ]);

  const categoryKey = category?.key ?? '';
  const timeAxis = (isVertical ? props.x : undefined) as AxisConfig<TData> | undefined;
  const xKey = timeAxis?.key;
  const xTimeFormat = timeAxis?.time?.format;
  const xTimeIsISO = timeAxis?.time?.isISO;
  const xTimeUtc = timeAxis?.time?.utc;
  const toDateTime = useMemo(
    () =>
      makeDateAccessor<Row>({
        key: xKey ?? '',
        time: { format: xTimeFormat, isISO: xTimeIsISO, utc: xTimeUtc },
      }),
    [xKey, xTimeFormat, xTimeIsISO, xTimeUtc],
  );
  const formatDate = makeDateFormatter(timeAxis ?? NO_TIME_AXIS);
  useTimeAxisWarnings(chartName, id, data, isTime && timeAxis ? timeAxis : NO_TIME_AXIS);

  const seriesKeys = seriesKeyList;
  const shareLayout = layout === '100%' || (layout === 'diverging' && diverging.percent);

  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: (d: Row) => {
      const row = d ?? {};
      const date = isTime ? toDateTime(row) : null;
      const categoryValue = date
        ? formatDate(date)
        : String(row[categoryKey] ?? '');
      const keys = isBinned ? [COUNT_KEY] : seriesKeys;
      const shares = shareLayout
        ? stackSegments(layout as Exclude<Layout, 'grouped'>, [row], keys, diverging)
        : null;
      return `${categoryValue} <br/> ${keys
        .map((key, i) => {
          const share = shares?.[i][0]?.share;
          return `${key}: ${row[key]}${share === undefined ? '' : ` (${PERCENT(share)})`}`;
        })
        .join('<br/>')}`;
    },
  });

  const tooltipHandlers = useRef<TooltipHandlers | null>(null);
  useLayoutEffect(() => {
    tooltipHandlers.current = { onMouseOver, onMouseMove, onMouseLeave };
  });

  const refreshChart = useCallback(() => {
    const svgNode = svgRef.current;
    if (!svgNode) return;
    const svg = select(svgNode);
    interruptTransitions(svgNode);
    svg.selectAll('*').remove();
    if (mismatch) return;

    const m = {
      top: margin.top ?? 0,
      right: margin.right ?? 0,
      bottom: margin.bottom ?? 0,
      left: margin.left ?? 0,
    };
    const p = {
      top: padding.top ?? 0,
      right: padding.right ?? 0,
      bottom: padding.bottom ?? 0,
      left: padding.left ?? 0,
    };
    const plotLeft = m.left + p.left;
    const plotRight = width - m.right - p.right;
    const plotTop = m.top + p.top;
    const plotBottom = height - m.bottom - p.bottom;
    const horizontalRange: [number, number] =
      !isVertical && direction === 'left'
        ? [plotRight, plotLeft]
        : [plotLeft, plotRight];
    const verticalValueRange: [number, number] = [plotBottom, plotTop];
    const verticalCategoryRange: [number, number] = [plotTop, plotBottom];

    const rawCategory = category ?? { key: categoryKey };
    const rawSeries = isSeriesArray(series) ? series : [];

    let effectiveData: Row[];
    let effectiveSeries: BarSeriesConfig[];
    let effectiveCategory: BarCategoryConfig;
    let binSource: BarSeriesConfig | BarCategoryConfig | undefined;

    if (isBinned && binConfig) {
      binSource = isVertical
        ? rawCategory
        : categoryBin
          ? rawCategory
          : isSeriesArray(props.x)
            ? props.x[0]
            : rawCategory;
      const binAxis = { ...binSource, bin: binConfig };
      const bins = bin1D(data as Row[], binAxis);
      const labelKey = rawCategory.key || binSource.key || '_binLabel';
      effectiveData = bins.map((b) => ({ [labelKey]: b.label, [COUNT_KEY]: b.count }));
      effectiveCategory = { ...rawCategory, key: labelKey, bin: undefined };
      const styleSource = rawSeries[0] ?? binSource;
      effectiveSeries = [
        {
          key: COUNT_KEY,
          className: styleSource?.className,
          rx: (styleSource as BarSeriesConfig | undefined)?.rx,
        },
      ];
    } else {
      effectiveData = isTime
        ? (data as Row[]).filter((d) => toDateTime(d) != null)
        : (data as Row[]);
      effectiveCategory = rawCategory;
      effectiveSeries = rawSeries;
    }

    const g = svg.append('g');
    const clipId = `${id}-plot-clip`;
    svg
      .append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('x', plotLeft)
      .attr('y', plotTop)
      .attr('width', Math.max(0, plotRight - plotLeft))
      .attr('height', Math.max(0, plotBottom - plotTop));

    const categoryRange = isVertical ? horizontalRange : verticalCategoryRange;
    const valueRange = isVertical ? verticalValueRange : horizontalRange;

    let categoryScale: ScaleBand<string> | ScaleTime<number, number>;
    let bandStart: (d: Row) => number;
    let bandSize: number;
    let slotSize: number;
    if (isTime && timeAxis) {
      const layout = createTimeBarLayout(
        effectiveData,
        timeAxis,
        toDateTime,
        categoryRange,
        bandPadding,
        timeAxis.time?.barWidth,
      );
      warnIfBarWidthCapped(chartName, id, layout);
      const timeXFn = layout.scale;
      categoryScale = timeXFn;
      bandSize = layout.width;
      slotSize = layout.slotPx;
      const timeX = timePosition(timeXFn, toDateTime);
      bandStart = (d) => timeX(d) - bandSize / 2;
    } else {
      const band = scaleBand<string>()
        .domain(effectiveData.map((d) => String(d[effectiveCategory.key] ?? '')))
        .range(categoryRange)
        .padding(bandPadding);
      categoryScale = band;
      bandSize = band.bandwidth();
      slotSize = bandSize;
      bandStart = (d) => band(String(d[effectiveCategory.key] ?? '')) ?? 0;
    }

    const valueOf = (d: Row, key: string) => {
      const v = num(d, key);
      return Number.isFinite(v) ? v : undefined;
    };
    const stacked = layout !== 'grouped';
    const segments = stacked
      ? stackSegments(
        layout,
        effectiveData,
        effectiveSeries.map((column) => column.key),
        diverging,
      )
      : [];
    const anyFinite = effectiveSeries.some((column) =>
      effectiveData.some((d) => valueOf(d, column.key) !== undefined),
    );
    let dataMin: number | undefined;
    let dataMax: number | undefined;
    if (!stacked) {
      dataMin = min(effectiveSeries, (column) =>
        min(effectiveData, (d) => valueOf(d, column.key)),
      );
      dataMax = max(effectiveSeries, (column) =>
        max(effectiveData, (d) => valueOf(d, column.key)),
      );
    } else if (anyFinite) {
      if (layout === '100%') {
        dataMin = 0;
        dataMax = 1;
      } else if (layout === 'diverging') {
        const m = diverging.percent
          ? 1
          : max(segments.flat(), (seg) => Math.max(Math.abs(seg.lo), Math.abs(seg.hi))) ?? 0;
        dataMin = -m;
        dataMax = m;
      } else {
        dataMin = min(segments.flat(), (seg) => seg.lo);
        dataMax = max(segments.flat(), (seg) => seg.hi);
      }
    }
    if (layout === '100%') {
      if (effectiveData.some((d) =>
        effectiveSeries.some((column) => num(d, column.key) < 0))) {
        warnOnceInDev(
          `${chartName}#${id}:percent-negative`,
          `[headless-charts] ${chartName}#${id}: '100%' stacking treats negative values as 0.`,
        );
      }
      if (
        pinnedStart(effectiveSeries.map((column) => column.start)) !== undefined
        || pinnedEnd(effectiveSeries.map((column) => column.end)) !== undefined
      ) {
        warnOnceInDev(
          `${chartName}#${id}:percent-pins`,
          `[headless-charts] ${chartName}#${id}: '100%' stacking uses a [0, 1] share axis; ${valueAxis} start/end are ignored.`,
        );
      }
    }
    const pinsIgnored = layout === '100%';
    const pinStart = pinsIgnored
      ? undefined
      : pinnedStart(effectiveSeries.map((column) => column.start));
    const pinEnd = pinsIgnored
      ? undefined
      : pinnedEnd(effectiveSeries.map((column) => column.end));
    const start = pinStart
      ?? (dataMin === undefined ? 0 : Math.min(dataMin, 0));
    const end = pinEnd
      ?? (dataMax === undefined
        // No finite values: keep a finite [start, start+1] domain so nothing renders NaN.
        ? Math.max(isFiniteNumber(start) ? start : 0, 0) + 1
        : Math.max(dataMax, 0));
    const inverted = isFiniteNumber(start) && isFiniteNumber(end) && start > end;
    if (inverted) {
      warnOnceInDev(
        `${chartName}#${id}:inverted-domain`,
        `${chartName} "${id}": ${valueAxis} start (${start}) > end (${end}); bars cannot render on an inverted axis.`,
      );
    }

    const valueScale = scaleLinear().domain([start, end]).range(valueRange);
    const domain = valueScale.domain() as [number, number];
    const baselineValue = clampToDomain(0, domain);
    const baseline = valueScale(baselineValue);
    const valueEnd = (value: number) =>
      inverted || !Number.isFinite(value)
        ? baseline
        : valueScale(clampToDomain(value, domain));

    const seriesCount = Math.max(1, effectiveSeries.length);
    // Grouped and waterfall split the band per series; stacks use the full band.
    const slot = layout === 'normal' || layout === '100%' || layout === 'diverging'
      ? bandSize
      : bandSize / seriesCount;
    const inset = (effectiveCategory.padding ?? 0) + (layout === 'waterfall' ? waterfallPadding : 0);
    const rawThickness = slot - inset;
    if (layout === 'waterfall' && effectiveData.length > 0 && !(rawThickness > 0)) {
      const thicknessName = isVertical ? 'width' : 'height';
      warnOnceInDev(
        `${chartName}#${id}:waterfall-zero-width`,
        `[headless-charts] ${chartName}#${id}: waterfall bars have no ${thicknessName}: each step gets ${+slot.toFixed(1)}px of the bar (${+bandSize.toFixed(1)}px / ${seriesCount} series) and the waterfall padding takes all of it, so the bars are invisible. Reduce the waterfall padding, use fewer series, or widen the bars`,
      );
    }
    if (rawThickness <= 0 && inset && layout !== 'waterfall') {
      const thicknessName = isVertical ? 'width' : 'height';
      warnOnceInDev(
        `${chartName}#${id}:${categoryAxis}.padding`,
        `${chartName}#${id}: ${categoryAxis}.padding (${inset}) >= bar band (${slot.toFixed(1)}px); bars have no ${thicknessName}.`,
      );
    }
    const thickness = Math.max(0, rawThickness);

    const duration = drawing.duration ?? 0;
    const delay = drawing.delay ?? 0;

    const handlers = {
      over: (event: MouseEvent, d: Row) =>
        tooltipHandlers.current?.onMouseOver(event, d),
      move: (event: MouseEvent, d: Row) =>
        tooltipHandlers.current?.onMouseMove(event, d),
      leave: () => tooltipHandlers.current?.onMouseLeave(),
    };

    const barAlong = (value: number) => {
      const endAt = valueEnd(value);
      const lo = Math.min(baseline, endAt);
      const len =
        Number.isFinite(value) && !inverted ? Math.max(0, Math.abs(endAt - baseline)) : 0;
      return { lo, len, endAt };
    };

    const marksG = g
      .append('g')
      .attr('class', 'marks')
      .attr('clip-path', `url(#${clipId})`);

    const segmentAlong = (seg: Segment) => {
      const a = valueEnd(seg.lo);
      const b = valueEnd(seg.hi);
      const len = inverted || !Number.isFinite(seg.lo) ? 0 : Math.abs(b - a);
      return { lo: Math.min(a, b), len, mid: (a + b) / 2 };
    };
    // Segments grow from their side nearer 0.
    const segmentFrom = (seg: Segment) =>
      valueEnd(seg.lo >= 0 || seg.hi <= 0 ? (seg.lo >= 0 ? seg.lo : seg.hi) : 0);

    effectiveSeries.forEach((column, seriesIndex) => {
      if (stacked) {
        if (effectiveData.some((d) => !Number.isFinite(num(d, column.key)))) {
          warnOnceInDev(
            `${chartName}#${id}:${valueAxis}.key:${column.key}`,
            `${chartName}#${id}: non-numeric value for ${valueAxis}.key "${column.key}"; those bars are drawn empty.`,
          );
        }
        const segs = segments[seriesIndex];
        const offset = layout === 'waterfall' ? seriesIndex * slot : 0;
        const barsG = marksG.append('g');
        if (column.className) barsG.attr('class', column.className);
        const bars = barsG
          .selectAll('rect')
          .data(effectiveData)
          .enter()
          .append('rect')
          .attr('class', (d) =>
            twMerge(
              'fill-current',
              column.classNameNegative && num(d, column.key) < 0
                ? column.classNameNegative
                : column.className,
            ),
          )
          .attr('rx', column.rx || 0)
          .on('mouseenter', handlers.over)
          .on('mousemove', handlers.move)
          .on('mouseleave', handlers.leave);
        const across = isVertical ? 'x' : 'y';
        const alongAttr = isVertical ? 'y' : 'x';
        const thick = isVertical ? 'width' : 'height';
        const long = isVertical ? 'height' : 'width';
        bars
          .attr(across, (d) => bandStart(d) + offset)
          .attr(thick, thickness)
          .attr(alongAttr, (_, i) => (duration ? segmentFrom(segs[i]) : segmentAlong(segs[i]).lo))
          .attr(long, (_, i) => (duration ? 0 : segmentAlong(segs[i]).len));
        if (duration) {
          bars
            .transition()
            .duration(duration)
            .delay((_, rowIndex) => rowIndex * delay)
            .attr(alongAttr, (_, i) => segmentAlong(segs[i]).lo)
            .attr(long, (_, i) => segmentAlong(segs[i]).len);
        }
        if (dataLabel) {
          barsG
            .selectAll('text')
            .data(effectiveData)
            .enter()
            .append('text')
            .text((d, i) => {
              if (dataLabel.text) {
                return dataLabel.text(d as TData, column as BarSeriesConfig<TData>);
              }
              const share = segs[i].share;
              return share === undefined ? String(d[column.key] ?? '') : PERCENT(share);
            })
            .attr('class', twMerge('fill-current', dataLabel.className || ''))
            .attr('data-testid', 'label')
            .attr('font-size', '0.5em')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr(across, (d) => bandStart(d) + offset + thickness / 2)
            .attr(alongAttr, (_, i) => segmentAlong(segs[i]).mid);
        }
        return;
      }
      if (effectiveData.some((d) => !Number.isFinite(num(d, column.key)))) {
        warnOnceInDev(
          `${chartName}#${id}:${valueAxis}.key:${column.key}`,
          `${chartName}#${id}: non-numeric value for ${valueAxis}.key "${column.key}"; those bars are drawn empty.`,
        );
      }
      const barsG = marksG.append('g');
      const bars = barsG
        .selectAll('rect')
        .data(effectiveData)
        .enter()
        .append('rect')
        .attr('class', (d) =>
          twMerge(
            'fill-current',
            column.classNameNegative && num(d, column.key) < 0
              ? column.classNameNegative
              : column.className,
          ),
        )
        .attr('rx', column.rx || 0)
        .on('mouseenter', handlers.over)
        .on('mousemove', handlers.move)
        .on('mouseleave', handlers.leave);

      if (isVertical) {
        bars
          .attr('x', (d) => bandStart(d) + seriesIndex * slot)
          .attr('width', thickness)
          .attr('y', (d) => (duration ? baseline : barAlong(num(d, column.key)).lo))
          .attr('height', (d) => (duration ? 0 : barAlong(num(d, column.key)).len));
        if (duration) {
          bars
            .transition()
            .duration(duration)
            .delay((_, rowIndex) => rowIndex * delay)
            .attr('y', (d) => barAlong(num(d, column.key)).lo)
            .attr('height', (d) => barAlong(num(d, column.key)).len);
        }
      } else {
        bars
          .attr('y', (d) => bandStart(d) + seriesIndex * slot)
          .attr('height', thickness)
          .attr('x', (d) => (duration ? baseline : barAlong(num(d, column.key)).lo))
          .attr('width', (d) => (duration ? 0 : barAlong(num(d, column.key)).len));
        if (duration) {
          bars
            .transition()
            .duration(duration)
            .delay((_, rowIndex) => rowIndex * delay)
            .attr('x', (d) => barAlong(num(d, column.key)).lo)
            .attr('width', (d) => barAlong(num(d, column.key)).len);
        }
      }

      if (dataLabel) {
        barsG
          .selectAll('text')
          .data(effectiveData)
          .enter()
          .append('text')
          .text((d) =>
            dataLabel.text
              ? dataLabel.text(d as TData, column as BarSeriesConfig<TData>)
              : String(d[column.key] ?? ''),
          )
          .attr('class', twMerge('fill-current', dataLabel.className || ''))
          .attr('data-testid', 'label')
          .attr('font-size', '0.5em')
          .attr('text-anchor', () => {
            if (isVertical) return 'middle';
            return direction === 'left' ? 'start' : 'end';
          })
          .attr('x', (d) => {
            const { endAt } = barAlong(num(d, column.key));
            if (isVertical) return bandStart(d) + seriesIndex * slot + thickness / 2;
            return direction === 'left' ? endAt + 5 : endAt - 2;
          })
          .attr('y', (d) => {
            const value = num(d, column.key);
            const { endAt } = barAlong(value);
            if (!isVertical) {
              return bandStart(d) + (seriesIndex + 1) * slot - slot / 4;
            }
            const inside = value < 0 ? 4 : 12;
            return value < 0 ? endAt - inside : endAt + inside;
          });
      }
    });

    const hitsG = g.append('g').attr('class', 'hits');
    hitsG
      .selectAll('rect')
      .data(effectiveData)
      .enter()
      .append('rect')
      .attr('data-testid', 'bar-hit')
      .attr('fill', 'transparent')
      .attr('x', (d) => {
        if (!isVertical) return plotLeft;
        if (isTime) return bandStart(d) + bandSize / 2 - slotSize / 2;
        return bandStart(d);
      })
      .attr('y', (d) => (isVertical ? plotTop : bandStart(d)))
      .attr('width', isVertical ? slotSize : Math.max(0, plotRight - plotLeft))
      .attr('height', isVertical ? Math.max(0, plotBottom - plotTop) : slotSize)
      .on('mouseenter', handlers.over)
      .on('mousemove', handlers.move)
      .on('mouseleave', handlers.leave);

    referenceLines.forEach((line) => {
      const pos = isVertical ? line.y : line.x;
      const wrong = isVertical ? line.x : line.y;
      if (wrong != null && pos == null) {
        warnOnceInDev(
          `${chartName}#${id}:reference-axis`,
          `[headless-charts] ${chartName}#${id}: referenceLines use ${valueAxis} when orientation is "${orientation}"; ${otherAxis} is ignored.`,
        );
        return;
      }
      if (!isFiniteNumber(pos)) return;
      const along = valueScale(pos);
      const ref = g
        .append('line')
        .attr(
          'class',
          twMerge('reference-line line stroke-current', line.className),
        )
        .attr('stroke', '#dddddd')
        .attr('clip-path', `url(#${clipId})`);
      if (isVertical) {
        ref
          .attr('x1', plotLeft)
          .attr('x2', plotRight)
          .attr('y1', along)
          .attr('y2', along);
      } else {
        ref
          .attr('x1', along)
          .attr('x2', along)
          .attr('y1', plotTop)
          .attr('y2', plotBottom);
      }
    });

    const valueLocation =
      effectiveSeries.find((col) => col.axis?.location)?.axis?.location
      ?? (isVertical ? 'left' : 'bottom');
    // No finite values and no pinned end: the domain is a placeholder, so draw no value ticks.
    const placeholderDomain = dataMax === undefined && pinEnd === undefined;
    const tickMax = stacked ? end : dataMax;
    const valueTicks =
      effectiveSeries[0]?.axis?.ticks
      ?? (wholeNumbers && isFiniteNumber(tickMax) && tickMax < 10 ? tickMax : 5);
    const valueLabel = isBinned
      ? 'Count'
      : effectiveSeries.map((column) => column.axis?.label || column.key || '').join(', ');
    const valueAxisConfig: AxisConfig = {
      key: effectiveSeries[0]?.key || '',
      axis: {
        location: valueLocation as 'top' | 'bottom' | 'left' | 'right',
        ticks: valueTicks,
        label: valueLabel,
      },
    };

    const categoryLocation = isVertical
      ? 'bottom'
      : direction === 'left'
        ? 'right'
        : 'left';
    const categoryAxisConfig: AxisConfig = {
      ...effectiveCategory,
      axis: {
        ...effectiveCategory.axis,
        location: (effectiveCategory.axis?.location ?? categoryLocation) as 'top' | 'bottom' | 'left' | 'right',
      },
    };
    if (isVertical) {
      categoryAxisConfig.axis = {
        ...categoryAxisConfig.axis,
        location: 'bottom',
      };
    } else {
      categoryAxisConfig.axis = {
        ...categoryAxisConfig.axis,
        location: categoryLocation,
      };
    }

    const xConfig = isVertical ? categoryAxisConfig : valueAxisConfig;
    const yConfig = isVertical ? valueAxisConfig : categoryAxisConfig;

    // Narrow the band/time union so each drawAxis call gets one domain type.
    const xAxisOptions = {
      g,
      config: xConfig,
      dimensions: { width, height },
      margin,
      padding,
      orientation: 'horizontal' as const,
    };
    const yAxisOptions = {
      g,
      config: yConfig,
      dimensions: { width, height },
      margin,
      padding,
      orientation: 'vertical' as const,
    };
    // The value axis is always linear; assign it inside each branch so
    // tickFormat/tickValues do not see a band/time union. The category axis
    // is band or time.
    let valueDrawn;
    if (isVertical) {
      if ('bandwidth' in categoryScale) {
        drawAxis({ ...xAxisOptions, scale: categoryScale });
      } else {
        drawAxis({ ...xAxisOptions, scale: categoryScale });
      }
      valueDrawn = drawAxis({ ...yAxisOptions, scale: valueScale });
    } else {
      valueDrawn = drawAxis({ ...xAxisOptions, scale: valueScale });
      if ('bandwidth' in categoryScale) {
        drawAxis({ ...yAxisOptions, scale: categoryScale });
      } else {
        drawAxis({ ...yAxisOptions, scale: categoryScale });
      }
    }
    const percentAxis = layout === '100%' || (layout === 'diverging' && diverging.percent);
    if (tickFormat || percentAxis) {
      const base = tickFormat ? d3format(tickFormat) : PERCENT;
      // Diverging percent ticks show absolute shares: -40% reads 40%.
      const formatted = layout === 'diverging' && diverging.percent
        ? (v: number) => base(Math.abs(v))
        : base;
      valueDrawn.axisG.call(
        valueDrawn.axis.tickFormat(formatted as (v: unknown) => string),
      );
    }
    if (placeholderDomain) {
      valueDrawn.axisG.call(valueDrawn.axis.tickValues([]));
    }
  }, [
    bandPadding,
    binConfig,
    category,
    categoryBin,
    categoryKey,
    chartName,
    data,
    dataLabel,
    direction,
    diverging,
    layout,
    waterfallPadding,
    drawing.delay,
    drawing.duration,
    id,
    isBinned,
    isTime,
    isVertical,
    margin,
    mismatch,
    orientation,
    otherAxis,
    padding,
    props.x,
    referenceLines,
    series,
    tickFormat,
    timeAxis,
    toDateTime,
    valueAxis,
    wholeNumbers,
    width,
    height,
  ]);

  useEffect(() => {
    if (!measured) return;
    refreshChart();
    // A style/className size change reaches refreshChart through useChartSize.
    const node = svgRef.current;
    return () => {
      interruptTransitions(node);
    };
  }, [refreshChart, measured]);

  return (
    <svg
      ref={svgRef}
      id={id}
      style={style}
      className={twMerge(defaultChartClassNames, className)}
      data-testid='bar-chart'
    />
  );
};

/* catalog:start */
/**
 * Vertical or horizontal bars comparing one or more measures across
 * categories, grouped side by side when several measures are passed. Set
 * `orientation="horizontal"` for long category labels.
 *
 * @remarks
 *
 * **Use when**
 * - Comparing a numeric measure across a modest number of categories with
 *   short labels
 * - Several measures need comparing within each category, side by side
 * - The categories are periods (years, quarters) and individual values
 *   matter more than the trend line
 * - Category labels are long or there are more than ~12 categories — set
 *   `orientation="horizontal"`
 * - Presenting a ranked list, sorted by value — set
 *   `orientation="horizontal"`
 * - Showing a histogram of raw continuous values — set `bin` on the category
 *   config (`x.bin` in vertical, `y.bin` in horizontal)
 * - Bars should grow leftward from the right edge — set
 *   `orientation="horizontal"` and `direction: "left"`
 *
 * **Avoid when**
 * - The measures are parts of one whole and the grouped default is used —
 *   set `stacking` so the total is readable
 * - The x axis is continuous time with many points — use LineChart
 * - The bars would be nearly equal in height, making differences invisible —
 *   use LollipopChart or a dot-based chart
 * - Two measures should read outward from a shared centre — use SpineChart
 *
 * **Specialised types**
 * - Horizontal bar chart — Set `orientation="horizontal"`; categories go on
 *   `y` and the series array on `x`.
 * - Histogram — Set `x={{ key: "score", bin: { count: 8 } }}` and `y={[{
 *   key: "count" }]}`. Pass the raw rows as `data` — binning and counting
 *   happen internally. Use `bin.thresholds` for explicit edges.
 * - Horizontal histogram — Set `orientation="horizontal"`, `y={{ key, bin
 *   }}` and `x={[{ key: "count" }]}`. Legacy `x[0].bin` is still read; if
 *   both are set, `y.bin` wins.
 * - Diverging bar chart — Supply negative values in the data, set
 *   `start`/`end` on the series to pin a symmetric axis, and style with
 *   `className` plus `classNameNegative`. The example is horizontal.
 * - Time-scaled column chart — Vertical only. Set `x.scalingFunction:
 *   "time"` with `x.time.format`, or `x.time.isISO` for ISO strings. Bar
 *   width comes from the median gap between dates (one slot per step);
 *   `x.time.barWidth` (positive pixels) overrides it but is capped at one
 *   slot, so it can narrow bars but never widen them past their slot. ISO
 *   dates are read, placed and labelled in UTC by default, so calendar days
 *   (`2025-01-31`) land on the right day in every time zone; set
 *   `x.time.utc: false` for the viewer's local time, or `x.time.utc: true`
 *   to read `x.time.format` strings in UTC. Pinned `x.start`/`x.end` (epoch
 *   ms) get no edge padding, so a bar dated exactly on a pinned end is
 *   centred on the plot edge and overhangs it by half a bar; to keep edge
 *   marks inside, pin half a step outside the data (e.g. `start:
 *   Date.UTC(2025, 0, 1) - 12 * 3600_000` for daily data starting 1 Jan
 *   2025).
 * - Stacked bar chart — Set `stacking={{ type: 'normal' }}`. Segments stack
 *   from 0 in series order; negative values stack below 0.
 *   `ColumnChartStacked` is this form as a wrapper.
 * - Horizontal stacked bar chart — Set `orientation="horizontal"` and
 *   `stacking={{ type: 'normal' }}`; categories go on `y`, the series array
 *   on `x`. `BarChartStacked` is this form as a wrapper.
 * - 100% stacked bar chart — Set `stacking={{ type: '100%' }}`. The axis is
 *   [0, 1] with `.0%` ticks (`tickFormat` overrides it); negative values
 *   count as 0; pinned `start`/`end` are ignored. Tooltips and labels show
 *   the share.
 * - Diverging stacked bar chart — Set `stacking={{ type: 'diverging',
 *   negative: ['strongly_disagree', 'disagree'], neutral: 'neutral' }}`.
 *   List series in scale order; the last `negative` key and the first
 *   positive key touch 0; `neutral` is split across 0; `percent: true`
 *   normalises each row to 100%. The example is horizontal. Use a diverging
 *   palette (RdBu, BrBG) with grey for neutral.
 * - Waterfall chart — Set `waterfall` (or `waterfall={{ padding: 4 }}` to
 *   narrow the steps). Each series becomes its own step within the category,
 *   starting where the previous one ended. `waterfall` wins over `stacking`.
 * - Horizontal waterfall chart — Set `orientation="horizontal"` and
 *   `waterfall`; categories go on `y`, the series array on `x`.
 * - Time-scaled stacked column chart — Vertical only. Set `stacking={{ type:
 *   'normal' }}` and `x.scalingFunction: "time"` with `x.time.format` or
 *   `x.time.isISO`; bar width follows the median gap between dates, as for
 *   the time-scaled column chart.
 *
 * Also called: bar chart, bar graph, column chart, column graph, vertical bar chart, grouped bar chart, grouped column chart, clustered column chart, clustered bar chart.
 *
 * Wrapper components: `ColumnChart` (`orientation="vertical"`, deprecated),
 * `BarChartStacked` (`orientation="horizontal" stacking={{ type: "normal"
 * }}`), `ColumnChartStacked` (`orientation="vertical" stacking={{ type:
 * "normal" }}`). Prefer `<BarChart>` with the prop set in new code.
 * `ColumnChart` is deprecated and will be removed in 0.4.0. `BarChartStacked`
 * and `ColumnChartStacked` remain a stable public API.
 *
 * Answers: comparison, composition, distribution, ranking. Required props: `id`, `data`, `x`, `y`.
 *
 * @example
 * ```tsx
 * <BarChart
 *   id="sales-by-year"
 *   className="w-full h-64"
 *   data={data}
 *   x={{ key: 'year' }}
 *   y={[
 *     { key: 'macbook', className: 'fill-purple-800' },
 *     { key: 'iphone', className: 'fill-purple-600' },
 *   ]}
 * />
 * ```
 *
 * @example Horizontal bar chart
 * ```tsx
 * <BarChart
 *   id="sales-by-region"
 *   className="w-full h-64"
 *   orientation="horizontal"
 *   data={data}
 *   y={{ key: 'region' }}
 *   x={[{ key: 'revenue', className: 'fill-blue-500' }]}
 * />
 * ```
 *
 * @example Histogram
 * ```tsx
 * <BarChart
 *   id="score-histogram"
 *   className="w-full h-64"
 *   data={rawRows}
 *   x={{ key: 'score', bin: { count: 8 }, axis: { label: 'Score' } }}
 *   y={[{ key: 'count', className: 'text-blue-500' }]}
 * />
 * ```
 *
 * @example Horizontal histogram
 * ```tsx
 * <BarChart
 *   id="score-histogram"
 *   className="w-full h-64"
 *   orientation="horizontal"
 *   data={rawRows}
 *   y={{ key: 'score', bin: { count: 8 } }}
 *   x={[{ key: 'count', className: 'fill-blue-500' }]}
 * />
 * ```
 *
 * @example Diverging bar chart
 * ```tsx
 * <BarChart
 *   id="yoy-change"
 *   className="w-full h-64"
 *   orientation="horizontal"
 *   data={data}
 *   x={[{
 *     key: 'delta',
 *     className: 'text-green-500',
 *     classNameNegative: 'text-red-500',
 *     start: -10,
 *     end: 10,
 *     axis: { location: 'top' },
 *   }]}
 *   y={{ key: 'year', padding: 10 }}
 * />
 * ```
 *
 * @example Time-scaled column chart
 * ```tsx
 * <BarChart
 *   id="daily-signups"
 *   className="w-full h-64"
 *   data={data}
 *   x={{ key: 'date', scalingFunction: 'time', time: { isISO: true, utc: true } }}
 *   y={[{ key: 'signups', className: 'fill-purple-600' }]}
 * />
 * ```
 *
 * @example Stacked bar chart
 * ```tsx
 * <BarChart
 *   id="revenue-split"
 *   className="w-full h-64"
 *   data={data}
 *   stacking={{ type: 'normal' }}
 *   x={{ key: 'year' }}
 *   y={[
 *     { key: 'macbook', className: 'fill-purple-800' },
 *     { key: 'iphone', className: 'fill-purple-600' },
 *   ]}
 * />
 * ```
 *
 * @example Horizontal stacked bar chart
 * ```tsx
 * <BarChart
 *   id="revenue-by-region"
 *   className="w-full h-64"
 *   data={data}
 *   orientation="horizontal"
 *   stacking={{ type: 'normal' }}
 *   y={{ key: 'year' }}
 *   x={[
 *     { key: 'macbook', className: 'fill-purple-800' },
 *     { key: 'iphone', className: 'fill-purple-600' },
 *   ]}
 * />
 * ```
 *
 * @example 100% stacked bar chart
 * ```tsx
 * <BarChart
 *   id="share-split"
 *   className="w-full h-64"
 *   data={data}
 *   stacking={{ type: '100%' }}
 *   x={{ key: 'year' }}
 *   y={[
 *     { key: 'macbook', className: 'fill-purple-800' },
 *     { key: 'iphone', className: 'fill-purple-600' },
 *   ]}
 * />
 * ```
 *
 * @example Diverging stacked bar chart
 * ```tsx
 * <BarChart
 *   id="survey"
 *   className="w-full h-64"
 *   data={data}
 *   orientation="horizontal"
 *   stacking={{ type: 'diverging', negative: ['disagree'], neutral: 'neutral', percent: true }}
 *   y={{ key: 'question' }}
 *   x={[
 *     { key: 'disagree', className: 'fill-red-600' },
 *     { key: 'neutral', className: 'fill-gray-400' },
 *     { key: 'agree', className: 'fill-blue-600' },
 *   ]}
 * />
 * ```
 *
 * @example Waterfall chart
 * ```tsx
 * <BarChart
 *   id="revenue-bridge"
 *   className="w-full h-64"
 *   data={data}
 *   waterfall
 *   x={{ key: 'year' }}
 *   y={[
 *     { key: 'macbook', className: 'fill-purple-800' },
 *     { key: 'iphone', className: 'fill-purple-600' },
 *   ]}
 * />
 * ```
 *
 * @example Horizontal waterfall chart
 * ```tsx
 * <BarChart
 *   id="profit-walk"
 *   className="w-full h-64"
 *   data={data}
 *   orientation="horizontal"
 *   waterfall
 *   y={{ key: 'year' }}
 *   x={[
 *     { key: 'macbook', className: 'fill-purple-800' },
 *     { key: 'iphone', className: 'fill-purple-600' },
 *   ]}
 * />
 * ```
 *
 * @example Time-scaled stacked column chart
 * ```tsx
 * <BarChart
 *   id="daily-revenue-split"
 *   className="w-full h-64"
 *   data={data}
 *   stacking={{ type: 'normal' }}
 *   x={{ key: 'date', scalingFunction: 'time', time: { isISO: true, utc: true } }}
 *   y={[
 *     { key: 'macbook', className: 'fill-purple-800' },
 *     { key: 'iphone', className: 'fill-purple-600' },
 *   ]}
 * />
 * ```
 *
 * @see LollipopChart — bars look heavy and the value point is the focus
 * @see SpineChart — two opposing measures per category
 * @see LineChart — the axis is continuous time with many points
 */
/* catalog:end */
const BarChart = <TData = any,>(props: BarChartProps<TData>) => (
  <BarRenderer<TData> {...props} chartName='BarChart' />
);

export default BarChart;

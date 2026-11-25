import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type CSSProperties,
} from 'react';
import { max, min } from 'd3-array';
import { scaleBand, scaleLinear, type ScaleTime } from 'd3-scale';
import { select } from 'd3-selection';
import 'd3-transition';
import {
  symbol,
  symbolCircle,
  symbolCross,
  symbolDiamond,
  symbolSquare,
  symbolStar,
  symbolTriangle,
  symbolWye,
  type SymbolType,
} from 'd3-shape';
import { twMerge } from 'tailwind-merge';

import { drawAxis } from '@/hooks/useAxis';
import useTooltip, { type UseTooltipResult } from '@/hooks/useTooltip';
import type {
  AxisConfig,
  ChartOrientation,
  ChartProps,
  TooltipConfig,
} from '@/types';
import { defaultChartClassNames } from '@/utils';
import { clampToDomain, isFiniteNumber, resolveBound } from '@/utils/domain';
import { warnOnceInDev } from '@/utils/devEnvironment';
import { interruptTransitions } from '@/utils/interruptTransitions';
import useChartSize from '@/hooks/useChartSize';
import {
  orientationMessages,
  resolveOrientation,
  warnOrientation,
  warnOrientationResolution,
} from '@/utils/orientation';
import {
  createTimeXScale,
  makeDateAccessor,
  makeDateFormatter,
  padTimeDomain,
  timePosition,
  useTimeAxisWarnings,
} from '@/utils/timeScale';

export type LollipopShape =
  | 'circle'
  | 'diamond'
  | 'triangle'
  | 'square'
  | 'cross'
  | 'star'
  | 'wye';

export interface LollipopChartClassNames {
  /** Applied to stems and symbols */
  points?: string;
  /** Stems only */
  lines?: string;
  /** Symbols only */
  symbols?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
export interface LollipopChartProps<TData = any> extends ChartProps<TData> {
  data: TData[];
  /** Default 'vertical': categories (or dates) on x, values on y. */
  orientation?: ChartOrientation;
  /** Vertical: category key. Horizontal: value key. */
  x?: AxisConfig<TData>;
  /** Vertical: value key. Horizontal: category key. */
  y?: AxisConfig<TData>;
  /** Symbol at the end of each stem. Default 'circle'. */
  shape?: LollipopShape;
  classNames?: LollipopChartClassNames;
  tooltip?: TooltipConfig;
}

/**
 * @deprecated Use {@link LollipopChartProps} with `orientation="vertical"`. Will be removed in 0.4.0.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
export type LollipopVChartProps<TData = any> =
  Omit<LollipopChartProps<TData>, 'orientation'> & { orientation?: 'vertical' };
/**
 * @deprecated Use {@link LollipopChartProps} with `orientation="horizontal"`. Will be removed in 0.4.0.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
export type LollipopHChartProps<TData = any> =
  Omit<LollipopChartProps<TData>, 'orientation'> & { orientation?: 'horizontal' };

/** Set by the public component or a wrapper; not part of the public props. */
interface LollipopRendererProps {
  /** The component the caller rendered, for warnings */
  chartName: LollipopChartName;
  /** Orientation a wrapper pins */
  pinned?: ChartOrientation;
}

export type LollipopChartName =
  | 'LollipopChart'
  | 'LollipopHChart'
  | 'LollipopVChart';

type Row = Record<string, unknown>;
type TooltipHandlers = Pick<
  UseTooltipResult,
  'onMouseOver' | 'onMouseMove' | 'onMouseLeave'
>;

const SHAPE_MAPPING: Record<LollipopShape, SymbolType> = {
  circle: symbolCircle,
  diamond: symbolDiamond,
  triangle: symbolTriangle,
  square: symbolSquare,
  cross: symbolCross,
  star: symbolStar,
  wye: symbolWye,
};

const SYMBOL_SIZE = 100;
/** Grown clip and time-domain pad; covers the widest symbol at size 100. */
const SYMBOL_INSET_PX = 10;

const VERTICAL_MARGIN = { left: 40, right: 40, top: 40, bottom: 40 };
const HORIZONTAL_MARGIN = { left: 80, right: 40, top: 40, bottom: 40 };
const DEFAULT_PADDING = { left: 0, right: 0, top: 0, bottom: 0 };
const DEFAULT_DRAWING: NonNullable<ChartProps['drawing']> = { duration: 0 };
const VERTICAL_X: AxisConfig = { key: 'x', axis: { location: 'bottom', ticks: 0 } };
const HORIZONTAL_X: AxisConfig = { key: 'x', axis: { location: 'bottom', ticks: 2 } };
const DEFAULT_Y: AxisConfig = { key: 'y', axis: { location: 'left' } };
const DEFAULT_STYLE: CSSProperties = {};
/** Stand-in for useTimeAxisWarnings when the category axis is not a time axis */
const NO_TIME_AXIS: AxisConfig = { key: '' };

const num = (d: Row, key: string): number => {
  const v = d[key];
  // null/'' would coerce to 0; treat them as missing so the non-finite rule applies.
  return v == null || v === '' ? Number.NaN : Number(v);
};

/** Value-descending; non-finite values sort last. Does not mutate `rows`. */
const sortByValueDesc = (rows: Row[], valueKey: string): Row[] =>
  [...rows].sort((a, b) => {
    const va = num(a, valueKey);
    const vb = num(b, valueKey);
    const aOk = Number.isFinite(va);
    const bOk = Number.isFinite(vb);
    if (aOk && bOk) return vb - va;
    if (aOk) return -1;
    if (bOk) return 1;
    return 0;
  });

/**
 * Hit extent along the category axis in time mode: midpoints between
 * neighbouring dates, clipped to the plot. A single row spans the plot.
 */
const timeHitExtents = (
  positions: number[],
  plotStart: number,
  plotEnd: number,
): [number, number][] => {
  const lo = Math.min(plotStart, plotEnd);
  const hi = Math.max(plotStart, plotEnd);
  const unique = [...new Set(positions)].sort((a, b) => a - b);
  const extentOf = (p: number): [number, number] => {
    if (unique.length <= 1) return [lo, hi];
    const i = unique.indexOf(p);
    const start = i === 0 ? lo : (unique[i - 1] + p) / 2;
    const end = i === unique.length - 1 ? hi : (p + unique[i + 1]) / 2;
    return [Math.max(lo, Math.min(start, end)), Math.min(hi, Math.max(start, end))];
  };
  return positions.map(extentOf);
};

/**
 * The shared renderer behind `LollipopChart`, `LollipopHChart` and
 * `LollipopVChart`.
 * @internal Use one of the exported components.
 */
export const LollipopRenderer = <TData,>(
  props: LollipopChartProps<TData> & LollipopRendererProps,
) => {
  const {
    chartName,
    pinned,
    className,
    classNames,
    data,
    id,
    padding = DEFAULT_PADDING,
    tooltip,
    shape = 'circle',
    drawing = DEFAULT_DRAWING,
    style = DEFAULT_STYLE,
    orientation: givenOrientation,
  } = props;
  const svgRef = useRef<SVGSVGElement>(null);
  // Redraws when the svg's rendered size changes, including container-driven
  // resizes (#53). null until measured, so the first draw is at the real size.
  const size = useChartSize(svgRef);
  const measured = size !== null;
  const width = size?.width ?? 0;
  const height = size?.height ?? 0;

  const resolution = resolveOrientation({
    pinned,
    given: givenOrientation,
    evidence: null,
  });
  const orientation = resolution.orientation;
  const isVertical = orientation === 'vertical';
  const ignoredGiven = resolution.ignoredGiven;

  const margin = props.margin ?? (isVertical ? VERTICAL_MARGIN : HORIZONTAL_MARGIN);
  const x = props.x ?? (isVertical ? VERTICAL_X : HORIZONTAL_X);
  const y = props.y ?? DEFAULT_Y;

  // x and y are spatial: the category axis is x when vertical, y when horizontal.
  const categoryConfig = (isVertical ? x : y) as AxisConfig<TData>;
  const valueConfig = (isVertical ? y : x) as AxisConfig<TData>;
  const timeAxis = x as AxisConfig<TData>;
  const timeRequested = categoryConfig.scalingFunction === 'time';
  const isTime = isVertical && timeRequested;

  useEffect(() => {
    warnOrientationResolution(chartName, 'LollipopChart', id, {
      orientation,
      ignoredGiven,
    });
    if (!isVertical && timeRequested) {
      warnOrientation(
        chartName,
        id,
        'time-ignored',
        orientationMessages.timeIgnored(),
      );
    }
  }, [chartName, id, orientation, isVertical, ignoredGiven, timeRequested]);

  useTimeAxisWarnings(chartName, id, data, isTime ? timeAxis : NO_TIME_AXIS, {
    checkBarWidth: false,
  });

  const xKey = timeAxis.key;
  const xTimeFormat = timeAxis.time?.format;
  const xTimeIsISO = timeAxis.time?.isISO;
  const xTimeUtc = timeAxis.time?.utc;
  const toDateTime = useMemo(
    () =>
      makeDateAccessor<Row>({
        key: xKey ?? '',
        time: { format: xTimeFormat, isISO: xTimeIsISO, utc: xTimeUtc },
      }),
    [xKey, xTimeFormat, xTimeIsISO, xTimeUtc],
  );
  const formatDate = makeDateFormatter(timeAxis);
  const valueKey = valueConfig.key;
  const categoryKey = categoryConfig.key;
  const valueAxisName = isVertical ? 'y' : 'x';

  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: (d: Row) => {
      const value = d[valueKey];
      if (isTime) {
        const date = toDateTime(d);
        const category = date ? formatDate(date) : String(d[categoryKey] ?? '');
        return `${category}: ${value}`;
      }
      return `${d[categoryKey]}: ${value}`;
    },
  });

  // The hook's handlers are new each render but read the latest config, so
  // the d3 listeners call them through a ref instead of making them redraw
  // deps: a new `tooltip` object doesn't redraw or rebind.
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

    const rawRows = isTime
      ? // rows without a readable date are not drawn (dev warning from
        // useTimeAxisWarnings)
        (data as Row[]).filter((d) => toDateTime(d) != null)
      : (data as Row[]);
    const rows = sortByValueDesc(rawRows, valueKey);

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

    const horizontalRange: [number, number] = [m.left + p.left, width - m.right - p.right];
    const verticalValueRange: [number, number] = [
      height - m.bottom - p.bottom,
      m.top + p.top,
    ];
    const verticalCategoryRange: [number, number] = [
      m.top + p.top,
      height - m.bottom - p.bottom,
    ];
    const categoryRange = isVertical ? horizontalRange : verticalCategoryRange;
    const valueRange = isVertical ? verticalValueRange : horizontalRange;
    const plotLeft = horizontalRange[0];
    const plotRight = horizontalRange[1];
    const plotTop = Math.min(verticalValueRange[0], verticalValueRange[1]);
    const plotBottom = Math.max(verticalValueRange[0], verticalValueRange[1]);

    let categoryScale: ReturnType<typeof scaleBand<string>> | ScaleTime<number, number>;
    let stemPos: (d: Row) => number;
    let bandStart: (d: Row) => number;
    let bandSize: number;
    if (isTime) {
      const timeScale = padTimeDomain(
        createTimeXScale(rows, timeAxis, toDateTime, categoryRange),
        SYMBOL_INSET_PX,
        timeAxis,
      );
      const timeX = timePosition(timeScale, toDateTime);
      categoryScale = timeScale;
      stemPos = (d) => timeX(d);
      bandStart = () => plotLeft;
      bandSize = Math.max(0, plotRight - plotLeft);
    } else {
      const band = scaleBand<string>()
        .domain(rows.map((d) => String(d[categoryKey] ?? '')))
        .range(categoryRange);
      categoryScale = band;
      bandSize = band.bandwidth();
      bandStart = (d) => band(String(d[categoryKey] ?? '')) ?? 0;
      stemPos = (d) => bandStart(d) + bandSize / 2;
    }

    const dataMin = min(rows, (d) => {
      const v = num(d, valueKey);
      return Number.isFinite(v) ? v : undefined;
    });
    const dataMax = max(rows, (d) => {
      const v = num(d, valueKey);
      return Number.isFinite(v) ? v : undefined;
    });
    // Zero baseline: include 0 unless start/end are pinned (same rule as BarChart).
    const start = resolveBound(
      valueConfig.start,
      dataMin === undefined ? Number.NaN : Math.min(dataMin, 0),
    );
    const end = resolveBound(
      valueConfig.end,
      dataMax === undefined ? Number.NaN : Math.max(dataMax, 0),
    );
    const inverted = isFiniteNumber(start) && isFiniteNumber(end) && start > end;
    if (inverted) {
      warnOnceInDev(
        `${chartName}#${id}:inverted-domain`,
        `[headless-charts] ${chartName}#${id}: ${valueAxisName}.start (${start}) > ${valueAxisName}.end (${end}); stems have zero length.`,
      );
    }
    const domainStart = isFiniteNumber(start) ? start : 0;
    const domainEnd = isFiniteNumber(end) ? end : isFiniteNumber(start) ? start : 1;
    const valueScale = scaleLinear()
      .domain([domainStart, domainEnd])
      .range(valueRange);
    const domain = valueScale.domain() as [number, number];
    const baselineValue = clampToDomain(0, domain);
    const baseline = valueScale(baselineValue);
    const clampedValue = (d: Row) => clampToDomain(num(d, valueKey), domain);
    const valueEnd = (d: Row) => (inverted ? baseline : valueScale(clampedValue(d)));

    const g = svg.append('g');

    const clipId = `${id}-plot-clip`;
    svg
      .append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('x', plotLeft - SYMBOL_INSET_PX)
      .attr('y', plotTop - SYMBOL_INSET_PX)
      .attr('width', Math.max(0, plotRight - plotLeft + 2 * SYMBOL_INSET_PX))
      .attr('height', Math.max(0, plotBottom - plotTop + 2 * SYMBOL_INSET_PX));

    const marksG = g
      .append('g')
      .attr('class', 'marks')
      .attr('clip-path', `url(#${clipId})`);

    const handlers = {
      over: (event: MouseEvent, d: Row) =>
        tooltipHandlers.current?.onMouseOver(event, d),
      move: (event: MouseEvent, d: Row) =>
        tooltipHandlers.current?.onMouseMove(event, d),
      leave: () => tooltipHandlers.current?.onMouseLeave(),
    };

    const pointGroup = marksG
      .selectAll<SVGGElement, Row>('g')
      .data(rows)
      .enter()
      .append('g')
      .attr('data-category', (d) => String(d[categoryKey] ?? ''))
      .on('mouseenter', handlers.over)
      .on('mousemove', handlers.move)
      .on('mouseleave', handlers.leave);

    let warnedNonFinite = false;
    pointGroup.each(function (d, rowIndex) {
      const value = num(d, valueKey);
      if (!Number.isFinite(value)) {
        if (!warnedNonFinite) {
          warnedNonFinite = true;
          warnOnceInDev(
            `${chartName}#${id}:non-numeric`,
            `[headless-charts] ${chartName}#${id}: non-numeric value for ${valueAxisName}.key "${valueKey}"; that row is not drawn.`,
          );
        }
        return;
      }
      const group = select(this);
      const pos = stemPos(d);
      const endAt = valueEnd(d);
      const symbolAt = inverted ? baseline : valueScale(value);
      const lineClass = twMerge(
        isVertical ? 'line stroke-current' : 'line stroke-2 stroke-current',
        classNames?.points,
        classNames?.lines,
      );
      const symbolClass = twMerge(
        isVertical ? 'symbols fill-current' : 'symbols',
        classNames?.points,
        classNames?.symbols,
      );
      const line = group.append('line').attr('class', lineClass);
      const marker = group
        .append('path')
        .attr('class', symbolClass)
        .attr('d', symbol(SHAPE_MAPPING[shape] ?? symbolCircle, SYMBOL_SIZE)() ?? '');

      if (isVertical) {
        line.attr('x1', pos).attr('x2', pos);
      } else {
        line.attr('y1', pos).attr('y2', pos);
      }

      const applyStemStart = () => {
        if (isVertical) line.attr('y1', baseline).attr('y2', baseline);
        else line.attr('x1', baseline).attr('x2', baseline);
      };
      const applyStemEnd = () => {
        if (isVertical) line.attr('y1', endAt).attr('y2', baseline);
        else line.attr('x1', baseline).attr('x2', endAt);
      };
      const startTransform = isVertical
        ? `translate(${pos},${baseline})`
        : `translate(${baseline},${pos})`;
      const endTransform = isVertical
        ? `translate(${pos},${symbolAt})`
        : `translate(${symbolAt},${pos})`;

      const duration = drawing.duration ?? 0;
      const delayMs = drawing.delay ?? 0;
      if (!duration) {
        applyStemEnd();
        marker.attr('transform', endTransform);
      } else {
        applyStemStart();
        marker.attr('transform', startTransform);
        line
          .transition()
          .duration(duration)
          .delay(rowIndex * delayMs)
          .call((t) => {
            if (isVertical) t.attr('y1', endAt).attr('y2', baseline);
            else t.attr('x1', baseline).attr('x2', endAt);
          });
        marker
          .transition()
          .duration(duration)
          .delay(rowIndex * delayMs)
          .attr('transform', endTransform);
      }
    });

    const hitsG = g.append('g').attr('class', 'hits');
    const hitRanges = isTime
      ? timeHitExtents(rows.map(stemPos), plotLeft, plotRight)
      : null;
    const hits = hitsG
      .selectAll<SVGRectElement, Row>('rect')
      .data(rows)
      .enter()
      .append('rect')
      .attr('data-testid', 'lollipop-hit')
      .attr('fill', 'transparent')
      .on('mouseenter', handlers.over)
      .on('mousemove', handlers.move)
      .on('mouseleave', handlers.leave);

    hits.each(function (d, i) {
      const hit = select(this);
      if (isVertical) {
        if (hitRanges) {
          const [x0, x1] = hitRanges[i];
          hit.attr('x', x0).attr('width', Math.max(0, x1 - x0));
        } else {
          hit.attr('x', bandStart(d)).attr('width', Math.max(0, bandSize));
        }
        hit.attr('y', plotTop).attr('height', Math.max(0, plotBottom - plotTop));
      } else {
        hit.attr('y', bandStart(d)).attr('height', Math.max(0, bandSize));
        hit.attr('x', plotLeft).attr('width', Math.max(0, plotRight - plotLeft));
      }
    });

    // x then y, as both legacy components drew them.
    // Narrow the band/time union so each drawAxis call gets one domain type.
    const xAxisOptions = {
      g,
      config: x,
      dimensions: { width, height },
      margin,
      padding,
      orientation: 'horizontal' as const,
    };
    const yAxisOptions = {
      g,
      config: y,
      dimensions: { width, height },
      margin,
      padding,
      orientation: 'vertical' as const,
    };
    if (isVertical) {
      if ('bandwidth' in categoryScale) {
        drawAxis({ ...xAxisOptions, scale: categoryScale });
      } else {
        drawAxis({ ...xAxisOptions, scale: categoryScale });
      }
      drawAxis({ ...yAxisOptions, scale: valueScale });
    } else {
      drawAxis({ ...xAxisOptions, scale: valueScale });
      if ('bandwidth' in categoryScale) {
        drawAxis({ ...yAxisOptions, scale: categoryScale });
      } else {
        drawAxis({ ...yAxisOptions, scale: categoryScale });
      }
    }
  }, [
    chartName,
    id,
    isVertical,
    isTime,
    categoryKey,
    valueKey,
    valueAxisName,
    timeAxis,
    x,
    y,
    data,
    toDateTime,
    margin,
    padding,
    drawing,
    classNames,
    shape,
    valueConfig.start,
    valueConfig.end,
    width,
    height,
  ]);

  useEffect(() => {
    if (!measured) return;
    refreshChart();
    // Hold the node: on unmount the cleanup runs after the svg has left the
    // document, so interrupt through this reference, not a lookup by id.
    const node = svgRef.current;
    return () => {
      interruptTransitions(node);
    };
    // A style/className size change reaches refreshChart through useChartSize.
  }, [refreshChart, measured]);

  return (
    <svg
      ref={svgRef}
      id={id}
      data-testid='lollipop-chart'
      style={style}
      className={twMerge(defaultChartClassNames, className)}
    />
  );
};

/* catalog:start */
/**
 * Vertical stems ending in a symbol, marking one value per category with far
 * less ink than a bar or column. Set `orientation="horizontal"` for long
 * category labels.
 *
 * @remarks
 *
 * **Use when**
 * - A bar or column chart would look heavy but the value point should stay
 *   visible
 * - The exact value point matters more than the magnitude-as-area a bar
 *   implies
 * - Category labels are long or there are many categories — set
 *   `orientation="horizontal"`
 *
 * **Avoid when**
 * - Several measures need comparing per category — a lollipop carries one
 *   value; use BarChart or ColumnChart
 * - The magnitude should read as accumulated quantity — bars encode that
 *   better
 * - The axis is dense continuous time and the trend matters more than
 *   individual values — use LineChart; for a modest number of dated values
 *   use the time-scaled variant (`x.scalingFunction: "time"`)
 * - Values cluster far from zero and only their differences matter — a
 *   zero-based stem hides them; use RangePlot/ScatterPlot or pin `start`
 *
 * **Specialised types**
 * - Horizontal lollipop chart — Set `orientation="horizontal"`; categories
 *   go on `y` and values on `x`. `LollipopHChart` is a deprecated alias for
 *   this form.
 * - Time-scaled lollipop chart — Set `x.scalingFunction: "time"` with
 *   `x.time.format`, or `x.time.isISO` for ISO strings. There is no bar
 *   width to derive — `x.time.barWidth` is not used by this chart. ISO dates
 *   are read, placed and labelled in UTC by default, so calendar days
 *   (`2025-01-31`) land on the right day in every time zone; set
 *   `x.time.utc: false` for the viewer's local time, or `x.time.utc: true`
 *   to read `x.time.format` strings in UTC.
 *
 * Also called: lollipop chart, lollipop, lollipop plot, stem plot, stem and dot chart, vertical lollipop chart.
 *
 * Wrapper components: `LollipopHChart` (`orientation="horizontal"`,
 * deprecated), `LollipopVChart` (`orientation="vertical"`, deprecated). Prefer
 * `<LollipopChart>` with the prop set in new code. `LollipopHChart` and
 * `LollipopVChart` are deprecated and will be removed in 0.4.0.
 *
 * Answers: comparison, ranking. Required props: `id`, `data`, `x`, `y`.
 *
 * @example
 * ```tsx
 * <LollipopChart
 *   id="readings-by-name"
 *   className="w-full h-64"
 *   data={data}
 *   x={{ key: 'name', axis: { location: 'bottom' } }}
 *   y={{ key: 'reading', start: 0, axis: { location: 'left' } }}
 * />
 * ```
 *
 * @example Horizontal lollipop chart
 * ```tsx
 * <LollipopChart
 *   id="scores-by-team"
 *   className="w-full h-64"
 *   orientation="horizontal"
 *   data={data}
 *   y={{ key: 'name' }}
 *   x={{ key: 'value', start: 0 }}
 * />
 * ```
 *
 * @example Time-scaled lollipop chart
 * ```tsx
 * <LollipopChart
 *   id="weekly-readings"
 *   className="w-full h-64"
 *   data={data}
 *   x={{ key: 'date', scalingFunction: 'time', time: { isISO: true, utc: true } }}
 *   y={{ key: 'reading', start: 0 }}
 * />
 * ```
 *
 * @see BarChart — multiple measures per category, or magnitude should
 *   read as area
 * @see RangePlot — each category has an interval rather than a single
 *   value
 * @see ScatterPlot — both axes are numeric rather than one being
 *   categorical
 */
/* catalog:end */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
const LollipopChart = <TData = any,>(props: LollipopChartProps<TData>) => (
  <LollipopRenderer<TData> {...props} chartName='LollipopChart' />
);

export default LollipopChart;

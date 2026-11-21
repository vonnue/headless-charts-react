import { ZoomTransform, zoom, zoomIdentity } from 'd3-zoom';
import { max, min } from 'd3-array';
import { scaleBand, scaleLinear, type ScaleTime } from 'd3-scale';
import { select, type Selection } from 'd3-selection';
import 'd3-transition';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type CSSProperties,
} from 'react';
import { twMerge } from 'tailwind-merge';

import useTooltip, { type UseTooltipResult } from '@/hooks/useTooltip';
import useAxis from '@/hooks/useAxis';
import useChartSize from '@/hooks/useChartSize';
import type {
  AxisConfig,
  ChartOrientation,
  ChartProps,
  TooltipConfig,
} from '@/types';
import { defaultChartClassNames, binDataStats } from '@/utils';
import { resolveBound } from '@/utils/domain';
import { interruptTransitions } from '@/utils/interruptTransitions';
import {
  orientationMessages,
  otherOrientation,
  resolveOrientation,
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
import {
  boxPlotEvidence,
  getBinValueKey,
  resolveValueConfig,
  toBinnedRows,
  useBoxPlotConfigWarnings,
  type BoxPlotBinnedCategoryConfig,
  type BoxPlotBinnedValueConfig,
  type BoxPlotChartName,
  type BoxPlotClassNames,
  type BoxPlotValueConfig,
} from '../boxPlotConfig';

export type { BoxPlotClassNames } from '../boxPlotConfig';

interface BoxPlotBaseProps<TData> extends ChartProps<TData> {
  data: TData[];
  classNames?: BoxPlotClassNames;
  tooltip?: TooltipConfig;
}

/** Vertical (default): groups on x, statistics on y. */
export interface BoxPlotVerticalSummaryProps<TData = unknown>
  extends BoxPlotBaseProps<TData> {
  orientation?: 'vertical';
  x: AxisConfig<TData>;
  y: BoxPlotValueConfig<TData>;
  /** Only takes effect together with `x.bin` */
  valueKey?: string;
}

/**
 * Vertical binned mode: `x.bin` groups the raw rows and `valueKey` names the
 * field to summarise. The stat keys on `y` are computed, so may be omitted.
 */
export interface BoxPlotVerticalBinnedProps<TData = unknown>
  extends BoxPlotBaseProps<TData> {
  orientation?: 'vertical';
  x: BoxPlotBinnedCategoryConfig<TData>;
  y: BoxPlotBinnedValueConfig<TData>;
  /** The continuous value field to compute box stats from */
  valueKey: string;
}

/** Horizontal: groups on y, statistics on x. */
export interface BoxPlotHorizontalSummaryProps<TData = unknown>
  extends BoxPlotBaseProps<TData> {
  orientation?: 'horizontal';
  y: AxisConfig<TData>;
  x: BoxPlotValueConfig<TData>;
  /** Only takes effect together with `y.bin` */
  valueKey?: string;
}

/**
 * Horizontal binned mode: `y.bin` groups the raw rows and `valueKey` names
 * the field to summarise. The stat keys on `x` are computed, so may be omitted.
 */
export interface BoxPlotHorizontalBinnedProps<TData = unknown>
  extends BoxPlotBaseProps<TData> {
  orientation?: 'horizontal';
  y: BoxPlotBinnedCategoryConfig<TData>;
  x: BoxPlotBinnedValueConfig<TData>;
  /** The continuous value field to compute box stats from */
  valueKey: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
export type BoxPlotProps<TData = any> =
  | BoxPlotVerticalSummaryProps<TData>
  | BoxPlotVerticalBinnedProps<TData>
  | BoxPlotHorizontalSummaryProps<TData>
  | BoxPlotHorizontalBinnedProps<TData>;

/**
 * Wrapper props: identical to today's, plus `orientation` limited to the wrapper's own value.
 * @deprecated Use {@link BoxPlotProps} with `orientation="vertical"`. Will be removed in the next breaking release.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
export type BoxPlotVProps<TData = any> =
  | BoxPlotVerticalSummaryProps<TData>
  | BoxPlotVerticalBinnedProps<TData>;
/**
 * Wrapper props: identical to today's, plus `orientation` limited to the wrapper's own value.
 * @deprecated Use {@link BoxPlotProps} with `orientation="horizontal"`. Will be removed in the next breaking release.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
export type BoxPlotHProps<TData = any> =
  | BoxPlotHorizontalSummaryProps<TData>
  | BoxPlotHorizontalBinnedProps<TData>;

/** Set by the public component or a wrapper; not part of the public props. */
interface BoxPlotRendererProps {
  /** The component the caller rendered, for warnings */
  chartName: BoxPlotChartName;
  /** Orientation a wrapper pins */
  pinned?: ChartOrientation;
}

type Row = Record<string, unknown>;
type Accessor = (d: Row) => number;
type Setter = (name: string, value: Accessor) => void;
type Geometry = (set: Setter) => void;
type TooltipHandlers = Pick<
  UseTooltipResult,
  'onMouseOver' | 'onMouseMove' | 'onMouseLeave'
>;

const DEFAULT_MARGIN = { top: 40, bottom: 40, left: 40, right: 20 };
const DEFAULT_PADDING = { top: 0, bottom: 0, left: 0, right: 0, bar: 0.2 };
const DEFAULT_DRAWING: NonNullable<ChartProps['drawing']> = { duration: 0 };
const DEFAULT_ZOOMING: NonNullable<ChartProps['zooming']> = { enabled: false };
const DEFAULT_STYLE: CSSProperties = {};
/** Stand-in for useTimeAxisWarnings when the category axis is not a time axis */
const NO_TIME_AXIS: AxisConfig = { key: '' };
/** Box value extent drawn beyond the plot on each value-axis end */
const CLIP_INSET = 10;

const num = (d: Row, key: string): number => Number(d[key]);

const formatStat = (value: unknown): string => {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(0) : 'n/a';
};

/**
 * The shared renderer behind `BoxPlot`, `BoxPlotH` and `BoxPlotV`.
 * @internal Use one of the exported components.
 */
export const BoxPlotRenderer = <TData,>(
  props: BoxPlotProps<TData> & BoxPlotRendererProps,
) => {
  const {
    chartName,
    pinned,
    className,
    classNames,
    data,
    id,
    margin = DEFAULT_MARGIN,
    padding = DEFAULT_PADDING,
    x,
    y,
    tooltip,
    valueKey,
    zooming = DEFAULT_ZOOMING,
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
  // One zoom behaviour per chart, re-configured on each redraw: a wheel
  // gesture still in progress across a redraw then reports to the current
  // handler (and the current marks), not to a discarded one.
  const zoomRef = useRef(zoom<SVGSVGElement, unknown>());

  const evidence = boxPlotEvidence(x, y);
  const resolution = resolveOrientation({
    pinned,
    given: givenOrientation,
    evidence,
  });
  const orientation = resolution.orientation;
  const isVertical = orientation === 'vertical';
  const mismatchClause = resolution.mismatch?.clause;
  const mismatch = mismatchClause !== undefined;
  const ignoredGiven = resolution.ignoredGiven;

  // x and y are spatial: the category axis is x when vertical, y when horizontal.
  const categoryConfig = (isVertical ? x : y) as AxisConfig<TData>;
  const valueConfig = (isVertical ? y : x) as BoxPlotBinnedValueConfig<TData>;
  // Only read in vertical time mode, where x is the category axis.
  const timeAxis = x as AxisConfig<TData>;
  const timeRequested = categoryConfig.scalingFunction === 'time';
  // Time scaling is vertical only; binning is ignored on a time axis.
  const isTime = isVertical && timeRequested && !mismatch;
  const binValueKey = isTime
    ? undefined
    : getBinValueKey(categoryConfig, valueKey);
  const isBinned = binValueKey !== undefined;

  useEffect(() => {
    warnOrientationResolution(chartName, 'BoxPlot', id, {
      orientation,
      ignoredGiven,
      mismatch: mismatchClause
        ? { orientation: otherOrientation(orientation), clause: mismatchClause }
        : undefined,
    });
    if (!isVertical && timeRequested && !mismatch) {
      warnOrientation(
        chartName,
        id,
        'time-ignored',
        orientationMessages.timeIgnored(),
      );
    }
  }, [
    chartName,
    id,
    orientation,
    isVertical,
    ignoredGiven,
    mismatch,
    mismatchClause,
    timeRequested,
  ]);

  useBoxPlotConfigWarnings(chartName, id, {
    data,
    categoryConfig,
    valueConfig,
    valueKey,
    timeMode: isTime,
    disabled: mismatch,
  });
  useTimeAxisWarnings(chartName, id, data, isTime ? timeAxis : NO_TIME_AXIS);

  // Keyed on the fields the parser reads, so an inline `x` object literal
  // doesn't rebuild the accessor on every render.
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

  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: (d: Row) => {
      const resolved = resolveValueConfig(valueConfig, isBinned);
      if (!resolved) return '';
      const date = isTime ? toDateTime(d) : null;
      return `${date ? `${formatDate(date)} <br/> ` : ''}min: ${formatStat(
        d[resolved.minKey],
      )} <br/> range: ${formatStat(d[resolved.boxStart])} to ${formatStat(
        d[resolved.boxEnd],
      )} <br/> mid: ${formatStat(d[resolved.midKey])} <br/> max: ${formatStat(
        d[resolved.maxKey],
      )}`;
    },
  });

  // The hook's handlers are new each render but read the latest config, so
  // the d3 listeners call them through a ref instead of making them redraw
  // deps: a new `tooltip` object doesn't redraw or rebind.
  const tooltipHandlers = useRef<TooltipHandlers | null>(null);
  useLayoutEffect(() => {
    tooltipHandlers.current = { onMouseOver, onMouseMove, onMouseLeave };
  });

  const { drawAxis } = useAxis();

  const refreshChart = useCallback(() => {
    const svgNode = svgRef.current;
    if (!svgNode) return;
    const svg = select(svgNode);
    interruptTransitions(svgNode);
    svg.on('.zoom', null);
    // d3-zoom keeps the last transform on the node (`__zoom`) and a re-bound
    // zoom behaviour resumes from it. The marks are redrawn unzoomed, so reset
    // it too, or the first zoom after a redraw jumps to the stale transform.
    svg.property('__zoom', zoomIdentity);
    svg.selectAll('*').remove();

    // The configs describe the other orientation: draw nothing (warned).
    if (mismatch) return;

    const effectiveValue = resolveValueConfig(valueConfig, isBinned);
    // Only reachable when the props types are bypassed: nothing to draw
    if (!effectiveValue) return;

    const catKey = categoryConfig.key;
    const rows: Row[] =
      binValueKey !== undefined
        ? toBinnedRows(binDataStats(data, categoryConfig, binValueKey), catKey)
        : isTime
          ? // rows without a readable date are not drawn (dev warning from
            // useTimeAxisWarnings)
            (data as Row[]).filter((d) => toDateTime(d) != null)
          : (data as Row[]);

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
    const paddingBar = padding.bar ?? 0.2;

    const horizontalRange: [number, number] = [
      m.left + p.left,
      width - m.right - p.right,
    ];
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

    // Category scale: a band per row, or (vertical time mode) a time layout
    // that positions the boxes and draws the axis, so boxes sit on ticks.
    let categoryScale: ReturnType<typeof scaleBand<string>> | ScaleTime<number, number>;
    let bandStart: Accessor;
    let bandSize: number;
    if (isTime) {
      const layout = createTimeBarLayout(
        rows,
        timeAxis,
        toDateTime,
        categoryRange,
        paddingBar,
        timeAxis.time?.barWidth,
      );
      warnIfBarWidthCapped(chartName, id, layout);
      categoryScale = layout.scale;
      bandSize = layout.width;
      const timeX = timePosition(layout.scale, toDateTime);
      bandStart = (d) => timeX(d) - bandSize / 2;
    } else {
      const band = scaleBand<string>()
        .domain(rows.map((d) => d[catKey] as string))
        .range(categoryRange)
        .padding(paddingBar);
      categoryScale = band;
      bandSize = band.bandwidth();
      bandStart = (d) => band(d[catKey] as string) ?? 0;
    }
    const bandCentre: Accessor = (d) => bandStart(d) + bandSize / 2;
    const bandEnd: Accessor = (d) => bandStart(d) + bandSize;

    const { minKey, maxKey, boxStart, boxEnd, midKey } = effectiveValue;
    // start, then the legacy min, then the data; 0 is a real bound.
    const dataMin = min(rows, (d) => num(d, minKey));
    const dataMax = max(rows, (d) => num(d, maxKey));
    const lo = resolveBound(
      effectiveValue.start,
      resolveBound(effectiveValue.min, dataMin),
    );
    const hi = resolveBound(
      effectiveValue.end,
      resolveBound(effectiveValue.max, dataMax),
    );
    const valueScale = scaleLinear()
      .domain([lo ?? hi ?? 0, hi ?? lo ?? 1])
      .range(valueRange);
    const v = (key: string): Accessor => (d) => valueScale(num(d, key));

    // Geometry in (category, value) terms, mapped onto x/y by orientation.
    const lineAt =
      (c1: Accessor, v1: Accessor, c2: Accessor, v2: Accessor): Geometry =>
      (set) => {
        set(isVertical ? 'x1' : 'y1', c1);
        set(isVertical ? 'x2' : 'y2', c2);
        set(isVertical ? 'y1' : 'x1', v1);
        set(isVertical ? 'y2' : 'x2', v2);
      };
    const rectAt =
      (cPos: Accessor, cSize: Accessor, vPos: Accessor, vSize: Accessor): Geometry =>
      (set) => {
        set(isVertical ? 'x' : 'y', cPos);
        set(isVertical ? 'width' : 'height', cSize);
        set(isVertical ? 'y' : 'x', vPos);
        set(isVertical ? 'height' : 'width', vSize);
      };
    const valueLow = (a: string, b: string): Accessor => (d) =>
      Math.min(v(a)(d), v(b)(d));
    const valueSpan = (a: string, b: string): Accessor => (d) =>
      Math.abs(v(a)(d) - v(b)(d));
    const constant =
      (n: number): Accessor =>
      () =>
        n;

    const valueLo = Math.min(...valueRange);
    const valueHi = Math.max(...valueRange);
    const catLo = Math.min(...categoryRange);
    const catHi = Math.max(...categoryRange);

    const clipId = `${id}-plot-clip`;
    const clipRect = svg.append('clipPath').attr('id', clipId).append('rect');
    rectAt(
      constant(catLo),
      constant(catHi - catLo),
      constant(valueLo - CLIP_INSET),
      constant(valueHi - valueLo + 2 * CLIP_INSET),
    )((name, value) => clipRect.attr(name, value({})));

    const g = svg.append('g');
    const dataG = g
      .append('g')
      .attr('class', 'data')
      .attr('clip-path', `url(#${clipId})`);

    const handlers = {
      over: (event: unknown, d: unknown) =>
        tooltipHandlers.current?.onMouseOver(event, d),
      move: (event: unknown, d: unknown) =>
        tooltipHandlers.current?.onMouseMove(event, d),
      leave: () => tooltipHandlers.current?.onMouseLeave(),
    };

    const classNameMap = effectiveValue.classNameMap;
    const rowsG = dataG
      .selectAll<SVGGElement, Row>('g')
      .data(rows)
      .enter()
      .append('g')
      .attr('class', (d) =>
        twMerge('box-plot-group', classNameMap?.[String(d[catKey])]),
      )
      .attr('data-category', (d) => String(d[catKey]))
      .on('mouseenter', handlers.over)
      .on('mousemove', handlers.move)
      .on('mouseleave', handlers.leave);

    // A row with a non-finite statistic keeps its group (and hit rect, so
    // its tooltip still shows `n/a`) but draws no marks.
    const statKeys = [minKey, maxKey, boxStart, boxEnd, midKey];
    const drawable = rowsG.filter((d) =>
      statKeys.every((k) => Number.isFinite(num(d, k))),
    );

    const duration = drawing.duration ?? 0;
    const animate = Number.isFinite(duration) && duration > 0;
    const rowIndex = new Map(rows.map((d, i) => [d, i]));
    const stagger = drawing.delay ?? 0;
    const delayOf = (d: Row) => (rowIndex.get(d) ?? 0) * stagger;

    const draw = (
      el: Selection<SVGElement, Row, SVGGElement, unknown>,
      initial: Geometry,
      final: Geometry,
    ) => {
      if (!animate) {
        final((name, value) => el.attr(name, value));
        return;
      }
      initial((name, value) => el.attr(name, value));
      const t = el.transition().duration(duration).delay(delayOf);
      final((name, value) => t.attr(name, value));
    };
    const append = (tag: 'line' | 'rect', testId: string, cls: (d: Row) => string) =>
      drawable
        .append<SVGElement>(tag)
        .attr('data-testid', testId)
        .attr('class', cls);

    const lineClass = () => twMerge('box-plot-line stroke-current', classNames?.lines);

    // 1. Whisker: grows from min to max along the band centre.
    draw(
      append('line', 'box-plot-whisker', lineClass),
      lineAt(bandCentre, v(minKey), bandCentre, v(minKey)),
      lineAt(bandCentre, v(minKey), bandCentre, v(maxKey)),
    );
    // 2. Min cap: sweeps across the band from its start edge.
    draw(
      append('line', 'box-plot-cap-min', lineClass),
      lineAt(bandStart, v(minKey), bandStart, v(minKey)),
      lineAt(bandStart, v(minKey), bandEnd, v(minKey)),
    );
    // 3. Box: band position final at once; value extent grows from the median.
    draw(
      append('rect', 'box-plot-box', (d) =>
        twMerge(
          'box-plot-box stroke-current fill-current opacity-50',
          typeof d.className === 'string' ? d.className : undefined,
          classNames?.boxes,
        ),
      ),
      rectAt(bandStart, constant(bandSize), v(midKey), constant(0)),
      rectAt(
        bandStart,
        constant(bandSize),
        valueLow(boxStart, boxEnd),
        valueSpan(boxStart, boxEnd),
      ),
    );
    // 4. Median and 5. max cap: expand from the band centre.
    draw(
      append('line', 'box-plot-median', () =>
        twMerge('box-plot-line stroke-current', classNames?.data),
      ),
      lineAt(bandCentre, v(midKey), bandCentre, v(midKey)),
      lineAt(bandStart, v(midKey), bandEnd, v(midKey)),
    );
    draw(
      append('line', 'box-plot-cap-max', lineClass),
      lineAt(bandCentre, v(maxKey), bandCentre, v(maxKey)),
      lineAt(bandStart, v(maxKey), bandEnd, v(maxKey)),
    );

    // Transparent hit layer above the marks: the full band x the full value
    // range per row, so thin, zero-length and clipped marks stay hoverable.
    const hitsG = g.append('g').attr('class', 'hits');
    const hits = hitsG
      .selectAll<SVGRectElement, Row>('rect')
      .data(rows)
      .enter()
      .append('rect')
      .attr('data-testid', 'box-plot-hit')
      .attr('fill', 'transparent')
      .on('mouseenter', handlers.over)
      .on('mousemove', handlers.move)
      .on('mouseleave', handlers.leave);
    rectAt(
      bandStart,
      constant(bandSize),
      constant(valueLo),
      constant(valueHi - valueLo),
    )((name, value) => hits.attr(name, value));

    // Axes: y first, then x, as both legacy components drew them.
    // Narrow the band/time union so each drawAxis call gets one domain type.
    const yAxisOptions = {
      g,
      config: y,
      dimensions: { width, height },
      margin,
      padding,
      orientation: 'vertical' as const,
      className: 'yAxis axis',
    };
    const xAxisOptions = {
      g,
      config: x,
      dimensions: { width, height },
      margin,
      padding,
      orientation: 'horizontal' as const,
      className: 'axis--x axis',
    };
    // The value axis is always linear; the category axis is band or time.
    // Assign valueAxis inside each branch so zoom does not see a union.
    let valueAxis;
    if (isVertical) {
      valueAxis = drawAxis({ ...yAxisOptions, scale: valueScale });
      if ('bandwidth' in categoryScale) {
        drawAxis({ ...xAxisOptions, scale: categoryScale });
      } else {
        drawAxis({ ...xAxisOptions, scale: categoryScale });
      }
    } else {
      if ('bandwidth' in categoryScale) {
        drawAxis({ ...yAxisOptions, scale: categoryScale });
      } else {
        drawAxis({ ...yAxisOptions, scale: categoryScale });
      }
      valueAxis = drawAxis({ ...xAxisOptions, scale: valueScale });
    }

    if (zooming?.enabled) {
      // Zoom scales along the value axis only.
      const zoomed = ({ transform }: { transform: ZoomTransform }) => {
        const t = isVertical
          ? `translate(0, ${transform.y}) scale(1, ${transform.k})`
          : `translate(${transform.x}, 0) scale(${transform.k}, 1)`;
        rowsG.attr('transform', t);
        hitsG.attr('transform', t);
        valueAxis.axisG.call(
          valueAxis.axis.scale(
            isVertical
              ? transform.rescaleY(valueScale)
              : transform.rescaleX(valueScale),
          ),
        );
      };
      const zoomFn = zoomRef.current
        .extent([
          [0, 0],
          [width, height],
        ])
        .scaleExtent([zooming.min || 1, zooming.max || 2])
        .translateExtent([
          [0, 0],
          [width, height],
        ])
        .on('zoom', zoomed);
      svg.call(zoomFn);
    }
  }, [
    width,
    height,
    chartName,
    id,
    mismatch,
    isVertical,
    isTime,
    isBinned,
    binValueKey,
    categoryConfig,
    valueConfig,
    timeAxis,
    x,
    y,
    data,
    toDateTime,
    margin,
    padding,
    drawing,
    zooming,
    classNames,
    drawAxis,
  ]);

  useEffect(() => {
    if (!measured) return;
    // A style/className size change reaches refreshChart through useChartSize.
    refreshChart();
    // Hold the node: on unmount the cleanup runs after the svg has left the
    // document, so interrupt through this reference, not a lookup by id.
    const node = svgRef.current;
    return () => {
      interruptTransitions(node);
    };
    // style is not read by refreshChart, but it sets the size it measures.
  }, [refreshChart, measured]);

  return (
    <svg
      ref={svgRef}
      id={id}
      data-testid='box-plot'
      style={style}
      className={twMerge(defaultChartClassNames, className || '')}
    />
  );
};

/* catalog:start */
/**
 * Box-and-whisker marks summarising the spread of a measure per group — min,
 * quartiles, median and max — drawn vertically by default or horizontally with
 * `orientation="horizontal"`.
 *
 * @remarks
 *
 * **Use when**
 * - The spread of a measure needs comparing across groups, not just its
 *   average
 * - Median and quartiles matter — skew and outliers would make a mean alone
 *   mislead
 * - Groups are ordered periods and the change in spread over them is the
 *   message
 * - Group labels are long or there are many groups — set
 *   `orientation="horizontal"`
 * - Statistics should be derived from raw rows — set `bin` on the category
 *   axis with `valueKey`
 *
 * **Avoid when**
 * - Every underlying point should be visible — use ScatterPlot
 * - The interval is a plain min–max rather than a statistical summary — use
 *   RangePlot
 * - The audience will not read quartiles; a histogram via ColumnChart with
 *   `x.bin` is more intuitive
 * - Only the central value matters — use ColumnChart
 *
 * **Specialised types**
 * - Horizontal box plot — Set `orientation="horizontal"`; groups go on `y`
 *   and statistics on `x`. `BoxPlotH` is a deprecated alias for this form.
 * - Binned box plot — Set `bin` on the category-axis config (`x` in
 *   vertical, `y` in horizontal) and pass `valueKey` naming the field to
 *   summarise. Both are needed: the statistic keys on the value axis are
 *   then computed internally and can be omitted (any given are ignored).
 *   `bin` without `valueKey` is ignored, and the value axis still needs
 *   `minKey`, `maxKey`, `boxStart`, `boxEnd` and `midKey`. Use
 *   `bin.thresholds` for explicit band edges.
 * - Time-scaled box plot — Vertical only. Set `x.scalingFunction: "time"`
 *   with `x.time.format`, or `x.time.isISO` for ISO strings. Box width comes
 *   from the median gap between dates (one slot per step); `x.time.barWidth`
 *   (positive pixels) overrides it but is capped at one slot, so it can
 *   narrow boxes but never widen them past their slot. ISO dates are read,
 *   placed and labelled in UTC by default, so calendar days (`2025-01-31`)
 *   land on the right day in every time zone; set `x.time.utc: false` for
 *   the viewer's local time, or `x.time.utc: true` to read `x.time.format`
 *   strings in UTC. Pinned `x.start`/`x.end` (epoch ms) get no edge padding,
 *   so a box dated exactly on a pinned end is centred on the plot edge and
 *   overhangs it by half a box; to keep edge marks inside, pin half a step
 *   outside the data (e.g. `start: Date.UTC(2025, 0, 1) - 12 * 3600_000` for
 *   daily data starting 1 Jan 2025). With `orientation="horizontal"`,
 *   `y.scalingFunction: "time"` is ignored with a dev warning.
 *
 * Also called: box plot, box and whisker plot, box and whisker chart, box chart, quartile plot, vertical box plot.
 *
 * Wrapper components: `BoxPlotH` (`orientation="horizontal"`, deprecated),
 * `BoxPlotV` (`orientation="vertical"`, deprecated). Prefer `<BoxPlot>` with
 * the prop set in new code. `BoxPlotH` and `BoxPlotV` are deprecated and will
 * be removed in the next breaking release.
 *
 * Answers: distribution, range. Required props: `id`, `data`, `x`, `y`.
 *
 * @example
 * ```tsx
 * <BoxPlot
 *   id="salary-by-band"
 *   className="w-full h-64"
 *   data={data}
 *   x={{ key: 'name' }}
 *   y={{
 *     minKey: 'min',
 *     maxKey: 'max',
 *     midKey: 'mid',
 *     boxStart: 'firstQuartile',
 *     boxEnd: 'lastQuartile',
 *     start: 0,
 *   }}
 * />
 * ```
 *
 * @example Horizontal box plot
 * ```tsx
 * <BoxPlot
 *   id="scores-by-team"
 *   className="w-full h-64"
 *   orientation="horizontal"
 *   data={data}
 *   y={{ key: 'name' }}
 *   x={{
 *     minKey: 'min',
 *     maxKey: 'max',
 *     midKey: 'mid',
 *     boxStart: 'firstQuartile',
 *     boxEnd: 'lastQuartile',
 *     start: 0,
 *   }}
 * />
 * ```
 *
 * @example Binned box plot
 * ```tsx
 * <BoxPlot
 *   id="salary-by-age"
 *   className="w-full h-64"
 *   data={rawRows}
 *   valueKey="salary"
 *   x={{ key: 'age', bin: { count: 5 }, axis: { label: 'Age Group' } }}
 *   y={{ start: 0, axis: { label: 'Salary' } }}
 * />
 * ```
 *
 * @example Time-scaled box plot
 * ```tsx
 * <BoxPlot
 *   id="weekly-latency-spread"
 *   className="w-full h-64"
 *   data={data}
 *   x={{ key: 'weekStart', scalingFunction: 'time', time: { isISO: true, utc: true } }}
 *   y={{
 *     minKey: 'min',
 *     maxKey: 'max',
 *     midKey: 'mid',
 *     boxStart: 'firstQuartile',
 *     boxEnd: 'lastQuartile',
 *     start: 0,
 *   }}
 * />
 * ```
 *
 * @see RangePlot — showing a plain min–max interval rather than quartiles
 * @see ScatterPlot — individual records should stay visible
 * @see ColumnChart — a histogram of one group is enough — set `x.bin`
 */
/* catalog:end */
const BoxPlot = <TData = any,>(props: BoxPlotProps<TData>) => ( // eslint-disable-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
  <BoxPlotRenderer<TData> {...props} chartName='BoxPlot' />
);

export default BoxPlot;

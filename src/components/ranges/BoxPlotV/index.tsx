import { ZoomTransform, zoom } from 'd3-zoom';
import { max, min } from 'd3-array';
import {
  scaleBand,
  scaleLinear,
  type ScaleBand,
  type ScaleTime,
} from 'd3-scale';
import { select } from 'd3-selection';
import useTooltip from '@/hooks/useTooltip';
import useAxis from '@/hooks/useAxis';

import { AxisConfig, ChartProps, TooltipConfig } from '@/types';
import { useCallback, useEffect, useMemo } from 'react';
import { defaultChartClassNames, binDataStats } from '@/utils';
import {
  createTimeBarLayout,
  makeDateAccessor,
  makeDateFormatter,
  useTimeAxisWarnings,
} from '@/utils/timeScale';
import { transition } from 'd3-transition';
import { twMerge } from 'tailwind-merge';
import {
  BoxPlotBinnedCategoryConfig,
  BoxPlotBinnedValueConfig,
  BoxPlotValueConfig,
  getBinValueKey,
  resolveValueConfig,
  toBinnedRows,
  useBoxPlotConfigWarnings,
} from '../boxPlotConfig';

export interface BoxPlotClassNames {
  boxes?: string;
  lines?: string;
  data?: string;
}

interface BoxPlotVBaseProps<TData> extends ChartProps<TData> {
  data: TData[];
  classNames?: BoxPlotClassNames;
  tooltip?: TooltipConfig;
}

/** Summary mode: each row already carries the statistics named on `y`. */
export interface BoxPlotVSummaryProps<TData = unknown> extends BoxPlotVBaseProps<TData> {
  y: BoxPlotValueConfig<TData>;
  x: AxisConfig<TData>;
  /** Only takes effect together with `x.bin` (see binned mode) */
  valueKey?: string;
}

/**
 * Binned mode: `x.bin` groups the raw rows and `valueKey` names the field to
 * summarise. Statistics are computed internally, so the stat keys on `y`
 * may be omitted (any that are given are ignored).
 */
export interface BoxPlotVBinnedProps<TData = unknown> extends BoxPlotVBaseProps<TData> {
  y: BoxPlotBinnedValueConfig<TData>;
  x: BoxPlotBinnedCategoryConfig<TData>;
  /** The continuous value field to compute box stats from */
  valueKey: string;
}

export type BoxPlotVProps<TData = any> =
  | BoxPlotVSummaryProps<TData>
  | BoxPlotVBinnedProps<TData>;

/* catalog:start */
/**
 * Vertical box-and-whisker marks summarising the spread of a measure per
 * group: min, quartiles, median and max.
 *
 * @remarks
 *
 * **Use when**
 * - The spread of a measure needs comparing across a few groups with short
 *   labels
 * - Skew and outliers matter, so a mean alone would mislead
 * - Groups are ordered periods and the change in spread over them is the
 *   message
 * - Statistics should be derived from raw rows — set `x.bin` with `valueKey`
 *
 * **Avoid when**
 * - Every underlying point should be visible — use ScatterPlot
 * - The interval is a plain min–max — use RangePlot
 * - Group labels are long — use BoxPlotH
 * - Only the central value matters — use ColumnChart
 *
 * **Specialised types**
 * - Binned box plot (vertical) — Set `bin` on the `x` (category) config and
 *   pass `valueKey` naming the field to summarise. Both are needed: the
 *   statistic keys on `y` are then computed internally and can be omitted
 *   (any given are ignored). `bin` without `valueKey` is ignored, and `y`
 *   still needs `minKey`, `maxKey`, `boxStart`, `boxEnd` and `midKey`. Use
 *   `bin.thresholds` for explicit band edges.
 * - Time-scaled box plot (vertical) — Set `x.scalingFunction: "time"` with
 *   `x.time.format`, or `x.time.isISO` for ISO strings. Box width is
 *   inferred from the data's date cadence; override with `x.time.barWidth`
 *   (pixels).
 *
 * Also called: vertical box plot, box and whisker chart, box chart.
 *
 * Answers: distribution, range. Required props: `id`, `data`, `x`, `y`.
 *
 * @example
 * ```tsx
 * <BoxPlotV
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
 *     min: 0,
 *   }}
 * />
 * ```
 *
 * @example Binned box plot (vertical)
 * ```tsx
 * <BoxPlotV
 *   id="salary-by-age"
 *   className="w-full h-64"
 *   data={rawRows}
 *   valueKey="salary"
 *   x={{ key: 'age', bin: { count: 5 }, axis: { label: 'Age Group' } }}
 *   y={{ min: 0, axis: { label: 'Salary' } }}
 * />
 * ```
 *
 * @example Time-scaled box plot (vertical)
 * ```tsx
 * <BoxPlotV
 *   id="weekly-latency-spread"
 *   className="w-full h-64"
 *   data={data}
 *   x={{ key: 'weekStart', scalingFunction: 'time', time: { isISO: true } }}
 *   y={{
 *     minKey: 'min',
 *     maxKey: 'max',
 *     midKey: 'mid',
 *     boxStart: 'firstQuartile',
 *     boxEnd: 'lastQuartile',
 *     min: 0,
 *   }}
 * />
 * ```
 *
 * @see BoxPlotH — group labels are long
 * @see RangePlot — showing a plain min–max interval rather than quartiles
 * @see ScatterPlot — individual records should stay visible
 */
/* catalog:end */
const BoxPlotV = <TData = any,>({
  className,
  classNames,
  data,
  id,
  margin = {
    top: 40,
    bottom: 40,
    left: 40,
    right: 20,
  },
  padding = {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    bar: 0.2,
  },
  x,
  tooltip,
  y,
  valueKey,
  zooming = {
    enabled: false,
  },
  style = {},
}: BoxPlotVProps<TData>) => {
  // Same predicate as the props union: `x.bin` set and `valueKey` a string.
  // Binning is ignored on a time axis: bin labels aren't dates.
  const isTimeX = x.scalingFunction === 'time';
  const binValueKey = isTimeX ? undefined : getBinValueKey(x, valueKey);
  const isBinned = binValueKey !== undefined;
  useBoxPlotConfigWarnings('BoxPlotV', id, {
    data,
    categoryConfig: x,
    valueConfig: y,
    valueKey,
    timeMode: isTimeX,
  });
  useTimeAxisWarnings('BoxPlotV', id, data, x);
  const toDateTime = useMemo(() => makeDateAccessor<TData>(x), [x]);
  const formatDate = makeDateFormatter(x);
  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: (d: any) => {
      const resolved = resolveValueConfig(y, isBinned);
      if (!resolved) return '';
      const {
        minKey: mk,
        maxKey: xk,
        boxStart: bs,
        boxEnd: be,
        midKey: md,
      } = resolved;
      const date = isTimeX ? toDateTime(d) : null;
      return `${date ? `${formatDate(date)} <br/> ` : ''}min: ${d[mk].toFixed(0)} <br/> range: ${+d[bs].toFixed(
        0
      )} to ${+d[be].toFixed(0)} <br/> mid: ${d[md].toFixed(
        0
      )} <br/> max: ${d[xk].toFixed(0)} `;
    },
  });
  const { drawAxis } = useAxis();

  const refreshChart = useCallback(() => {
    const svg = select(`#${id}`);
    svg.selectAll('*').remove();

    const width = +svg.style('width').split('px')[0],
      height = +svg.style('height').split('px')[0];

    const g = svg.append('g');

    // When binning is active, compute box stats from raw data
    const effectiveY = resolveValueConfig(y, isBinned);
    // Only reachable when the props types are bypassed: nothing to draw
    if (!effectiveY) return;
    const effectiveData: any[] =
      binValueKey !== undefined
        ? toBinnedRows(binDataStats(data, x, binValueKey), x.key)
        : isTimeX
          ? // rows without a readable date are not drawn (dev warning from
            // useTimeAxisWarnings)
            data.filter((d) => toDateTime(d) != null)
          : data;

    const paddingBarValue = padding.bar || 0.2;

    const xRange: [number, number] = [
      (margin.left ?? 0) + (padding.left || 0),
      width - (margin.right ?? 0) - (padding.right || 0),
    ];

    // In time mode one scale positions the boxes *and* draws the axis, so
    // boxes sit on their ticks; its domain is padded so edge boxes stay
    // inside (#16).
    let xFn: ScaleBand<string> | ScaleTime<number, number>;
    let boxLeft: (d: any) => number;
    let boxWidth: number;
    if (isTimeX) {
      const layout = createTimeBarLayout(
        effectiveData,
        x,
        toDateTime,
        xRange,
        paddingBarValue,
        x.time?.barWidth
      );
      const timeXFn = layout.scale;
      xFn = timeXFn;
      boxWidth = layout.width;
      boxLeft = (d) => timeXFn(toDateTime(d) as Date) - boxWidth / 2;
    } else {
      const bandXFn = scaleBand<string>()
        .domain(effectiveData.map((d: any) => d[x.key]))
        .range(xRange)
        .padding(paddingBarValue);
      xFn = bandXFn;
      boxWidth = bandXFn.bandwidth();
      boxLeft = (d) => bandXFn(d[x.key]) ?? 0;
    }
    const boxCenter = (d: any) => boxLeft(d) + boxWidth / 2;
    const boxRight = (d: any) => boxLeft(d) + boxWidth;

    const yFn = scaleLinear()
      .domain([
        Number.isFinite(effectiveY.min) ? effectiveY.min : min(effectiveData.map((d: any) => d[effectiveY.minKey])),
        Number.isFinite(effectiveY.max) ? effectiveY.max : max(effectiveData.map((d: any) => d[effectiveY.maxKey])),
      ])
      .range([
        height - (margin.bottom ?? 0) - (padding.bottom || 0),
        (padding.top || 0) + (margin.top ?? 0),
      ]);

    svg
      .append('clipPath')
      .attr('id', 'clip')
      .append('rect')
      .attr('x', margin.left ?? 0)
      .attr('y', (margin.top ?? 0) - (padding.top || 0))
      .attr('width', width)
      .attr('height', height - (margin.bottom ?? 0) - (margin.top ?? 0));

    const dataG = g
      .append('g')
      .attr('class', 'data')
      .attr('clip-path', 'url(#clip)');

    const dotRowsG = dataG
      .selectAll('g')
      .data(effectiveData)
      .enter()
      .append('g')
      .on('mouseenter', onMouseOver)
      .on('mousemove', onMouseMove)
      .on('mouseleave', onMouseLeave);

    transition();

    dotRowsG
      .append('line')
      .attr('clip-path', 'url(#clip)')
      .attr('x1', boxCenter)
      .attr('x2', boxCenter)
      .attr('y1', (d: any) => yFn(d[effectiveY.minKey]))
      .attr('y2', (d: any) => yFn(d[effectiveY.minKey]))
      .attr('class', twMerge('box-plot-line stroke-current', classNames?.data))
      .transition()
      .duration(1000)
      .attr('y2', (d: any) => yFn(d[effectiveY.maxKey]));

    // Begin lines
    dotRowsG
      .append('line')
      .attr('clip-path', 'url(#clip)')
      .attr('x1', boxLeft)
      .attr('x2', boxLeft)
      .attr('y1', (d: any) => yFn(d[effectiveY.minKey]))
      .attr('y2', (d: any) => yFn(d[effectiveY.minKey]))
      .attr('class', (d: any) =>
        twMerge('box-plot-line stroke-current', d.className || ``)
      )
      .transition()
      .duration(1000)
      .attr('x1', boxLeft)
      .attr('x2', boxRight);

    // Mid lines
    dotRowsG
      .append('line')
      .attr('clip-path', 'url(#clip)')
      .attr('y1', (d: any) => yFn(d[effectiveY.midKey]))
      .attr('y2', (d: any) => yFn(d[effectiveY.midKey]))
      .attr('x1', boxCenter)
      .attr('x2', boxCenter)
      .attr('class', twMerge('box-plot-line stroke-current', classNames?.data))
      .transition()
      .duration(1000)
      .attr('x1', boxLeft)
      .attr('x2', boxRight);

    // End lines
    dotRowsG
      .append('line')
      .attr('clip-path', 'url(#clip)')
      .attr('y1', (d: any) => yFn(d[effectiveY.maxKey]))
      .attr('y2', (d: any) => yFn(d[effectiveY.maxKey]))
      .attr('x1', boxCenter)
      .attr('x2', boxCenter)
      .attr('class', twMerge('box-plot-line stroke-current', classNames?.data))
      .transition()
      .duration(1000)
      .attr('x1', boxLeft)
      .attr('x2', boxRight);

    // Mid rects
    dotRowsG
      .append('rect')
      .attr(
        'class',
        twMerge(
          'box-plot-box stroke-current fill-current opacity-50',
          classNames?.boxes
        )
      )
      .attr('clip-path', 'url(#clip)')
      .attr('y', () => height - (margin.bottom ?? 0) - (padding.bottom || 0))
      .attr('x', boxLeft)
      .attr('width', boxWidth)
      .transition()
      .duration(1000)
      .attr('y', (d: any) => yFn(d[effectiveY.boxEnd]))
      .attr('height', (d: any) => yFn(d[effectiveY.boxStart]) - yFn(d[effectiveY.boxEnd]));

    const { axis: yAxis, axisG: yAxisG } = drawAxis({
      g,
      scale: yFn,
      config: y,
      dimensions: { width, height },
      margin,
      padding,
      orientation: 'vertical',
      className: 'yAxis axis',
    });

    drawAxis({
      g,
      scale: xFn,
      config: x,
      dimensions: { width, height },
      margin,
      padding,
      orientation: 'horizontal',
      className: 'axis--x axis',
    });

    if (zooming?.enabled) {
      const zoomed = ({ transform }: { transform: ZoomTransform }) => {
        // transform g across only y axis
        dotRowsG.attr(
          'transform',
          `translate(0, ${transform.y}) scale(1, ${transform.k})`
        );
        yAxisG.call(yAxis.scale(transform.rescaleY(yFn)));
      };

      const zoomFn: any = zoom<SVGSVGElement, unknown>()
        .scaleExtent([zooming.min || 1, zooming.max || 2])
        .translateExtent([
          [0, 0],
          [width, height],
        ])
        .on('zoom', zoomed);

      svg.call(zoomFn);
    }
  }, [
    classNames,
    data,
    id,
    isBinned,
    isTimeX,
    toDateTime,
    binValueKey,
    margin,
    padding,
    x,
    y,
    zooming,
    onMouseLeave,
    onMouseMove,
    onMouseOver,
    drawAxis,
  ]);

  useEffect(() => {
    refreshChart();
  }, [data, refreshChart]);
  return (
    <svg
      id={id}
      style={style}
      className={twMerge(defaultChartClassNames, className || '')}
    />
  );
};

export default BoxPlotV;

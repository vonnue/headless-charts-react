import { ZoomTransform, zoom } from 'd3-zoom';
import { max, min } from 'd3-array';
import { scaleBand, scaleLinear } from 'd3-scale';
// pointer,
import { select, selectAll } from 'd3-selection';
import useTooltip from '@/hooks/useTooltip';
import useAxis from '@/hooks/useAxis';

import { AxisConfig, ChartProps, TooltipConfig } from '@/types';
import { useCallback, useEffect } from 'react';
import { defaultChartClassNames, binDataStats } from '@/utils';
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

interface BoxPlotHBaseProps<TData> extends ChartProps<TData> {
  data: TData[];
  classNames?: BoxPlotClassNames;
  tooltip?: TooltipConfig;
}

/** Summary mode: each row already carries the statistics named on `x`. */
export interface BoxPlotHSummaryProps<TData = unknown> extends BoxPlotHBaseProps<TData> {
  x: BoxPlotValueConfig<TData>;
  y: AxisConfig<TData>;
  /** Only takes effect together with `y.bin` (see binned mode) */
  valueKey?: string;
}

/**
 * Binned mode: `y.bin` groups the raw rows and `valueKey` names the field to
 * summarise. Statistics are computed internally, so the stat keys on `x`
 * may be omitted (any that are given are ignored).
 */
export interface BoxPlotHBinnedProps<TData = unknown> extends BoxPlotHBaseProps<TData> {
  x: BoxPlotBinnedValueConfig<TData>;
  y: BoxPlotBinnedCategoryConfig<TData>;
  /** The continuous value field to compute box stats from */
  valueKey: string;
}

export type BoxPlotHProps<TData = any> =
  | BoxPlotHSummaryProps<TData>
  | BoxPlotHBinnedProps<TData>;

/* catalog:start */
/**
 * Horizontal box-and-whisker marks summarising the spread of a measure per
 * group: min, quartiles, median and max.
 *
 * @remarks
 *
 * **Use when**
 * - The spread of a measure needs comparing across groups, not just its
 *   average
 * - Median and quartiles matter — an average alone would hide skew
 * - Group labels are long enough to need horizontal orientation
 * - Statistics should be derived from raw rows — set `y.bin` with `valueKey`
 *   and they are computed automatically
 *
 * **Avoid when**
 * - Every underlying point should be visible — use ScatterPlot
 * - The interval is a plain min–max rather than a statistical summary — use
 *   RangePlot
 * - The audience will not read quartiles; a histogram via ColumnChart with
 *   `x.bin` is more intuitive
 * - A vertical layout fits better — use BoxPlotV
 *
 * **Specialised types**
 * - Binned box plot — Set `bin` on the `y` (category) config and pass
 *   `valueKey` naming the field to summarise. The statistic keys on `x` are
 *   then computed internally and can be omitted.
 *
 * Also called: horizontal box plot, box and whisker plot, quartile plot.
 *
 * Answers: distribution, range. Required props: `id`, `data`, `x`, `y`.
 *
 * @example
 * ```tsx
 * <BoxPlotH
 *   id="scores-by-team"
 *   className="w-full h-64"
 *   data={data}
 *   y={{ key: 'name' }}
 *   x={{
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
 * @example Binned box plot
 * ```tsx
 * <BoxPlotH
 *   id="salary-by-age"
 *   className="w-full h-64"
 *   data={rawRows}
 *   valueKey="salary"
 *   y={{ key: 'age', bin: { count: 5 } }}
 *   x={{ min: 0 }}
 * />
 * ```
 *
 * @see BoxPlotV — a vertical layout fits the space better
 * @see RangePlot — showing a plain min–max interval rather than quartiles
 * @see ColumnChart — a histogram of one group is enough — set `x.bin`
 */
/* catalog:end */
const BoxPlotH = <TData = any,>({
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
}: BoxPlotHProps<TData>) => {
  // Same predicate as the props union: `y.bin` set and `valueKey` a string
  const binValueKey = getBinValueKey(y, valueKey);
  const isBinned = binValueKey !== undefined;
  useBoxPlotConfigWarnings('BoxPlotH', id, {
    data,
    categoryConfig: y,
    valueConfig: x,
    valueKey,
  });

  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: (d: any) => {
      const resolved = resolveValueConfig(x, isBinned);
      if (!resolved) return '';
      const {
        minKey: mk,
        maxKey: xk,
        boxStart: bs,
        boxEnd: be,
        midKey: md,
      } = resolved;
      return `min: ${d[mk].toFixed(0)} <br/> range: ${d[bs].toFixed(
        0
      )} to ${d[be].toFixed(0)} <br/> mid: ${d[md].toFixed(
        0
      )} <br/> max: ${d[xk].toFixed(0)} `;
    },
  });
  const { drawAxis } = useAxis();
  const refreshChart = useCallback(() => {
    const svg = select<SVGSVGElement, unknown>(`#${id}`);
    svg.selectAll('*').remove();

    const width = +svg.style('width').split('px')[0],
      height = +svg.style('height').split('px')[0];

    const g = svg.append('g');

    // When binning is active, bin y-axis and compute box stats from raw data
    const effectiveX = resolveValueConfig(x, isBinned);
    // Only reachable when the props types are bypassed: nothing to draw
    if (!effectiveX) return;
    const effectiveData: any[] =
      binValueKey !== undefined
        ? toBinnedRows(binDataStats(data, y, binValueKey), y.key)
        : data;

    const xFn = scaleLinear()
      .domain([
        Number.isFinite(effectiveX.min) ? effectiveX.min : min(effectiveData.map((d: any) => d[effectiveX.minKey])),
        effectiveX.max || max(effectiveData.map((d: any) => d[effectiveX.maxKey])),
      ])
      .range([(margin.left ?? 0), width - (padding.right || 0) - (margin.right ?? 0)]);

    const yFn = scaleBand()
      .domain(effectiveData.map((d: any) => d[y.key]))
      .range([
        (margin.top ?? 0) + (padding.top || 0),
        height - (margin.bottom ?? 0) - (padding.bottom || 0),
      ])
      .padding(padding.bar || 0);

    // const clipPath =
    svg
      .append('clipPath')
      .attr('id', 'clip')
      .append('rect')
      .attr('x', margin.left ?? 0)
      .attr('y', (margin.top ?? 0) - (padding.top || 0) - 10)
      .attr('width', width)
      .attr('height', height + (padding.bottom || 0) + 8);

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

    // End lines
    dotRowsG
      .append('line')
      .attr('clip-path', 'url(#clip)')
      .attr('x1', (d: any) => xFn(d[effectiveX.minKey]))
      .attr('x2', (d: any) => xFn(d[effectiveX.minKey]))
      .attr('y1', (d: any) => (yFn(d[y.key]) || 0) + yFn.bandwidth() / 2)
      .attr('y2', (d: any) => (yFn(d[y.key]) || 0) + yFn.bandwidth() / 2)
      .attr('class', (d: any) =>
        twMerge(
          'box-plot-line stroke-current',
          x.classNameMap ? x.classNameMap[d[y.key]] : classNames?.lines
        )
      )
      .transition()
      .duration(1000)
      .attr('x2', (d: any) => xFn(d[effectiveX.maxKey]));

    // Min line
    dotRowsG
      .append('line')
      .attr('clip-path', 'url(#clip)')
      .attr('x1', (d: any) => xFn(d[effectiveX.minKey]))
      .attr('x2', (d: any) => xFn(d[effectiveX.minKey]))
      .attr('y1', (d: any) => yFn(d[y.key]) || 0)
      .attr('y2', (d: any) => yFn(d[y.key]) || 0)
      .attr('class', (d: any) =>
        twMerge(
          'box-plot-line stroke-current',
          x.classNameMap ? x.classNameMap[d[y.key]] : classNames?.lines
        )
      )
      .transition()
      .duration(1000)
      .attr('y1', (d: any) => yFn(d[y.key]) || 0)
      .attr('y2', (d: any) => (yFn(d[y.key]) || 0) + yFn.bandwidth());

    // Mid line

    dotRowsG
      .append('line')
      .attr('clip-path', 'url(#clip)')
      .attr('x1', (d: any) => xFn(d[effectiveX.maxKey]))
      .attr('x2', (d: any) => xFn(d[effectiveX.maxKey]))
      .attr('y1', (d: any) => (yFn(d[y.key]) || 0) + yFn.bandwidth())
      .attr('y2', (d: any) => (yFn(d[y.key]) || 0) + yFn.bandwidth())
      .attr(
        'class',
        twMerge('box-plot-line stroke-current', classNames?.lines)
      )
      .transition()
      .duration(1000)
      .attr('y1', (d: any) => yFn(d[y.key]) || 0)
      .attr('y2', (d: any) => (yFn(d[y.key]) || 0) + yFn.bandwidth());

    dotRowsG
      .append('rect')
      .attr('class', (d: any) =>
        twMerge(
          'box-plot-box stroke-current fill-current',
          d.className,
          classNames?.boxes
        )
      )
      .attr('clip-path', 'url(#clip)')
      .attr('x', (d: any) => xFn(d[effectiveX.boxStart]))
      .attr('y', (d: any) => yFn(d[y.key]) || 0)
      .attr('height', yFn.bandwidth())
      .transition()
      .duration(1000)
      .attr('width', (d: any) => xFn(d[effectiveX.boxEnd]) - xFn(d[effectiveX.boxStart]));

    dotRowsG
      .append('line')
      .attr('clip-path', 'url(#clip)')
      .attr('x1', (d: any) => xFn(d[effectiveX.midKey]))
      .attr('x2', (d: any) => xFn(d[effectiveX.midKey]))
      .attr('y1', (d: any) => (yFn(d[y.key]) || 0) + yFn.bandwidth() / 2)
      .attr('y2', (d: any) => (yFn(d[y.key]) || 0) + yFn.bandwidth() / 2)
      .attr('class', twMerge('box-plot-line stroke-current', classNames?.data))
      .transition()
      .duration(1000)
      .attr('y1', (d: any) => yFn(d[y.key]) || 0)
      .attr('y2', (d: any) => (yFn(d[y.key]) || 0) + yFn.bandwidth());

    drawAxis({
      g,
      scale: yFn,
      config: y,
      dimensions: { width, height },
      margin,
      padding,
      orientation: 'vertical',
      className: 'yAxis axis',
    });

    const { axisG: xAxisG, axis: xAxis } = drawAxis({
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
        // transform g across only x axis
        dotRowsG.attr(
          'transform',
          `translate(${transform.x},0)scale(${transform.k},1)`
        );
        xAxisG.call(xAxis.scale(transform.rescaleX(xFn)));
      };

      const zoomFn = zoom<SVGSVGElement, unknown>()
        .scaleExtent([zooming.min || 1, zooming.max || 2])
        .translateExtent([
          [0, 0],
          [width, height],
        ])
        .on('zoom', zoomed);

      svg.call(zoomFn);
    }
  }, [
    data,
    id,
    isBinned,
    binValueKey,
    margin,
    padding,
    x,
    y,
    classNames,
    zooming,
    onMouseLeave,
    onMouseMove,
    onMouseOver,
    drawAxis,
  ]);

  useEffect(() => {
    refreshChart();
    return () => {
      selectAll(`#tooltip-${id}`).remove();
    };
  }, [data, refreshChart]);

  return (
    <svg
      id={id}
      style={style}
      className={twMerge(defaultChartClassNames, className || '')}
    />
  );
};

export default BoxPlotH;

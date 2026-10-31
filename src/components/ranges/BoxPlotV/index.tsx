import { ZoomTransform, zoom } from 'd3-zoom';
import { max, min } from 'd3-array';
import { scaleBand, scaleLinear } from 'd3-scale';
import { select, selectAll } from 'd3-selection';
import useTooltip from '@/hooks/useTooltip';
import useAxis from '@/hooks/useAxis';

import {
  AxisConfig,
  ChartProps,
  TooltipConfig,
  ValueAxisConfig,
} from '@/types';
import { useCallback, useEffect } from 'react';
import { defaultChartClassNames, binDataStats } from '@/utils';
import { transition } from 'd3-transition';
import { twMerge } from 'tailwind-merge';

/** Row fields holding the pre-computed box statistics (summary mode) */
export interface BoxPlotStatKeys<TData = any> {
  minKey: Extract<keyof TData, string> | string;
  maxKey: Extract<keyof TData, string> | string;
  boxStart: Extract<keyof TData, string> | string;
  boxEnd: Extract<keyof TData, string> | string;
  midKey: Extract<keyof TData, string> | string;
}

/**
 * Value-axis settings shared by both modes. `key` is not read for the value
 * axis (positions come from the statistic keys), so it is optional.
 */
interface BoxPlotValueAxisBase<TData = any> extends ValueAxisConfig<TData> {
  min?: number;
  max?: number;
  classNameMap?: any;
}

type BoxPlotYConfig<TData = any> = BoxPlotValueAxisBase<TData> & BoxPlotStatKeys<TData>;

export interface BoxPlotClassNames {
  boxes?: string;
  lines?: string;
  data?: string;
}

interface BoxPlotVBaseProps<TData = any> extends ChartProps<TData> {
  data: TData[];
  classNames?: BoxPlotClassNames;
  tooltip?: TooltipConfig;
}

/** Summary mode: each row already carries the statistics named on `y`. */
export interface BoxPlotVSummaryProps<TData = any> extends BoxPlotVBaseProps<TData> {
  y: BoxPlotYConfig<TData>;
  x: AxisConfig<TData>;
  /** Only takes effect together with `x.bin` (see binned mode) */
  valueKey?: string;
}

/**
 * Binned mode: `x.bin` groups the raw rows and `valueKey` names the field to
 * summarise. Statistics are computed internally, so the stat keys on `y`
 * may be omitted (any that are given are ignored).
 */
export interface BoxPlotVBinnedProps<TData = any> extends BoxPlotVBaseProps<TData> {
  y: BoxPlotValueAxisBase<TData> & Partial<BoxPlotStatKeys<TData>>;
  x: AxisConfig<TData> & { bin: NonNullable<AxisConfig<TData>['bin']> };
  /** The continuous value field to compute box stats from */
  valueKey: string;
}

export type BoxPlotVProps<TData = any> =
  | BoxPlotVSummaryProps<TData>
  | BoxPlotVBinnedProps<TData>;

/** Field names binDataStats results are mapped to in binned mode */
const BINNED_STAT_KEYS: BoxPlotStatKeys = {
  minKey: '_min',
  maxKey: '_max',
  boxStart: '_q1',
  boxEnd: '_q3',
  midKey: '_median',
};

/**
 * Outside binned mode the props can only satisfy BoxPlotVSummaryProps, so the
 * value-axis config is guaranteed to carry every stat key.
 */
const resolveValueConfig = (
  config: BoxPlotVProps['y'],
  binned: boolean
): BoxPlotYConfig =>
  binned ? { ...config, ...BINNED_STAT_KEYS } : (config as BoxPlotYConfig);

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
 *   pass `valueKey` naming the field to summarise. The statistic keys on `y`
 *   are then computed internally and can be omitted. Use `bin.thresholds`
 *   for explicit band edges.
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
  // Binned mode needs both `x.bin` and `valueKey`; otherwise summary mode
  const isBinned = x.bin != null && !!valueKey;
  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: (d: any) => {
      const {
        minKey: mk,
        maxKey: xk,
        boxStart: bs,
        boxEnd: be,
        midKey: md,
      } = resolveValueConfig(y, isBinned);
      return `min: ${d[mk].toFixed(0)} <br/> range: ${+d[bs].toFixed(
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
    let effectiveData: any[];
    let effectiveY: BoxPlotYConfig;

    if (isBinned) {
      const stats = binDataStats(data, x, valueKey as string);
      effectiveData = stats.map((s) => ({
        [x.key]: s.label,
        _min: s.min,
        _q1: s.q1,
        _median: s.median,
        _q3: s.q3,
        _max: s.max,
        _count: s.count,
      }));
      effectiveY = resolveValueConfig(y, true);
    } else {
      effectiveData = data;
      effectiveY = resolveValueConfig(y, false);
    }

    const xFn: any = scaleBand()
      .domain(effectiveData.map((d: any) => d[x.key]))
      .range([
        (margin.left ?? 0) + (padding.left || 0),
        width - (margin.right ?? 0) - (padding.right || 0),
      ])
      .padding(padding.bar || 0.2);

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
      .attr('x1', (d: any) => xFn(d[x.key]) + xFn.bandwidth() / 2)
      .attr('x2', (d: any) => xFn(d[x.key]) + xFn.bandwidth() / 2)
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
      .attr('x1', (d: any) => xFn(d[x.key]))
      .attr('x2', (d: any) => xFn(d[x.key]))
      .attr('y1', (d: any) => yFn(d[effectiveY.minKey]))
      .attr('y2', (d: any) => yFn(d[effectiveY.minKey]))
      .attr('class', (d: any) =>
        twMerge('box-plot-line stroke-current', d.className || ``)
      )
      .transition()
      .duration(1000)
      .attr('x1', (d: any) => xFn(d[x.key]))
      .attr('x2', (d: any) => xFn(d[x.key]) + xFn.bandwidth());

    // Mid lines
    dotRowsG
      .append('line')
      .attr('clip-path', 'url(#clip)')
      .attr('y1', (d: any) => yFn(d[effectiveY.midKey]))
      .attr('y2', (d: any) => yFn(d[effectiveY.midKey]))
      .attr('x1', (d: any) => xFn(d[x.key]) + xFn.bandwidth() / 2)
      .attr('x2', (d: any) => xFn(d[x.key]) + xFn.bandwidth() / 2)
      .attr('class', twMerge('box-plot-line stroke-current', classNames?.data))
      .transition()
      .duration(1000)
      .attr('x1', (d: any) => xFn(d[x.key]))
      .attr('x2', (d: any) => xFn(d[x.key]) + xFn.bandwidth());

    // End lines
    dotRowsG
      .append('line')
      .attr('clip-path', 'url(#clip)')
      .attr('y1', (d: any) => yFn(d[effectiveY.maxKey]))
      .attr('y2', (d: any) => yFn(d[effectiveY.maxKey]))
      .attr('x1', (d: any) => xFn(d[x.key]) + xFn.bandwidth() / 2)
      .attr('x2', (d: any) => xFn(d[x.key]) + xFn.bandwidth() / 2)
      .attr('class', twMerge('box-plot-line stroke-current', classNames?.data))
      .transition()
      .duration(1000)
      .attr('x1', (d: any) => xFn(d[x.key]))
      .attr('x2', (d: any) => xFn(d[x.key]) + xFn.bandwidth());

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
      .attr('x', (d: any) => xFn(d[x.key]))
      .attr('width', xFn.bandwidth())
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
    valueKey,
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

export default BoxPlotV;

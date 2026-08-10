import { ZoomTransform, zoom } from 'd3-zoom';
import { max, min } from 'd3-array';
import { scaleBand, scaleLinear, scaleTime } from 'd3-scale';
import { isoParse, timeParse } from 'd3-time-format';
import { select, selectAll } from 'd3-selection';
import useTooltip from '@/hooks/useTooltip';
import useAxis from '@/hooks/useAxis';

import { AxisConfig, ChartProps, TooltipConfig } from '@/types';
import { useCallback, useEffect } from 'react';
import { defaultChartClassNames, binDataStats } from '@/utils';
import { transition } from 'd3-transition';
import { twMerge } from 'tailwind-merge';

interface BoxPlotYConfig<TData = any> extends AxisConfig<TData> {
  minKey: Extract<keyof TData, string> | string;
  maxKey: Extract<keyof TData, string> | string;
  boxStart: Extract<keyof TData, string> | string;
  boxEnd: Extract<keyof TData, string> | string;
  midKey: Extract<keyof TData, string> | string;
  min?: number;
  max?: number;
  classNameMap?: any;
}

export interface BoxPlotClassNames {
  boxes?: string;
  lines?: string;
  data?: string;
}

export interface BoxPlotVProps<TData = any> extends ChartProps<TData> {
  data: TData[];
  classNames?: BoxPlotClassNames;
  y: BoxPlotYConfig<TData>;
  x: AxisConfig<TData>;
  /** When x.bin is set, this key specifies the continuous value field to compute box stats from */
  valueKey?: string;
  tooltip?: TooltipConfig;
}

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
  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: (d: any) => {
      const mk = isBinned && valueKey ? '_min' : y.minKey;
      const xk = isBinned && valueKey ? '_max' : y.maxKey;
      const bs = isBinned && valueKey ? '_q1' : y.boxStart;
      const be = isBinned && valueKey ? '_q3' : y.boxEnd;
      const md = isBinned && valueKey ? '_median' : y.midKey;
      return `min: ${d[mk].toFixed(0)} <br/> range: ${+d[bs].toFixed(
        0
      )} to ${+d[be].toFixed(0)} <br/> mid: ${d[md].toFixed(
        0
      )} <br/> max: ${d[xk].toFixed(0)} `;
    },
  });
  const { drawAxis } = useAxis();
  const isBinned = x.bin != null && x.scalingFunction !== 'time';

  const refreshChart = useCallback(() => {
    const svg = select(`#${id}`);
    svg.selectAll('*').remove();

    const width = +svg.style('width').split('px')[0],
      height = +svg.style('height').split('px')[0];

    const g = svg.append('g');

    // When binning is active, compute box stats from raw data
    let effectiveData: any[];
    let effectiveY: BoxPlotYConfig;

    if (isBinned && valueKey) {
      const stats = binDataStats(data, x, valueKey);
      effectiveData = stats.map((s) => ({
        [x.key]: s.label,
        _min: s.min,
        _q1: s.q1,
        _median: s.median,
        _q3: s.q3,
        _max: s.max,
        _count: s.count,
      }));
      effectiveY = {
        ...y,
        minKey: '_min',
        maxKey: '_max',
        boxStart: '_q1',
        boxEnd: '_q3',
        midKey: '_median',
      };
    } else {
      effectiveData = data;
      effectiveY = y;
    }

    const d3Format = x.time?.format || '%Y-%m-%d';
    const parseDate = timeParse(d3Format);

    const toDateTime = (d: any): Date =>
      x.time?.isISO ? (isoParse(d[x.key]) as Date) : (parseDate(d[x.key]) as Date);

    const isTimeX = x.scalingFunction === 'time';
    const paddingBarValue = padding.bar || 0.2;

    const xFn: any = isTimeX ? scaleTime().nice() : scaleBand();

    if (isTimeX) {
      xFn
        .domain([
          Number.isFinite(x.start)
            ? x.start
            : min(effectiveData.map((d: any) => toDateTime(d))),
          Number.isFinite(x.end)
            ? x.end
            : max(effectiveData.map((d: any) => toDateTime(d))),
        ])
        .range([
          (margin.left ?? 0) + (padding.left || 0),
          width - (margin.right ?? 0) - (padding.right || 0),
        ]);
    } else {
      xFn
        .domain(effectiveData.map((d: any) => d[x.key]))
        .range([
          (margin.left ?? 0) + (padding.left || 0),
          width - (margin.right ?? 0) - (padding.right || 0),
        ])
        .padding(paddingBarValue);
    }

    let finalBarWidth = 0;
    if (isTimeX) {
      if (Number.isFinite(x.time?.barWidth)) {
        // 1. Explicit override always wins, used as-is (final rendered width,
        //    paddingBarValue is NOT applied on top of an explicit value).
        finalBarWidth = x.time!.barWidth!;
      } else {
        // 2. Infer from data cadence.
        const rangeStart = xFn.range()[0];
        const rangeEnd = xFn.range()[1];

        const timestamps = Array.from(
          new Set(
            effectiveData
              .map((d: any) => toDateTime(d)?.getTime())
              .filter((t: number) => Number.isFinite(t))
          )
        ).sort((a: number, b: number) => a - b);

        let cadenceMs = NaN;
        if (timestamps.length >= 2) {
          const gaps: number[] = [];
          for (let i = 1; i < timestamps.length; i++) {
            gaps.push(timestamps[i] - timestamps[i - 1]);
          }
          gaps.sort((a, b) => a - b);
          const mid = Math.floor(gaps.length / 2);
          cadenceMs =
            gaps.length % 2 === 0 ? (gaps[mid - 1] + gaps[mid]) / 2 : gaps[mid];
          // Median, not mean or min: resists one large gap (e.g. a missing
          // period) skewing the width up, and resists a single duplicate/
          // near-duplicate timestamp collapsing the width to ~0.
        }

        let slotWidthPx: number;
        if (Number.isFinite(cadenceMs) && cadenceMs > 0) {
          // scaleTime is affine in ms, so the pixel delta for a fixed ms
          // interval is the same everywhere on the scale — any anchor works.
          const anchor = (xFn.domain()[0] as Date).getTime();
          slotWidthPx = xFn(new Date(anchor + cadenceMs)) - xFn(new Date(anchor));
        } else {
          // 0 or 1 unique timestamp: no cadence to infer. Fall back to an even
          // split of the available plotting width across the rows.
          slotWidthPx = (rangeEnd - rangeStart) / Math.max(effectiveData.length, 1);
        }

        finalBarWidth = Math.max(1, slotWidthPx * (1 - paddingBarValue));
      }
    }

    const centerX = (d: any) => xFn(toDateTime(d));

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
      .attr('x1', (d: any) => (isTimeX ? centerX(d) : xFn(d[x.key]) + xFn.bandwidth() / 2))
      .attr('x2', (d: any) => (isTimeX ? centerX(d) : xFn(d[x.key]) + xFn.bandwidth() / 2))
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
      .attr('x1', (d: any) => (isTimeX ? centerX(d) - finalBarWidth / 2 : xFn(d[x.key])))
      .attr('x2', (d: any) => (isTimeX ? centerX(d) - finalBarWidth / 2 : xFn(d[x.key])))
      .attr('y1', (d: any) => yFn(d[effectiveY.minKey]))
      .attr('y2', (d: any) => yFn(d[effectiveY.minKey]))
      .attr('class', (d: any) =>
        twMerge('box-plot-line stroke-current', d.className || ``)
      )
      .transition()
      .duration(1000)
      .attr('x1', (d: any) => (isTimeX ? centerX(d) - finalBarWidth / 2 : xFn(d[x.key])))
      .attr('x2', (d: any) =>
        isTimeX ? centerX(d) + finalBarWidth / 2 : xFn(d[x.key]) + xFn.bandwidth()
      );

    // Mid lines
    dotRowsG
      .append('line')
      .attr('clip-path', 'url(#clip)')
      .attr('y1', (d: any) => yFn(d[effectiveY.midKey]))
      .attr('y2', (d: any) => yFn(d[effectiveY.midKey]))
      .attr('x1', (d: any) => (isTimeX ? centerX(d) : xFn(d[x.key]) + xFn.bandwidth() / 2))
      .attr('x2', (d: any) => (isTimeX ? centerX(d) : xFn(d[x.key]) + xFn.bandwidth() / 2))
      .attr('class', twMerge('box-plot-line stroke-current', classNames?.data))
      .transition()
      .duration(1000)
      .attr('x1', (d: any) => (isTimeX ? centerX(d) - finalBarWidth / 2 : xFn(d[x.key])))
      .attr('x2', (d: any) =>
        isTimeX ? centerX(d) + finalBarWidth / 2 : xFn(d[x.key]) + xFn.bandwidth()
      );

    // End lines
    dotRowsG
      .append('line')
      .attr('clip-path', 'url(#clip)')
      .attr('y1', (d: any) => yFn(d[effectiveY.maxKey]))
      .attr('y2', (d: any) => yFn(d[effectiveY.maxKey]))
      .attr('x1', (d: any) => (isTimeX ? centerX(d) : xFn(d[x.key]) + xFn.bandwidth() / 2))
      .attr('x2', (d: any) => (isTimeX ? centerX(d) : xFn(d[x.key]) + xFn.bandwidth() / 2))
      .attr('class', twMerge('box-plot-line stroke-current', classNames?.data))
      .transition()
      .duration(1000)
      .attr('x1', (d: any) => (isTimeX ? centerX(d) - finalBarWidth / 2 : xFn(d[x.key])))
      .attr('x2', (d: any) =>
        isTimeX ? centerX(d) + finalBarWidth / 2 : xFn(d[x.key]) + xFn.bandwidth()
      );

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
      .attr('x', (d: any) => (isTimeX ? centerX(d) - finalBarWidth / 2 : xFn(d[x.key])))
      .attr('width', isTimeX ? finalBarWidth : xFn.bandwidth())
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

import { max, sum } from 'd3-array';
import { select, selectAll } from 'd3-selection';
import useTooltip from '@/hooks/useTooltip';
import { drawAxis } from '@/hooks/useAxis';
import { scaleBand, scaleLinear, type ScaleTime } from 'd3-scale';
import { timeFormat } from 'd3-time-format';
import { useCallback, useEffect } from 'react';

import { AxisConfig, ChartProps, TooltipConfig } from '@/types';
import { defaultChartClassNames } from '@/utils';
import {
  DEFAULT_TIME_FORMAT,
  createTimeXScale,
  insetTimeScale,
  makeDateAccessor,
  timeMarkWidth,
} from '@/utils/timeScale';
import { transition } from 'd3';
import { twMerge } from 'tailwind-merge';

export interface ColumnChartStackedProps<TData = any> extends ChartProps<TData> {
  x: AxisConfig<TData>;
  y: AxisConfig<TData>[];
  paddingBar?: number;
  waterfall?: boolean;
  tooltip?: TooltipConfig;
  referenceLines?: {
    y: number;
    className?: string;
  }[];
}

interface drawHLineProps {
  x: number;
  y: number;
  direction?: 'left' | 'right';
  className?: string;
  dashed?: boolean;
}

/* catalog:start */
/**
 * Vertical bars where each measure stacks on the previous one, showing both
 * the total per category and its composition.
 *
 * @remarks
 *
 * **Use when**
 * - The total per category matters as much as its breakdown
 * - Segments are genuinely parts of one whole, not independent measures
 * - Showing a waterfall of running gains and losses — set `waterfall`
 *
 * **Avoid when**
 * - Individual segments need precise comparison across categories — only the
 *   bottom segment shares a baseline; use ColumnChart grouped
 * - Category labels are long or numerous — use BarChartStacked
 * - There is one category only — use PieChart
 * - The axis is continuous time — use AreaChart, which reads as a flow
 *   rather than discrete totals
 *
 * **Specialised types**
 * - Waterfall chart — Set `waterfall` on a ColumnChartStacked. Each `y`
 *   series becomes a step in the sequence rather than a segment stacked from
 *   the baseline.
 * - Time-scaled stacked column chart — Set `x.scalingFunction: "time"` with
 *   `x.time.format`, or `x.time.isISO` for ISO strings. Bar width is
 *   inferred from the data's date cadence; override with `x.time.barWidth`
 *   (pixels).
 *
 * Also called: stacked column chart, stacked bar chart (vertical).
 *
 * Answers: composition, comparison. Required props: `id`, `data`, `x`, `y`.
 *
 * @example
 * ```tsx
 * <ColumnChartStacked
 *   id="revenue-split"
 *   className="w-full h-64"
 *   data={data}
 *   x={{ key: 'year' }}
 *   y={[
 *     { key: 'macbook', className: 'fill-purple-800' },
 *     { key: 'iphone', className: 'fill-purple-600' },
 *     { key: 'ipad', className: 'fill-purple-400' },
 *   ]}
 * />
 * ```
 *
 * @example Waterfall chart
 * ```tsx
 * <ColumnChartStacked
 *   id="revenue-bridge"
 *   className="w-full h-64"
 *   data={data}
 *   waterfall
 *   x={{ key: 'year' }}
 *   y={[
 *     { key: 'macbook', className: 'fill-green-600' },
 *     { key: 'iphone', className: 'fill-green-500' },
 *     { key: 'ipad', className: 'fill-red-500' },
 *   ]}
 * />
 * ```
 *
 * @example Time-scaled stacked column chart
 * ```tsx
 * <ColumnChartStacked
 *   id="daily-revenue-split"
 *   className="w-full h-64"
 *   data={data}
 *   x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
 *   y={[
 *     { key: 'macbook', className: 'fill-purple-800' },
 *     { key: 'iphone', className: 'fill-purple-600' },
 *   ]}
 * />
 * ```
 *
 * @see ColumnChart — segments must be compared precisely across
 *   categories
 * @see BarChartStacked — long category labels
 * @see AreaChart — the axis is continuous time
 * @see PieChart — a single whole at one point in time
 */
/* catalog:end */
const ColumnChartStacked = <TData = any,>({
  data = [],
  id,
  className,
  x,
  y,
  margin = {
    top: 40,
    bottom: 40,
    left: 40,
    right: 40,
  },
  padding = {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  paddingBar = 0.2,
  waterfall,
  tooltip,
  referenceLines = [],
  drawing = undefined,
  style = {},
}: ColumnChartStackedProps<TData>) => {
  const formatDate = timeFormat(x.time?.format || DEFAULT_TIME_FORMAT);
  const toDateTime = makeDateAccessor(x);

  const isTimeX = x.scalingFunction === 'time';

  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: (d: any) => {
      const xValue = isTimeX ? formatDate(toDateTime(d)) : d[x.key];
      return `${xValue} <br/> ${y.map((col) => `${col.key}: ${d[col.key]}`).join('<br/>')}`;
    },
  });

  const refreshChart = useCallback(() => {
    /* eslint-disable */
    const svg = select(`#${id}`);
    svg.selectAll('*').remove();
    const g = svg.append('g');

    const width = +svg.style('width').split('px')[0],
      height = +svg.style('height').split('px')[0];

    const paddingBarValue = paddingBar;

    const xRange: [number, number] = [
      (margin.left ?? 0) + (padding.left ?? 0),
      width - (margin.right ?? 0) - (padding.right ?? 0),
    ];

    // In time mode the axis is drawn from the full margin-to-margin `xFn`, but
    // bars are centered on their date and positioned with `markXFn`, a
    // copy inset by half a mark width so the edge marks don't overhang the
    // plot (#16).
    let xFn: any;
    let markXFn: ScaleTime<number, number> | undefined;
    let finalBarWidth = 0;
    if (isTimeX) {
      const timeXFn = createTimeXScale(data, x, toDateTime, xRange);
      finalBarWidth = timeMarkWidth({
        scale: timeXFn,
        dates: data.map(toDateTime),
        rowCount: data.length,
        paddingRatio: paddingBarValue,
        explicitWidth: x.time?.barWidth,
      });
      markXFn = insetTimeScale(timeXFn, finalBarWidth / 2);
      xFn = timeXFn;
    } else {
      xFn = scaleBand()
        .domain(data.map((d) => (d as any)[x.key]))
        .range(xRange)
        .padding(paddingBarValue);
    }

    const centerX = (d: TData): number => (markXFn ? markXFn(toDateTime(d)) : NaN);

    const yFnRange = [
      height - (margin.bottom ?? 0) - (padding.bottom ?? 0),
      (margin.top ?? 0) + (padding.top ?? 0),
    ];

    const yFn = scaleLinear()
      // @ts-ignore
      .domain([0, max(data.map((d) => sum(y.map((value) => d[value.key]))))])
      .range(yFnRange);

    y.map((column, i) => {
      const barsG = g.append('g');
      const beforeColumns = y.filter((_, idx) => idx <= i).map((c) => c.key);

      const bars = barsG
        .selectAll('g')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', `${column.className} fill-current`)
        .attr('z-index', 100 - i)
        .attr('x', (d: any) =>
          isTimeX
            ? centerX(d) -
              finalBarWidth / 2 +
              (waterfall ? i * (finalBarWidth / y.length) : 0)
            : (xFn((d as any)[x.key]) || 0) +
              (waterfall ? (xFn.bandwidth() / y.length) * i : 0)
        )
        .attr('y', (d: any) => yFn(sum(beforeColumns.map((c: any) => d[c]))))
        .style('z-index', 10 + i)
        .attr('width', () =>
          isTimeX
            ? waterfall
              ? // @ts-ignore
                finalBarWidth / y.length - (waterfall.padding || 0)
              : finalBarWidth
            : waterfall
            ? // @ts-ignore
              xFn.bandwidth() / y.length - (waterfall.padding || 0)
            : xFn.bandwidth()
        )
        .attr('height', (d: any) =>
          drawing?.duration ? 0 : yFn(0) - yFn((d as any)[column.key])
        )
        .on('mouseenter', onMouseOver)
        .on('mousemove', onMouseMove)
        .on('mouseleave', onMouseLeave);

      transition();

      if (drawing?.duration) {
        bars
          .transition()
          .duration(drawing.duration)
          .attr('height', (d: any) => yFn(0) - yFn(d[column.key]));
      }
    });

    function drawHLine({
      x,
      y,
      direction = 'left',
      className,
      dashed = false,
    }: drawHLineProps) {
      const horizontalLine = g
        .append('line')
        .attr('class', twMerge(className, 'line stroke-current'))
        .attr('x1', direction === 'left' ? margin.left ?? 0 : x)
        .attr('x2', direction === 'left' ? x : width + (margin.left ?? 0))
        .attr('y1', y)
        .attr('y2', y)
        .attr('clip-path', 'url(#clip)')
        .attr('stroke', '#dddddd');
      dashed && horizontalLine.style('stroke-dasharray', '10,5');
    }

    referenceLines.map((object) => {
      object.y &&
        drawHLine({
          x: width - (margin.right ?? 0),
          y: yFn(object.y),
          className: `${object.className || ''} reference-line`,
        });
    });

    // Determine y-axis location
    const yAxisLocation = y.find((col) => col.axis?.location)?.axis?.location || 'left';
    const yAxisLabel = y.map((column) => column.axis?.label || column.key || '').join(', ');

    // Create y-axis config
    const yAxisConfig: AxisConfig = {
      key: y[0]?.key || '',
      axis: {
        location: yAxisLocation as 'left' | 'right',
        ticks: y[0]?.axis?.ticks || 5,
        label: yAxisLabel,
      },
    };

    // Draw x-axis using shared utility
    drawAxis({
      g,
      scale: xFn,
      config: x,
      dimensions: { width, height },
      margin,
      padding,
      orientation: 'horizontal',
    });

    // Draw y-axis using shared utility
    drawAxis({
      g,
      scale: yFn,
      config: yAxisConfig,
      dimensions: { width, height },
      margin,
      padding,
      orientation: 'vertical',
    });
  }, [data, onMouseOver, onMouseMove, onMouseLeave]);

  useEffect(() => {
    refreshChart();
    return () => {
      selectAll(`#tooltip-${id}`).remove();
    };
  }, [data, refreshChart, id]);
  /* eslint-enable */
  return (
    <svg
      id={id}
      style={style}
      className={twMerge(defaultChartClassNames, className)}
    />
  );
};

export default ColumnChartStacked;

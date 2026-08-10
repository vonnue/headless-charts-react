import { max, min } from 'd3-array';
import { select, selectAll } from 'd3-selection';
import useTooltip from '@/hooks/useTooltip';
import { drawAxis } from '@/hooks/useAxis';
import { scaleBand, scaleLinear, scaleTime } from 'd3-scale';
import { isoParse, timeParse, timeFormat } from 'd3-time-format';
import { useCallback, useEffect } from 'react';

import { AxisConfig, ChartProps, TooltipConfig } from '@/types';
import { defaultChartClassNames, bin1D } from '@/utils';
import { twMerge } from 'tailwind-merge';

export interface ColumnChartGroupedProps<TData = any> extends ChartProps<TData> {
  x: AxisConfig<TData>;
  y: AxisConfig<TData>[];
  paddingBar?: number;
  tooltip?: TooltipConfig;
  referenceLines?: {
    y?: number;
    className?: string;
  }[];
  wholeNumbers?: boolean;
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
 * Vertical bars comparing one or more measures across categories; grouped side
 * by side when several measures are passed.
 *
 * @remarks
 *
 * **Use when**
 * - Comparing a numeric measure across a modest number of categories with
 *   short labels
 * - Several measures need comparing within each category, side by side
 * - The categories are periods (years, quarters) and individual values
 *   matter more than the trend line
 * - Showing a histogram of raw continuous values — set `x.bin` and pass
 *   `y={[{ key: "count" }]}`
 *
 * **Avoid when**
 * - Category labels are long or there are more than ~20 categories — use
 *   BarChart, where horizontal bars give labels room
 * - The measures are parts of one whole — use ColumnChartStacked so the
 *   total is readable
 * - The x axis is continuous time with many points — use LineChart
 * - The bars would be nearly equal in height, making differences invisible —
 *   use LollipopVChart or a dot-based chart
 *
 * **Specialised types**
 * - Histogram — Set `x={{ key: "score", bin: { count: 8 } }}` and `y={[{
 *   key: "count" }]}`. Pass the raw rows as `data` — binning and counting
 *   happen internally. Use `bin.thresholds` for explicit edges.
 * - Time-scaled column chart — Set `x.scalingFunction: "time"` with
 *   `x.time.format`, or `x.time.isISO` for ISO strings. Bar width is
 *   inferred from the data's date cadence; override with `x.time.barWidth`
 *   (pixels).
 *
 * Also called: vertical bar chart, grouped column chart, clustered column chart.
 *
 * Answers: comparison, distribution. Required props: `id`, `data`, `x`, `y`.
 *
 * @example
 * ```tsx
 * <ColumnChart
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
 * @example Histogram
 * ```tsx
 * <ColumnChart
 *   id="score-histogram"
 *   className="w-full h-64"
 *   data={rawRows}
 *   x={{ key: 'score', bin: { count: 8 }, axis: { label: 'Score' } }}
 *   y={[{ key: 'count', className: 'text-blue-500' }]}
 * />
 * ```
 *
 * @example Time-scaled column chart
 * ```tsx
 * <ColumnChart
 *   id="daily-signups"
 *   className="w-full h-64"
 *   data={data}
 *   x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
 *   y={[{ key: 'signups', className: 'fill-purple-600' }]}
 * />
 * ```
 *
 * @see BarChart — long labels or many categories
 * @see ColumnChartStacked — measures are parts of a whole
 * @see LollipopVChart — bars look heavy and values are the focus
 * @see LineChart — the axis is continuous time with many points
 */
/* catalog:end */
const ColumnChartGrouped = <TData = any,>({
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
  drawing,
  tooltip,
  referenceLines = [],
  style = {},
  wholeNumbers = false,
}: ColumnChartGroupedProps<TData>) => {
  const isTimeX = x.scalingFunction === 'time';

  const d3Format = x.time?.format || '%Y-%m-%d';
  const formatDate = timeFormat(d3Format);
  const parseDate = timeParse(d3Format);

  const toDateTime = (d: any): Date =>
    x.time?.isISO ? (isoParse(d[x.key]) as Date) : (parseDate(d[x.key]) as Date);

  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: (d: any) => {
      const xValue = isTimeX ? formatDate(toDateTime(d)) : d[x.key];
      return `${xValue} <br/> ${y.map((col) => `${col.key}: ${d[col.key]}`).join('<br/>')}`;
    },
  });

  const isBinned = x.bin != null && x.scalingFunction !== 'time';

  const refreshChart = useCallback(() => {
    /* eslint-disable */
    const svg = select(`#${id}`);
    svg.selectAll('*').remove();
    const g = svg.append('g');

    // When binning is active, transform data into histogram bins
    let effectiveData: any[];
    let effectiveX: AxisConfig;
    let effectiveY: AxisConfig[];

    if (isBinned) {
      const bins = bin1D(data, x);
      effectiveData = bins.map((b) => ({ [x.key]: b.label, count: b.count }));
      effectiveX = { ...x, bin: undefined };
      effectiveY = [{ key: 'count', className: y[0]?.className }];
    } else {
      effectiveData = data;
      effectiveX = x;
      effectiveY = y;
    }

    // @ts-ignore
    const minStart = min(effectiveY.map((column) => column.start));
    // @ts-ignore
    const minY: number = min(
      effectiveY.map((column: AxisConfig) => min(effectiveData, (d: any) => d[column.key]))
    );
    // @ts-ignore
    const maxY: number = max(
      effectiveY.map((column: AxisConfig) => max(effectiveData, (d: any) => d[column.key]))
    );
    // @ts-ignore
    const maxEnd = max(effectiveY.map((column) => column.end));
    // @ts-ignore
    const areAllGreaterThanZero = minY > 0;

    const width = +svg.style('width').split('px')[0],
      height = +svg.style('height').split('px')[0];

    const paddingBarValue = paddingBar;

    const xFn: any = isTimeX ? scaleTime().nice() : scaleBand();

    if (isTimeX) {
      xFn.domain([
        Number.isFinite(x.start)
          ? x.start
          : min(effectiveData.map((d: any) => toDateTime(d))),
        Number.isFinite(x.end)
          ? x.end
          : max(effectiveData.map((d: any) => toDateTime(d))),
      ]);
    } else {
      xFn
        .domain(effectiveData.map((d) => (d as any)[effectiveX.key]))
        .padding(paddingBarValue);
    }

    xFn.range([
      (margin.left ?? 0) + (padding.left ?? 0),
      width - (margin.right ?? 0) - (padding.right ?? 0),
    ]);

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
      // @ts-ignore
      .domain([
        Number.isFinite(minStart) ? minStart : minY || 0,
        maxEnd || maxY,
      ])
      .range([
        height - (margin.bottom ?? 0) - (padding.bottom ?? 0),
        (margin.top ?? 0) + (padding.top ?? 0),
      ]);

    effectiveY.map((column, i) => {
      const barsG = g.append('g');

      const bars = barsG
        .selectAll('g')
        .data(effectiveData)
        .enter()
        .append('rect')
        .attr(
          'class',
          (d) =>
            `fill-current ${
              // @ts-ignore
              column.classNameNegative && (d as any)[column.key] < 0
                ? column.classNameNegative
                : column.className
            }`
        )
        // @ts-ignore
        .attr('x', (d: any) =>
          isTimeX
            ? centerX(d) - finalBarWidth / 2 + (i * finalBarWidth) / effectiveY.length
            : (xFn((d as any)[effectiveX.key]) || 0) + (i * xFn.bandwidth()) / effectiveY.length
        )
        .attr('y', (d) =>
          // @ts-ignore
          drawing && drawing.duration ? yFn(0) : yFn((d as any)[column.key])
        )
        .attr('width', isTimeX ? finalBarWidth / effectiveY.length : xFn.bandwidth() / effectiveY.length)
        .attr('height', (d) =>
          drawing && drawing.duration
            ? 0
            : (d as any)[column.key]
            ? // @ts-ignore
              height -
              (margin.bottom ?? 0) -
              (padding.bottom ?? 0) -
              yFn((d as any)[column.key])
            : 0
        )
        .on('mouseenter', onMouseOver)
        .on('mousemove', onMouseMove)
        .on('mouseleave', onMouseLeave);

      drawing?.duration &&
        bars
          .transition()
          .duration(drawing.duration)
          // @ts-ignore
          .attr('y', (d) => yFn((d as any)[column.key]))
          .attr('height', (d) =>
            Number.isFinite((d as any)[column.key])
              ? // @ts-ignore
                height -
                (margin.bottom ?? 0) -
                (padding.bottom ?? 0) -
                yFn((d as any)[column.key])
              : 0
          );
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
    const yAxisLocation = effectiveY.find((col) => col.axis?.location)?.axis?.location || 'left';
    const yAxisLabel = isBinned ? 'Count' : effectiveY.map((column) => column.axis?.label || column.key || '').join(', ');

    // Create y-axis config
    const yAxisConfig: AxisConfig = {
      key: effectiveY[0]?.key || '',
      axis: {
        location: yAxisLocation as 'left' | 'right',
        ticks: effectiveY[0]?.axis?.ticks || (wholeNumbers && maxY < 10 ? maxY : 5),
        label: yAxisLabel,
      },
    };

    // Draw x-axis using shared utility
    drawAxis({
      g,
      scale: xFn,
      config: effectiveX,
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

export default ColumnChartGrouped;

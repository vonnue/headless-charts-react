import { max, min } from 'd3-array';
import { select } from 'd3-selection';
import useTooltip from '@/hooks/useTooltip';
import { drawAxis } from '@/hooks/useAxis';
import {
  scaleBand,
  scaleLinear,
  type ScaleBand,
  type ScaleTime,
} from 'd3-scale';
import { useCallback, useEffect } from 'react';

import { AxisConfig, ChartProps, TooltipConfig } from '@/types';
import { defaultChartClassNames, bin1D } from '@/utils';
import { warnOnceInDev } from '@/utils/devEnvironment';
import { clampToDomain, pinnedEnd, pinnedStart } from '@/utils/domain';
import {
  createTimeBarLayout,
  makeDateAccessor,
  timePosition,
  makeDateFormatter,
  useTimeAxisWarnings,
  warnIfBarWidthCapped,
} from '@/utils/timeScale';
import { interruptTransitions } from '@/utils/interruptTransitions';
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
 *   `x.time.format`, or `x.time.isISO` for ISO strings. Bar width comes from
 *   the median gap between dates (one slot per step); `x.time.barWidth`
 *   (positive pixels) overrides it but is capped at one slot, so it can
 *   narrow bars but never widen them past their slot. ISO dates are read,
 *   placed and labelled in UTC by default, so calendar days (`2025-01-31`)
 *   land on the right day in every time zone; set `x.time.utc: false` for
 *   the viewer's local time, or `x.time.utc: true` to read `x.time.format`
 *   strings in UTC. Pinned `x.start`/`x.end` (epoch ms) get no edge padding,
 *   so a bar dated exactly on a pinned end is centred on the plot edge and
 *   overhangs it by half a bar; to keep edge marks inside, pin half a step
 *   outside the data (e.g. `start: Date.UTC(2025, 0, 1) - 12 * 3600_000` for
 *   daily data starting 1 Jan 2025).
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
 *   x={{ key: 'date', scalingFunction: 'time', time: { isISO: true, utc: true } }}
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

  const formatDate = makeDateFormatter(x);
  const toDateTime = makeDateAccessor<TData>(x);
  useTimeAxisWarnings('ColumnChart', id, data, x);

  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: (d: any) => {
      const date = isTimeX ? toDateTime(d) : null;
      const xValue = date ? formatDate(date) : d[x.key];
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
      // In time mode rows without a readable date are not drawn (dev warning
      // from useTimeAxisWarnings)
      effectiveData = isTimeX ? data.filter((d) => toDateTime(d) != null) : data;
      effectiveX = x;
      effectiveY = y;
    }

    const minStart = pinnedStart(effectiveY.map((column) => column.start));
    const maxEnd = pinnedEnd(effectiveY.map((column) => column.end));
    // Row values read as numbers, the way d3's min/max treat them.
    const valueOf = (d: unknown, key: string) =>
      (d as Record<string, number | undefined>)[key];
    const minY = min(effectiveY, (column) =>
      min(effectiveData, (d) => valueOf(d, column.key))
    );
    const maxY = max(effectiveY, (column) =>
      max(effectiveData, (d) => valueOf(d, column.key))
    );

    const width = +svg.style('width').split('px')[0],
      height = +svg.style('height').split('px')[0];

    const paddingBarValue = paddingBar;

    const xRange: [number, number] = [
      (margin.left ?? 0) + (padding.left ?? 0),
      width - (margin.right ?? 0) - (padding.right ?? 0),
    ];

    // In time mode one scale positions the bars *and* draws the axis, so bars
    // sit on their ticks; its domain is padded so edge bars stay inside (#16).
    let xFn: ScaleBand<string> | ScaleTime<number, number>;
    let barX: (d: TData) => number;
    let barWidth: number;
    if (isTimeX) {
      const layout = createTimeBarLayout(
        effectiveData,
        x,
        toDateTime,
        xRange,
        paddingBarValue,
        x.time?.barWidth
      );
      warnIfBarWidthCapped('ColumnChart', id, layout);
      const timeXFn = layout.scale;
      xFn = timeXFn;
      barWidth = layout.width;
      const timeX = timePosition(timeXFn, toDateTime);
      barX = (d) => timeX(d) - barWidth / 2;
    } else {
      const bandXFn = scaleBand<string>()
        .domain(effectiveData.map((d) => (d as any)[effectiveX.key]))
        .range(xRange)
        .padding(paddingBarValue);
      xFn = bandXFn;
      barWidth = bandXFn.bandwidth();
      barX = (d) => bandXFn((d as any)[effectiveX.key]) || 0;
    }

    // Empty data leaves the end NaN (no ticks), as before the domain typing.
    const yStart = minStart ?? (minY || 0);
    const yEnd = maxEnd ?? maxY ?? NaN;
    if (yStart > yEnd)
      warnOnceInDev(
        `col-${id}-inverted`,
        `ColumnChart "${id}": y start (${yStart}) > end (${yEnd}); bars cannot render on an inverted axis.`
      );

    const plotBottom = height - (margin.bottom ?? 0) - (padding.bottom ?? 0);
    const yFn = scaleLinear()
      .domain([yStart, yEnd])
      .range([plotBottom, (margin.top ?? 0) + (padding.top ?? 0)]);
    // Columns grow up from the plot bottom; an inverted axis would give a
    // negative height (invalid SVG), so clamp to 0.
    // Column tops are clamped into the visible domain, so a y.end below the
    // data can't push a column above the plot (#32).
    const columnTop = (value: number) => yFn(clampToDomain(value, yFn.domain()));
    const columnHeight = (value: number) => Math.max(0, plotBottom - columnTop(value));

    // Marks are clipped to the plot area so a pinned y.start/y.end that
    // narrows the axis can't draw columns over the axes or margins (#32). The
    // id is per chart because clipPath ids are page-global.
    const plotTop = (margin.top ?? 0) + (padding.top ?? 0);
    const clipId = `${id}-plot-clip`;
    svg
      .append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('x', xRange[0])
      .attr('y', plotTop)
      .attr('width', Math.max(0, xRange[1] - xRange[0]))
      .attr('height', Math.max(0, plotBottom - plotTop));
    const marksG = g
      .append('g')
      .attr('class', 'marks')
      .attr('clip-path', `url(#${clipId})`);

    effectiveY.map((column, i) => {
      const barsG = marksG.append('g');

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
        .attr('x', (d: any) => barX(d) + (i * barWidth) / effectiveY.length)
        .attr('y', (d) =>
          // @ts-ignore
          drawing && drawing.duration ? plotBottom : columnTop((d as any)[column.key])
        )
        .attr('width', barWidth / effectiveY.length)
        .attr('height', (d) =>
          drawing && drawing.duration
            ? 0
            : (d as any)[column.key]
            ? columnHeight((d as any)[column.key])
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
          .attr('y', (d) => columnTop((d as any)[column.key]))
          .attr('height', (d) =>
            Number.isFinite((d as any)[column.key])
              ? columnHeight((d as any)[column.key])
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
        .attr('clip-path', `url(#${clipId})`)
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
        ticks: effectiveY[0]?.axis?.ticks || (wholeNumbers && maxY !== undefined && maxY < 10 ? maxY : 5),
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
    // Hold the node: on unmount the cleanup runs after the svg has left the
    // document, so a lookup by id would find nothing to interrupt.
    const svg = select(`#${id}`).node();
    return () => {
      interruptTransitions(svg);
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

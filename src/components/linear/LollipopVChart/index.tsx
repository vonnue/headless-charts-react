import { max, min } from 'd3-array';
import { scaleBand, scaleLinear } from 'd3';
import { select, selectAll } from 'd3-selection';
import {
  symbol,
  symbolCircle,
  symbolCross,
  symbolDiamond,
  symbolSquare,
  symbolStar,
  symbolTriangle,
  symbolWye,
} from 'd3';
import { useCallback, useEffect } from 'react';

import { AxisConfig, ChartProps } from '@/types';
import { defaultChartClassNames } from '@/utils';
import {
  createTimeXScale,
  makeDateAccessor,
  padTimeDomain,
  useTimeAxisWarnings,
} from '@/utils/timeScale';
import { twMerge } from 'tailwind-merge';
import { drawAxis } from '@/hooks/useAxis';

export interface LollipopChartClassNames {
  points?: string;
  lines?: string;
  symbols?: string;
}

export interface LollipopVChartProps<TData = any> extends ChartProps<TData> {
  data: TData[];
  valueMin?: number;
  valueMax?: number;
  id: string;
  className?: string;
  classNames?: LollipopChartClassNames;
  margin?: {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
  };
  padding?: {
    left?: number;
    right?: number;
    bottom?: number;
    top?: number;
  };
  shape:
    | 'circle'
    | 'diamond'
    | 'triangle'
    | 'square'
    | 'cross'
    | 'star'
    | 'wye';
  x?: AxisConfig<TData>;
  y?: AxisConfig<TData>;
}

/* catalog:start */
/**
 * Vertical stems ending in a symbol, marking one value per category with far
 * less ink than a column.
 *
 * @remarks
 *
 * **Use when**
 * - A column chart would look heavy but the vertical orientation should be
 *   kept
 * - The value point matters more than magnitude-as-area
 * - Category labels are short enough to sit under vertical stems
 *
 * **Avoid when**
 * - Several measures need comparing per category — use ColumnChart
 * - Category labels are long — use LollipopHChart
 * - The axis is dense continuous time and the trend matters more than
 *   individual values — use LineChart; for a modest number of dated values
 *   use the time-scaled variant (`x.scalingFunction: "time"`)
 *
 * **Specialised types**
 * - Time-scaled lollipop chart — Set `x.scalingFunction: "time"` with
 *   `x.time.format`, or `x.time.isISO` for ISO strings. There is no bar
 *   width to derive — `x.time.barWidth` is not used by this chart. Set
 *   `x.time.utc: true` when dates are UTC instants or calendar days —
 *   otherwise they are parsed, placed and labelled in the viewer's local
 *   time zone.
 *
 * Also called: vertical lollipop chart, stem and dot chart.
 *
 * Answers: comparison, ranking. Required props: `id`, `data`, `x`, `y`, `shape`.
 *
 * @example
 * ```tsx
 * <LollipopVChart
 *   id="readings-by-name"
 *   className="w-full h-64"
 *   data={data}
 *   shape="circle"
 *   x={{ key: 'name', axis: { location: 'bottom' } }}
 *   y={{ key: 'reading', start: 0, axis: { location: 'left' } }}
 * />
 * ```
 *
 * @example Time-scaled lollipop chart
 * ```tsx
 * <LollipopVChart
 *   id="weekly-readings"
 *   className="w-full h-64"
 *   data={data}
 *   shape="circle"
 *   x={{ key: 'date', scalingFunction: 'time', time: { isISO: true, utc: true } }}
 *   y={{ key: 'reading', start: 0 }}
 * />
 * ```
 *
 * @see ColumnChart — multiple measures per category, or magnitude should
 *   read as area
 * @see LollipopHChart — category labels are long
 * @see ScatterPlot — both axes are numeric rather than one being
 *   categorical
 */
/* catalog:end */
const LollipopVChart = <TData = any,>({
  data = [],
  //   valueMin,
  valueMax,
  id,
  className,
  classNames,
  margin = {
    left: 40,
    right: 40,
    top: 40,
    bottom: 40,
  },
  padding = {
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
  },
  shape = 'circle',
  x = { key: 'x', axis: { location: 'bottom', ticks: 0 } },
  y = { key: 'y', axis: { location: 'left' } },
  style = {},
}: LollipopVChartProps<TData>) => {
  useTimeAxisWarnings('LollipopVChart', id, data, x, { checkBarWidth: false });
  const refreshChart = useCallback(() => {
    const svg = select(`#${id}`);
    // Clear svg
    svg.selectAll('*').remove();

    const width = +svg.style('width').split('px')[0];
    const height = +svg.style('height').split('px')[0];

    const shapeMapping = {
      circle: symbolCircle,
      diamond: symbolDiamond,
      triangle: symbolTriangle,
      square: symbolSquare,
      cross: symbolCross,
      star: symbolStar,
      wye: symbolWye,
    };

    const toDateTime = makeDateAccessor<TData>(x);
    const isTimeX = x.scalingFunction === 'time';
    // In time mode rows without a readable date are not drawn (dev warning
    // from useTimeAxisWarnings)
    const rows = isTimeX ? data.filter((d) => toDateTime(d) != null) : data;
    // Sorts in place, as before: in band mode `rows` is `data`, and the band
    // domain follows this order
    rows.sort((a, b) => (b as any)[y.key] - (a as any)[y.key]);
    const xRange: [number, number] = [
      (margin.left ?? 0) + (padding.left ?? 0),
      width - (margin.right ?? 0) - (padding.right ?? 0),
    ];

    // In time mode one scale positions the stems *and* draws the axis, so
    // stems sit on their ticks. Its date domain is padded by SYMBOL_INSET_PX
    // at each unpinned end so edge symbols don't overhang the plot (#16):
    // the largest bounding radius among this component's symbol shapes at the
    // fixed size=100 used below (star is the widest at ~9.44px; 10px covers
    // all of them).
    const SYMBOL_INSET_PX = 10;
    const timeXFn = isTimeX
      ? padTimeDomain(createTimeXScale(rows, x, toDateTime, xRange), SYMBOL_INSET_PX, x)
      : undefined;
    const bandXFn = scaleBand()
      .domain(rows.map((d) => String((d as Record<string, unknown>)[x.key])))
      .range(xRange);
    const xFn = timeXFn ?? bandXFn;

    const stemX = (d: TData): number =>
      timeXFn
        ? timeXFn(toDateTime(d) as Date)
        : (bandXFn(String((d as Record<string, unknown>)[x.key])) ?? 0) +
          bandXFn.bandwidth() / 2;

    const minValue = Number.isFinite(y.start)
      ? y.start
      : min(rows, (d) => (d as any)[y.key]);
    const maxValue = Number.isFinite(valueMax)
      ? valueMax
      : max(rows, (d) => (d as any)[y.key]);

    const yFn = scaleLinear()
      .domain([minValue, maxValue])
      .range([
        height - (margin.bottom ?? 0) - (padding.bottom ?? 0),
        (margin.top ?? 0) + (padding.top ?? 0),
      ]);

    const g = svg.append('g');

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
      config: y,
      dimensions: { width, height },
      margin,
      padding,
      orientation: 'vertical',
    });

    const dataGroup = g.append('g');
    const drawLinesAndCircles = () => {
      const pointGroup = dataGroup
        .selectAll('.line')
        .data(rows)
        .enter()
        .append('g');

      /* eslint-disable */
      pointGroup
        .append('line')
        .attr(
          'class',
          twMerge('line stroke-current', classNames?.points, classNames?.lines)
        )
        // @ts-ignore
        .attr('x1', (d) => stemX(d))
        .attr('y1', () => yFn(minValue))
        // @ts-ignore
        .attr('x2', (d) => stemX(d))
        .attr('y2', () => yFn(minValue))
        .transition()
        .duration(1000)
        .attr('y1', (d) => yFn((d as any)[y.key]));

      pointGroup
        .append('path')
        .attr(
          'class',
          twMerge('symbols fill-current', classNames?.points, classNames?.symbols)
        )
        .attr('d', () => symbol(shapeMapping[shape], 100)())
        .attr(
          'transform',
          (d) =>
            //@ts-ignore
            `translate(${stemX(d)},${yFn(
              minValue
            )})`
        )
        .transition()
        .duration(1000)
        .attr(
          'transform',
          (d) =>
            // @ts-ignore
            `translate(${stemX(d)},${yFn(
              (d as any)[y.key]
            )} )`
        );
    };
    /* eslint-enable */
    drawLinesAndCircles();
  }, [
    classNames,
    data,
    id,
    shape,
    valueMax,
    x,
    y,
    margin,
    padding,
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
      className={twMerge(defaultChartClassNames, className)}
    />
  );
};

export default LollipopVChart;

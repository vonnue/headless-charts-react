import { max, min } from 'd3-array';
import { scaleBand, scaleLinear, scaleTime } from 'd3';
import { isoParse, timeParse } from 'd3-time-format';
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
 * - The axis is continuous time — use LineChart
 *
 * **Specialised types**
 * - Time-scaled lollipop chart — Set `x.scalingFunction: "time"` with
 *   `x.time.format`, or `x.time.isISO` for ISO strings. There is no bar
 *   width to derive — `x.time.barWidth` is not used by this chart.
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
 *   x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
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
  const refreshChart = useCallback(() => {
    const svg = select(`#${id}`);
    // Clear svg
    svg.selectAll('*').remove();

    const width = +svg.style('width').split('px')[0];
    const height = +svg.style('height').split('px')[0];

    data.sort((a, b) => (b as any)[y.key] - (a as any)[y.key]);

    const shapeMapping = {
      circle: symbolCircle,
      diamond: symbolDiamond,
      triangle: symbolTriangle,
      square: symbolSquare,
      cross: symbolCross,
      star: symbolStar,
      wye: symbolWye,
    };

    const minValue = Number.isFinite(y.start)
      ? y.start
      : min(data, (d) => (d as any)[y.key]);
    const maxValue = Number.isFinite(valueMax)
      ? valueMax
      : max(data, (d) => (d as any)[y.key]);

    const d3Format = x.time?.format || '%Y-%m-%d';
    // No tooltip in this chart today, so `formatDate` (part of the shared
    // toDateTime/scale-selection pattern) has no consumer here — omitted to
    // avoid an unused-variable build failure. See Shared Contract §2/§4.
    const parseDate = timeParse(d3Format);

    const toDateTime = (d: any): Date =>
      x.time?.isISO ? (isoParse(d[x.key]) as Date) : (parseDate(d[x.key]) as Date);

    const isTimeX = x.scalingFunction === 'time';

    const xFn: any = isTimeX ? scaleTime().nice() : scaleBand();

    if (isTimeX) {
      xFn.domain([
        Number.isFinite(x.start)
          ? x.start
          : min(data.map((d: any) => toDateTime(d))),
        Number.isFinite(x.end)
          ? x.end
          : max(data.map((d: any) => toDateTime(d))),
      ]);
    } else {
      xFn.domain(data.map((d) => (d as any)[x.key]));
    }

    xFn.range([
      (margin.left ?? 0) + (padding.left ?? 0),
      width - (margin.right ?? 0) - (padding.right ?? 0),
    ]);

    // The axis must span the full margin-to-margin range (`xFn`, used by
    // `drawAxis` below), but a stem's symbol is a centered mark and needs a
    // narrower *mark* range so edge symbols don't overhang it (see #16).
    // Using one scale for both would either shrink the axis or let symbols
    // overhang — `markXFn` is a separate copy so each concern gets the range
    // it needs.
    let markXFn: any = xFn;
    if (isTimeX) {
      // A stem at the domain's min/max centers its symbol exactly on the
      // range edge, so the symbol renders half outside the plot bounds —
      // .nice() doesn't help here, since it niceifies the domain, not the
      // range (see #16). Inset by the largest bounding radius among this
      // component's symbol shapes at the fixed size=100 used below (star is
      // the widest at ~9.44px; 10px covers all of them with a hair to spare),
      // clamped so it can never invert the range on a degenerate/tiny chart.
      const SYMBOL_INSET_PX = 10;
      const [rangeStart, rangeEnd] = xFn.range();
      const inset = Math.min(
        SYMBOL_INSET_PX,
        Math.max(0, (rangeEnd - rangeStart) / 2 - 0.5)
      );
      markXFn = xFn.copy().range([rangeStart + inset, rangeEnd - inset]);
    }

    const centerX = (d: any) => markXFn(toDateTime(d));

    const stemX = (d: any) =>
      isTimeX ? centerX(d) : (xFn((d as any)[x.key]) as number) + xFn.bandwidth() / 2;

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
        .data(data)
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

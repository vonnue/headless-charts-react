import { axisBottom, scaleBand, scaleLinear, scaleTime } from 'd3';
import { max, min } from 'd3-array';
import { select, selectAll } from 'd3-selection';
import { useCallback, useEffect } from 'react';

import { AxisConfig, ChartProps } from '@/types';
import { defaultChartClassNames } from '@/utils';
import { twMerge } from 'tailwind-merge';

export interface TimeLineChartProps<TData = any> extends ChartProps<TData> {
  y?: AxisConfig<TData>;
  events: {
    isTime?: boolean;

    shapeKey?: Extract<keyof TData, string> | string;
    shapeMapping?: {
      [key: string]: 'circle' | 'rect' | 'line';
    };
    // Only for rects
    startKey: Extract<keyof TData, string> | string;
    endKey?: Extract<keyof TData, string> | string;

    classNameKey?: Extract<keyof TData, string> | string;
    classNameMapping?: object;
    // only for circles
    sizeKey?: Extract<keyof TData, string> | string;
  };
}

/* catalog:start */
/**
 * Places discrete events and durations on a shared time axis, one lane per
 * category.
 *
 * @remarks
 *
 * **Use when**
 * - The data is events with timestamps rather than a measured value sampled
 *   over time
 * - Durations need to be visible as spans — pass both `startKey` and
 *   `endKey`
 * - Activity should be compared across lanes, e.g. calls per line, jobs per
 *   worker
 * - Building a Gantt-style view of overlapping work
 *
 * **Avoid when**
 * - A continuous quantity is being tracked over time — use LineChart or
 *   AreaChart
 * - Only counts per period matter, not individual events — aggregate and use
 *   ColumnChart
 * - There is no time dimension at all — this chart has no meaning without
 *   one
 *
 * **Specialised types**
 * - Gantt chart — Pass both `events.startKey` and `events.endKey` with
 *   `events.isTime: true`, and set `y` to the lane key. Spans render as
 *   rects; overlapping work in a lane is visible as stacked bars.
 *
 * Also called: timeline, event plot, activity timeline.
 *
 * Answers: schedule, trend. Required props: `id`, `data`, `events`.
 *
 * @example
 * ```tsx
 * <TimeLineChart
 *   id="call-timeline"
 *   className="w-full h-64"
 *   data={data}
 *   y={{ key: 'agent' }}
 *   events={{
 *     startKey: 'callStartTime',
 *     endKey: 'callEndTime',
 *     isTime: true,
 *   }}
 * />
 * ```
 *
 * @see LineChart — tracking a measured value over time rather than
 *   discrete events
 * @see ColumnChart — event counts per period are enough
 * @see RangePlot — intervals are numeric ranges rather than moments in
 *   time
 */
/* catalog:end */
const TimeLineChart = <TData = any,>({
  id,
  data,
  className,
  events = {
    startKey: 'start',
  },
  padding = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    bar: 0.1,
  },
  margin = {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20,
  },
  y,
  style = {},
}: TimeLineChartProps<TData>) => {
  const refreshChart = useCallback(() => {
    if (!data || data.length === 0) return;

    const svg = select(`#${id}`);
    svg.selectAll('*').remove();

    const width = +svg.style('width').split('px')[0],
      height = +svg.style('height').split('px')[0];

    const xFn = events?.isTime ? scaleTime() : scaleLinear();

    const minVal = min(data, (d: any) => d[events.startKey]);
    const maxVal = max(data, (d: any) =>
      events?.endKey ? d[events.endKey] : d[events.startKey]
    );

    xFn
      .domain([
        // @ts-ignore
        events?.isTime
          ? // @ts-ignore
            new Date(minVal)
          : // @ts-ignore
            minVal ?? 0,
        // @ts-ignore
        events?.isTime
          ? // @ts-ignore
            new Date(maxVal)
          : // @ts-ignore
            maxVal ?? 0,
      ])
      // @ts-ignore
      .range([
        (padding.left || 0) + (margin.left ?? 0),
        width - (padding.right || 0) - (margin.right ?? 0),
      ]);

    const g = svg.append('g');

    const listOfYValues = [
      // @ts-ignore
      ...new Set(data.map((d) => (y?.key ? d[y?.key] : 1))),
    ];

    const yFn = scaleBand()
      .domain(listOfYValues)
      .range([
        (padding.top || 0) + (margin.top ?? 0),
        height - (padding.bottom || 0) - (margin.bottom ?? 0),
      ])
      .padding(padding.bar || 0.1);

    g.append('g')
      .selectAll('rect')
      .data(listOfYValues)
      .enter()
      .append('rect')
      .attr('class', `track ${y?.className || ''}`)
      .attr('x', (padding.left || 0) + (margin.left ?? 0))
      .attr('y', (d) => yFn(d) || 0)
      .attr(
        'width',
        width -
          (padding.right || 0) -
          (margin.right ?? 0) -
          (padding.left || 0) -
          (margin.left ?? 0)
      )
      .attr('height', yFn.bandwidth());

    const augmentedDataWithShapeClassNameAndSize = (data || []).map((d) => {
      const shape = events?.shapeMapping
        ? // @ts-ignore
          events?.shapeMapping[d[events?.shapeKey]]
        : events?.endKey
        ? 'rect'
        : 'circle';

      // @ts-ignore
      const eventWidth =
        shape === 'rect' && events?.endKey
          ? // @ts-ignore
            xFn(
              events.isTime
                ? new Date((d as any)[events.endKey])
                : (d as any)[events.endKey]
            ) -
            xFn(
              events.isTime
                ? new Date((d as any)[events.startKey])
                : (d as any)[events.startKey]
            )
          : 0;

      const className = events?.classNameMapping
        ? // @ts-ignore
          events?.classNameMapping[d[events?.classNameKey]]
        : '';
      // @ts-ignore
      const size = events?.sizeKey ? d[events?.sizeKey] : 5;

      return {
        ...d,
        shape,
        className,
        size,
        eventWidth,
      };
    });

    // Render events (circles or rects)
    g.selectAll('.event')
      .data(augmentedDataWithShapeClassNameAndSize)
      .enter()
      .append((d: any) => {
        return d.shape === 'rect'
          ? document.createElementNS('http://www.w3.org/2000/svg', 'rect')
          : document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      })
      .attr('class', (d: any) => `event fill-current ${d.className}`)
      .attr('x', (d: any) =>
        d.shape === 'rect'
          ? xFn(
              events.isTime ? new Date(d[events.startKey]) : d[events.startKey]
            )
          : null
      )
      .attr('cx', (d: any) =>
        d.shape === 'circle'
          ? xFn(
              events.isTime ? new Date(d[events.startKey]) : d[events.startKey]
            )
          : null
      )
      .attr('cy', (d: any) =>
        d.shape === 'circle'
          ? (yFn(d[y?.key || 1]) || 0) + yFn.bandwidth() / 2
          : null
      )
      .attr('y', (d: any) =>
        d.shape === 'rect'
          ? (yFn(d[y?.key || 1]) || 0) + yFn.bandwidth() / 4
          : null
      )
      .attr('r', (d: any) => (d.shape === 'circle' ? d.size : null))
      .attr('width', (d: any) => (d.shape === 'rect' ? d.eventWidth : null))
      .attr('height', (d: any) =>
        d.shape === 'rect' ? yFn.bandwidth() / 2 : null
      );

    const xAxis = axisBottom(xFn);

    g.append('g')
      .attr('transform', `translate(0, ${height - (margin.bottom ?? 0)})`)
      .call(xAxis);
  }, []);

  useEffect(() => {
    refreshChart();
    return () => {
      selectAll(`#tooltip-${id}`).remove();
    };
  }, [data, id, className]);

  return (
    <svg
      id={id}
      style={style}
      className={twMerge(defaultChartClassNames, className)}></svg>
  );
};

export default TimeLineChart;

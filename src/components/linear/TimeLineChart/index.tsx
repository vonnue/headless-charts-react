import { axisBottom, scaleBand, scaleLinear, scaleTime } from 'd3';
import { max, min } from 'd3-array';
import { select, selectAll } from 'd3-selection';
import { useCallback, useEffect } from 'react';

import { ChartProps } from '../../../types';
import { defaultChartClassNames } from '../../../utils';
import { twMerge } from 'tailwind-merge';

interface TimeLineChartProps<TData = any> extends ChartProps<TData> {
  y?: {
    key: Extract<keyof TData, string> | string;
    className?: string;
  };
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
    const svg = select(`#${id}`);
    svg.selectAll('*').remove();

    const width = +svg.style('width').split('px')[0],
      height = +svg.style('height').split('px')[0];

    const xFn = events?.isTime ? scaleTime() : scaleLinear();

    xFn
      .domain([
        // @ts-ignore
        events?.isTime
          ? // @ts-ignore
            new Date(min(data, (d) => d[events.startKey]))
          : // @ts-ignore
            min(data, (d) => d[events.startKey]),
        // @ts-ignore
        events?.isTime
          ? // @ts-ignore
            new Date(max(data, (d) => d[events?.endKey]))
          : // @ts-ignore
            max(data, (d) => d[events?.startKey]),
      ])
      // @ts-ignore
      .range([
        (padding.left || 0) + margin.left,
        width - (padding.right || 0) - margin.right,
      ]);

    const g = svg.append('g');

    const listOfYValues = [
      // @ts-ignore
      ...new Set(data.map((d) => (y?.key ? d[y?.key] : 1))),
    ];

    const yFn = scaleBand()
      .domain(listOfYValues)
      .range([
        (padding.top || 0) + margin.top,
        height - (padding.bottom || 0) - margin.bottom,
      ])
      .padding(padding.bar || 0.1);

    g.append('g')
      .selectAll('rect')
      .data(listOfYValues)
      .enter()
      .append('rect')
      .attr('class', `track ${y?.className || ''}`)
      .attr('x', (padding.left || 0) + margin.left)
      .attr('y', (d) => yFn(d) || 0)
      .attr(
        'width',
        width -
          (padding.right || 0) -
          margin.right -
          (padding.left || 0) -
          margin.left
      )
      .attr('height', yFn.bandwidth());

    const augmentedDataWithShapeClassNameAndSize = data.map((d) => {
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
      .attr('transform', `translate(0, ${height - margin.bottom})`)
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

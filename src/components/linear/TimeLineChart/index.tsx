import { scaleBand, scaleLinear, scaleTime } from 'd3-scale';
import { max, min } from 'd3-array';
import { select, selectAll } from 'd3-selection';
import { useCallback, useEffect } from 'react';

import { AxisConfig, ChartProps, TooltipConfig } from '@/types';
import { defaultChartClassNames } from '@/utils';
import { drawAxis } from '@/hooks/useAxis';
import useTooltip from '@/hooks/useTooltip';
import { twMerge } from 'tailwind-merge';

export interface TimeLineChartProps<TData = any> extends ChartProps<TData> {
  /** Categorical axis defining the swim lanes (y). */
  y?: AxisConfig<TData>;
  /** Tooltip configuration. */
  tooltip?: TooltipConfig;
  /** Minimum rendered width (in px) for rect events so short events stay visible. */
  minEventWidth?: number;
  /** Default radius (in px) for circle events when no `sizeKey` is supplied. */
  defaultEventSize?: number;
  events: {
    /** When true, `startKey`/`endKey` values are parsed as dates. */
    isTime?: boolean;

    /** Key whose value selects a shape via `shapeMapping`. */
    shapeKey?: Extract<keyof TData, string> | string;
    shapeMapping?: {
      [key: string]: 'circle' | 'rect' | 'line';
    };
    // Start time/value of the event (required)
    startKey: Extract<keyof TData, string> | string;
    // End time/value of the event (only used by rects / lines)
    endKey?: Extract<keyof TData, string> | string;

    /** Key whose value selects a className via `classNameMapping` (colours). */
    classNameKey?: Extract<keyof TData, string> | string;
    classNameMapping?: {
      [key: string]: string;
    };
    // only for circles
    sizeKey?: Extract<keyof TData, string> | string;
  };
}

const TimeLineChart = <TData = any,>({
  id,
  data = [],
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
    bottom: 30,
    left: 60,
  },
  y,
  tooltip = undefined,
  minEventWidth = 2,
  defaultEventSize = 5,
  style = {},
}: TimeLineChartProps<TData>) => {
  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: (d: any) =>
      `${y?.key ? `${d[y.key]}<br/>` : ''}${d[events.startKey]}${
        events.endKey ? ` → ${d[events.endKey]}` : ''
      }`,
  });

  const refreshChart = useCallback(() => {
    if (!data || data.length === 0) return;

    const svg = select(`#${id}`);
    svg.selectAll('*').remove();

    const width = +svg.style('width').split('px')[0],
      height = +svg.style('height').split('px')[0];

    if (!width || !height) return;

    const { startKey, endKey, isTime } = events;

    // Parse a raw value into something the scale understands.
    const parse = (v: any) => (isTime ? new Date(v) : v);

    const startValues = data.map((d: any) => parse(d[startKey]));
    const endValues = endKey
      ? data.map((d: any) => parse(d[endKey]))
      : startValues;

    let minVal: any = min(startValues as any);
    let maxVal: any = max(endValues as any);

    // Guard against a collapsed domain (single point in time / value).
    if (minVal == null) minVal = isTime ? new Date() : 0;
    if (maxVal == null) maxVal = minVal;
    if (+minVal === +maxVal) {
      if (isTime) {
        minVal = new Date(+minVal - 1000);
        maxVal = new Date(+maxVal + 1000);
      } else {
        minVal = minVal - 1;
        maxVal = maxVal + 1;
      }
    }

    const xFn: any = isTime ? scaleTime() : scaleLinear();
    xFn.domain([minVal, maxVal]).range([
      (padding.left || 0) + (margin.left ?? 0),
      width - (padding.right || 0) - (margin.right ?? 0),
    ]);

    const xOf = (v: any) => (xFn as any)(parse(v)) as number;

    const g = svg.append('g');

    const listOfYValues = [
      ...new Set(data.map((d: any) => (y?.key ? d[y.key] : 'events'))),
    ];

    const yFn = scaleBand<any>()
      .domain(listOfYValues)
      .range([
        (padding.top || 0) + (margin.top ?? 0),
        height - (padding.bottom || 0) - (margin.bottom ?? 0),
      ])
      .padding(padding.bar || 0.1);

    const laneOf = (d: any) => (y?.key ? d[y.key] : 'events');

    // Swim lane background tracks
    g.append('g')
      .selectAll('rect')
      .data(listOfYValues)
      .enter()
      .append('rect')
      .attr('class', twMerge('track', y?.className))
      .attr('x', (padding.left || 0) + (margin.left ?? 0))
      .attr('y', (d) => yFn(d) || 0)
      .attr(
        'width',
        Math.max(
          0,
          width -
            (padding.right || 0) -
            (margin.right ?? 0) -
            (padding.left || 0) -
            (margin.left ?? 0)
        )
      )
      .attr('height', yFn.bandwidth());

    const augmentedData = data.map((d: any) => {
      const shape: 'circle' | 'rect' | 'line' = events.shapeMapping
        ? events.shapeMapping[d[events.shapeKey as string]] ||
          (endKey ? 'rect' : 'circle')
        : endKey
        ? 'rect'
        : 'circle';

      const startX = xOf(d[startKey]);
      const endX = endKey != null ? xOf(d[endKey]) : startX;

      const eventWidth =
        shape === 'rect'
          ? Math.max(minEventWidth, endX - startX)
          : Math.max(0, endX - startX);

      const eventClassName = events.classNameMapping
        ? events.classNameMapping[d[events.classNameKey as string]] || ''
        : '';

      const size = events.sizeKey ? d[events.sizeKey] : defaultEventSize;

      return { ...d, shape, startX, endX, eventWidth, eventClassName, size };
    });

    // Render events (rect / circle / line)
    g.append('g')
      .selectAll('.event')
      .data(augmentedData)
      .enter()
      .append((d: any) =>
        document.createElementNS(
          'http://www.w3.org/2000/svg',
          d.shape === 'circle' ? 'circle' : d.shape === 'line' ? 'line' : 'rect'
        )
      )
      .attr('class', (d: any) =>
        twMerge('event fill-current stroke-current', d.eventClassName)
      )
      // rect
      .attr('x', (d: any) => (d.shape === 'rect' ? d.startX : null))
      .attr('y', (d: any) =>
        d.shape === 'rect'
          ? (yFn(laneOf(d)) || 0) + yFn.bandwidth() / 4
          : null
      )
      .attr('width', (d: any) => (d.shape === 'rect' ? d.eventWidth : null))
      .attr('height', (d: any) =>
        d.shape === 'rect' ? yFn.bandwidth() / 2 : null
      )
      // circle
      .attr('cx', (d: any) => (d.shape === 'circle' ? d.startX : null))
      .attr('cy', (d: any) =>
        d.shape === 'circle'
          ? (yFn(laneOf(d)) || 0) + yFn.bandwidth() / 2
          : null
      )
      .attr('r', (d: any) => (d.shape === 'circle' ? d.size : null))
      // line
      .attr('x1', (d: any) => (d.shape === 'line' ? d.startX : null))
      .attr('x2', (d: any) => (d.shape === 'line' ? d.endX : null))
      .attr('y1', (d: any) =>
        d.shape === 'line' ? (yFn(laneOf(d)) || 0) + yFn.bandwidth() / 2 : null
      )
      .attr('y2', (d: any) =>
        d.shape === 'line' ? (yFn(laneOf(d)) || 0) + yFn.bandwidth() / 2 : null
      )
      .on('mouseenter', onMouseOver)
      .on('mousemove', onMouseMove)
      .on('mouseleave', onMouseLeave);

    // y-axis (swim lane labels)
    if (y?.key) {
      drawAxis({
        g,
        scale: yFn,
        config: y,
        dimensions: { width, height },
        margin,
        padding,
        orientation: 'vertical',
      });
    }

    // x-axis (time / value)
    drawAxis({
      g,
      scale: xFn,
      config: {
        key: startKey,
        axis: { location: 'bottom', ticks: 5 },
      },
      dimensions: { width, height },
      margin,
      padding,
      orientation: 'horizontal',
    });
  }, [
    data,
    id,
    events,
    y,
    margin,
    padding,
    minEventWidth,
    defaultEventSize,
    onMouseOver,
    onMouseMove,
    onMouseLeave,
  ]);

  useEffect(() => {
    refreshChart();
    return () => {
      selectAll(`#tooltip-${id}`).remove();
    };
  }, [refreshChart, id]);

  return (
    <svg
      id={id}
      style={style}
      data-testid='timeline-chart'
      className={twMerge(defaultChartClassNames, className)}></svg>
  );
};

export default TimeLineChart;

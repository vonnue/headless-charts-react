import { axisBottom, axisLeft, axisRight, axisTop } from 'd3-axis';
import { defaultChartClassNames } from '@/utils';
import { twMerge } from 'tailwind-merge';
import { max, sum } from 'd3-array';
import { select, selectAll } from 'd3-selection';
import useTooltip from '@/hooks/useTooltip';
import { scaleBand, scaleLinear } from 'd3-scale';
import { useCallback, useEffect } from 'react';

import { AxisConfig, ChartProps, TooltipConfig } from '@/types';
import { transition } from 'd3-transition';

interface SpineYConfig<TData = any> extends Omit<AxisConfig<TData>, 'axis'> {
  axis?: {
    location?: 'left' | 'right' | 'middle';
    label?: string;
    ticks?: number;
  };
}

export interface SpineChartProps<TData = any> extends Omit<ChartProps<TData>, 'margin'> {
  paddingBar?: number;
  margin?: {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
    middle?: number;
  };
  y: SpineYConfig<TData>;
  x: Array<
    AxisConfig<TData> & { direction?: 'left' | 'right'; label?: string }
  >;
  axisTicks?: number;
  xAxis?: 'top' | 'bottom';
  tooltip?: TooltipConfig;
}

const SpineChart = <TData = any,>({
  data = [],
  id,
  className,
  paddingBar = 0.3,
  padding = {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  margin = {
    top: 40,
    bottom: 40,
    left: 40,
    right: 20,
    middle: 60,
  },
  y = {
    key: '',
    axis: { location: 'middle' },
    className: '',
  },
  x,
  axisTicks = 5,
  xAxis = 'bottom',
  tooltip = undefined,
  style = {},
}: SpineChartProps<TData>) => {
  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: (d: any) =>
      `${d[y.key]} <br/> ${x.map((col) => `${col.key}: ${d[col.key]}`).join('<br/>')}`,
  });

  const refreshChart = useCallback(() => {
    const svg = select(`#${id}`);
    svg.selectAll('*').remove();

    const width = +svg.style('width').split('px')[0],
      height = +svg.style('height').split('px')[0];

    const g = svg.append('g');

    const leftSeries = x.filter((column) => column.direction === 'left'),
      rightSeries = x.filter((column) => column.direction !== 'left');

    /* eslint-disable */
    // @ts-ignore
    const extreme = max([
      // @ts-ignore
      max(data.map((row) => sum(leftSeries.map((column) => row[column.key])))),
      // @ts-ignore
      max(data.map((row) => sum(rightSeries.map((column) => row[column.key])))),
    ]);

    const halfWidth =
      (width -
        (padding.left ?? 0) -
        (margin.left ?? 0) -
        (padding.right ?? 0) -
        (margin.right ?? 0)) /
      2;

    const yAxisLocation = y.axis?.location || 'middle';

    const xLeftFn = scaleLinear()
      // @ts-ignore
      .domain([0, extreme])
      .range([
        (padding.left ?? 0) +
          (margin.left ?? 0) +
          halfWidth -
          (['left', 'right'].includes(yAxisLocation)
            ? 0
            : (margin.middle || 100) / 2),
        (padding.left ?? 0) + (margin.left ?? 0),
      ]);

    const xRightFn = scaleLinear()
      // @ts-ignore
      .domain([0, extreme])
      .range([
        (padding.left ?? 0) +
          (margin.left ?? 0) +
          halfWidth +
          (['left', 'right'].includes(yAxisLocation)
            ? 0
            : (margin.middle || 100) / 2),
        width - (margin.right ?? 0),
      ]);

    const xLeftAxis =
      // @ts-ignore
      xAxis === 'top'
        ? // @ts-ignore
          axisTop(xLeftFn).ticks(axisTicks)
        : // @ts-ignore
          axisBottom(xLeftFn).ticks(axisTicks);

    const xRightAxis =
      // @ts-ignore
      xAxis === 'top'
        ? // @ts-ignore
          axisTop(xRightFn).ticks(axisTicks)
        : // @ts-ignore
          axisBottom(xRightFn).ticks(axisTicks);

    const xRightAxisG = g.append('g').attr('class', 'right-axis--x axis');

    g.append('line')
      .attr('x1', xLeftFn(0))
      .attr('x2', xLeftFn(0))
      .attr('y1', margin.top ?? 0)
      .attr('y2', height - (margin.bottom ?? 0))
      .attr('class', 'stroke-current stroke-1');

    const yFn = scaleBand()
      // @ts-ignore
      .domain(data.map((d) => d[y.key]))
      .range([
        (margin.top ?? 0) + (padding.top ?? 0),
        height - (padding.bottom ?? 0) - (margin.bottom ?? 0),
      ])
      .padding(paddingBar);

    transition();

    leftSeries.map((column, i) => {
      const barsG = g.append('g');
      const columns = leftSeries.filter((_, idx) => idx >= i).map((c) => c.key);
      barsG
        .selectAll('g')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', `${column.className} fill-current`)
        // @ts-ignore
        .attr('y', (d) => yFn(d[y.key]))
        .attr('x', xLeftFn(0))
        .attr('width', 0)
        .attr('height', yFn.bandwidth())
        .on('mouseenter', onMouseOver)
        .on('mousemove', onMouseMove)
        .on('mouseleave', onMouseLeave)
        .transition()
        .duration(1000)
        // @ts-ignore
        .attr('x', (d) => xLeftFn(sum(columns.map((c) => d[c]))))
        .attr(
          'width',
          // @ts-ignore
          (d) => xLeftFn(0) - xLeftFn(sum(columns.map((c) => d[c])))
        );
    });
    rightSeries.map((column, i) => {
      const barsG = g.append('g');
      const columns = rightSeries
        .filter((_, idx) => idx >= i)
        .map((c) => c.key);
      // const bars =
      barsG
        .selectAll('g')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', `${column.className} fill-current`)
        .attr('x', () => xRightFn(0))
        .attr('z-index', 100 - i)
        // @ts-ignore
        .attr('y', (d) => yFn(d[y.key]))
        .attr('height', yFn.bandwidth())
        .on('mouseenter', onMouseOver)
        .on('mousemove', onMouseMove)
        .on('mouseleave', onMouseLeave)
        .transition()
        .duration(1000)
        .attr(
          'width',
          // @ts-ignore
          (d) => xRightFn(sum(columns.map((c) => d[c]))) - xRightFn(0)
        );
    });

    // Draw axis

    xRightAxisG
      .attr(
        'transform',
        // @ts-ignore
        `translate(0, ${
          xAxis === 'top' ? margin.top ?? 0 : height - (margin.bottom ?? 0)
        })`
      )
      .call(xRightAxis);

    const xLeftAxisG = g.append('g').attr('class', 'left-axis--x axis ');

    xLeftAxisG
      .attr(
        'transform',
        // @ts-ignore
        `translate(0, ${
          xAxis === 'top' ? margin.top ?? 0 : height - (margin.bottom ?? 0)
        })`
      )
      .call(xLeftAxis);

    xLeftAxisG
      .append('text')
      .text(leftSeries.map((c) => c.label || c.key).join(', '))
      .attr('class', 'fill-current')
      .attr('x', 0)
      .attr('y', xAxis === 'top' ? -20 : 30)
      .attr('text-anchor', 'start');

    xRightAxisG
      .append('text')
      .text(rightSeries.map((c) => c.label || c.key).join(', '))
      .attr('class', 'fill-current')
      .attr('x', width)
      .attr('y', xAxis === 'top' ? -20 : 30)
      .attr('text-anchor', 'end');

    const yAxis = yAxisLocation === 'right' ? axisRight(yFn) : axisLeft(yFn);
    const yAxisG = g
      .append('g')
      .attr('class', 'yAxis axis')
      .attr(
        'transform',
        `translate(${
          yAxisLocation === 'left'
            ? margin.left ?? 0
            : yAxisLocation === 'right'
            ? width - (margin.right ?? 0)
            : (margin.left ?? 0) + halfWidth + (margin.middle ?? 0) / 2
        },0)`
      )
      .call(yAxis);

    yAxisG
      .append('text')
      .text(y.axis?.label || y.key)
      .attr('class', 'fill-current')
      .attr(
        'x',
        yAxisLocation === 'left' ? -20 : yAxisLocation === 'right' ? 20 : -20
      )
      .attr('y', xAxis === 'top' ? margin.top ?? 0 : height - (margin.bottom ?? 0));
  }, [data, x, padding, margin, paddingBar, y, onMouseOver, onMouseMove, onMouseLeave]);

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

export default SpineChart;

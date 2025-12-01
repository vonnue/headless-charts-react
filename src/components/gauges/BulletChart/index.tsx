import { useCallback, useEffect, useRef } from 'react';

import { axisBottom } from 'd3-axis';
import { defaultChartClassNames } from '@/utils';
import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { transition } from 'd3-transition';
import { twMerge } from 'tailwind-merge';
import { GaugeProps } from '@/types';

export interface BulletChartClassNames {
  data?: string;
  base?: string;
  target?: string;
  threshold?: string;
  max?: string;
}

export interface BulletChartProps<TData = any> extends GaugeProps<TData> {
  classNames?: BulletChartClassNames;
  label?: string;
  min?: number;
  base: number;
  target: number;
  threshold: number;
  max: number;
  axisHeight?: number;
  height?: number;
}

const defaultClassNames: BulletChartClassNames = {
  data: 'fill-blue-500 stroke-blue-500',
  base: 'fill-gray-300 dark:fill-gray-500 dark:stroke-gray-500',
  target: 'fill-black stroke-black dark:fill-white dark:stroke-white',
  threshold: 'fill-gray-200 stroke-gray-200 dark:fill-gray-600 dark:stroke-gray-600',
  max: 'fill-gray-100 stroke-grey-100 dark:fill-gray-700 dark:stroke-gray-700',
};

const BulletChart = <TData = any,>({
  id,
  className,
  data = 0 as any,
  classNames,
  label = '',
  min = 0,
  base,
  target,
  threshold,
  max,
  margin = {
    left: 120,
    top: 10,
    right: 20,
    bottom: 0,
  },
  style = {},
  axisHeight = 20,
  height = 50,
}: BulletChartProps<TData>) => {
  const mergedClassNames = { ...defaultClassNames, ...classNames };
  const previousData = useRef(0);
  const refreshChart = useCallback(() => {
    const svg = select(`#${id}`);

    svg.selectAll('*').remove();

    const width = +svg.style('width').split('px')[0];

    const xFn = scaleLinear()
      .domain([min, max])
      .range([0, width - (margin.left ?? 0) - (margin.right ?? 0)]);

    const g = svg.append('g');

    g.append('text')
      .text(label)
      .attr('class', twMerge(`fill-current stroke-current `, className))
      .attr('text-anchor', 'end')
      .attr('font-size', '0.8em')
      .attr('x', (margin.left ?? 0) - 10)
      .attr('y', height - axisHeight - 5);

    const bulletG = g
      .append('g')
      .attr('transform', `translate(${margin.left}, 0)`);

    bulletG
      .append('rect')
      .attr('class', twMerge('fill-current stroke-current ', mergedClassNames.max))
      .attr('x', xFn(min))
      .attr('y', 0)
      .attr('width', xFn(max))
      .attr('height', height - axisHeight);

    bulletG
      .append('rect')
      .attr(
        'class',
        twMerge('fill-current stroke-current ', mergedClassNames.threshold)
      )
      .attr('x', xFn(min))
      .attr('y', 0)
      .attr('width', xFn(threshold))
      .attr('height', height - axisHeight);

    bulletG
      .append('rect')
      .attr('class', twMerge('fill-current stroke-current ', mergedClassNames.base))
      .attr('x', xFn(min))
      .attr('y', 0)
      .attr('width', xFn(base))
      .attr('height', height - axisHeight);

    bulletG
      .append('line')
      .attr('y1', 5)
      .attr('y2', height - axisHeight - 5)
      .attr('x1', xFn(target))
      .attr('x2', xFn(target))
      .attr('class', twMerge('stroke-1 stroke-current ', mergedClassNames.target));

    transition();

    bulletG
      .append('rect')
      .attr('class', twMerge('fill-current stroke-current ', mergedClassNames.data))
      .attr('x', xFn(min))
      .attr('y', margin.top ?? 0)
      .attr('width', xFn(previousData.current) - xFn(min))
      .attr('height', height - axisHeight - (margin.top ?? 0) * 2)
      .transition()
      .duration(1000)
      .attr('width', xFn(data) - xFn(min));

    const xAxisG = g.append('g').attr('class', 'axis--x axis ');

    const xAxis = axisBottom(xFn).ticks(5);

    xAxisG
      .attr('transform', `translate(${margin.left}, ${height - axisHeight})`)
      .call(xAxis);

    previousData.current = data;
  }, [
    axisHeight,
    base,
    className,
    mergedClassNames,
    data,
    height,
    id,
    label,
    margin.left,
    margin.right,
    margin.top,
    max,
    min,
    target,
    threshold,
  ]);
  useEffect(() => {
    refreshChart();
  }, [data, refreshChart]);

  return (
    <svg
      id={id}
      style={style}
      className={twMerge(defaultChartClassNames, `h-12`, className)}
    />
  );
};

export default BulletChart;

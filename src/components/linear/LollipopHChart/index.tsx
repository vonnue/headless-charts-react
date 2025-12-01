import { useCallback, useEffect } from 'react';
import { max, min } from 'd3-array';
import { select, selectAll } from 'd3-selection';
import { scaleLinear, scalePoint } from 'd3-scale';
import {
  symbol,
  symbolCircle,
  symbolCross,
  symbolDiamond,
  symbolSquare,
  symbolStar,
  symbolTriangle,
  symbolWye,
} from 'd3-shape';

import { AxisConfig, ChartProps, TooltipConfig } from '@/types';
import { defaultChartClassNames } from '@/utils';
import { transition } from 'd3-transition';
import { twMerge } from 'tailwind-merge';
import useTooltip from '@/hooks/useTooltip';
import { drawAxis } from '@/hooks/useAxis';

export interface LollipopChartClassNames {
  points?: string;
  lines?: string;
  symbols?: string;
}

export interface LollipopHChartProps<TData = any> extends ChartProps<TData> {
  data: TData[];
  classNames?: LollipopChartClassNames;
  tooltip?: TooltipConfig;
  shape?:
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

const LollipopHChart = <TData = any,>({
  data = [],
  id,
  className,
  classNames,
  margin = {
    left: 80,
    right: 40,
    top: 40,
    bottom: 40,
  },
  padding = {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  tooltip = undefined,
  shape = 'circle',
  x = { key: 'x', axis: { location: 'bottom', ticks: 2 } },
  y = { key: 'y', axis: { location: 'left' } },
  style = {},
}: LollipopHChartProps<TData>) => {
  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: (d: any) => `${d[y.key]}: ${d[x.key]}`,
  });

  const refreshChart = useCallback(() => {
    const svg = select(`#${id}`);

    // Clear svg

    svg.selectAll('*').remove();

    const width = +svg.style('width').split('px')[0],
      height = +svg.style('height').split('px')[0];

    data.sort((a: any, b: any) => b[x.key] - a[x.key]);

    const shapeMapping = {
      circle: symbolCircle,
      diamond: symbolDiamond,
      triangle: symbolTriangle,
      square: symbolSquare,
      cross: symbolCross,
      star: symbolStar,
      wye: symbolWye,
    };

    const xFn = scaleLinear()
      .domain([
        Number.isFinite(x.start) ? x.start : min(data, (d: any) => d[x.key]),
        Number.isFinite(x.end) ? x.end : max(data, (d: any) => d[x.key]),
      ])
      .range([
        (margin.left || 0) + (padding.left || 0),
        width - (padding.right || 0) - (margin.right || 0),
      ]);

    const yFn = scalePoint()
      .domain(data.map((d: any) => d[y.key]))
      .range([
        (margin.top || 0) + (padding.top || 0),
        height - (margin.bottom || 0) - (padding.bottom || 0),
      ])
      .padding(0.5);

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
        .append('g')
        .on('mouseenter', onMouseOver)
        .on('mousemove', onMouseMove)
        .on('mouseleave', onMouseLeave);

      transition();

      pointGroup
        .append('line')
        .attr(
          'class',
          twMerge(
            'stroke-2 stroke-current',
            classNames?.points,
            classNames?.lines
          )
        )
        .attr('x1', (margin.left || 0) + (padding.left || 0))
        .attr('y1', (d: any) => yFn(d[y.key]) || 0)
        .attr('x2', margin.left || 0)
        .attr('y2', (d: any) => yFn(d[y.key]) || 0)
        .transition()
        .duration(1000)
        .attr('x2', (d: any) => xFn(d[x.key]));

      pointGroup
        .append('path')
        .attr('class', twMerge(classNames?.points, classNames?.symbols))
        .attr('d', () => symbol(shapeMapping[shape], 100)())
        .attr(
          'transform',
          (d: any) =>
            `translate(${(margin.left || 0) + (padding.left || 0)},${yFn(
              d[y.key]
            )})`
        )
        .transition()
        .duration(1000)
        .attr(
          'transform',
          (d: any) => `translate(${xFn(d[x.key])},${yFn(d[y.key])} )`
        );
    };

    drawLinesAndCircles();
  }, [
    classNames,
    data,
    id,
    margin,
    padding,
    shape,
    x,
    y,
    onMouseOver,
    onMouseMove,
    onMouseLeave,
  ]);

  useEffect(() => {
    refreshChart();
    return () => {
      selectAll(`#tooltip-${id}`).remove();
    };
  }, [data, refreshChart, id]);
  return (
    <svg
      id={id}
      style={style}
      className={twMerge(defaultChartClassNames, className)}
      data-testid='lollipop-h-chart'
    />
  );
};

export default LollipopHChart;

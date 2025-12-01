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

    const xFn = scaleBand()
      .domain(data.map((d) => (d as any)[x.key]))
      .range([
        (margin.left ?? 0) + (padding.left ?? 0),
        width - (margin.right ?? 0) - (padding.right ?? 0),
      ]);

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
        .attr('x1', (d) => xFn((d as any)[x.key]) + xFn.bandwidth() / 2)
        .attr('y1', () => yFn(minValue))
        // @ts-ignore
        .attr('x2', (d) => xFn((d as any)[x.key]) + xFn.bandwidth() / 2)
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
            `translate(${xFn((d as any)[x.key]) + xFn.bandwidth() / 2},${yFn(
              minValue
            )})`
        )
        .transition()
        .duration(1000)
        .attr(
          'transform',
          (d) =>
            // @ts-ignore
            `translate(${xFn((d as any)[x.key]) + xFn.bandwidth() / 2},${yFn(
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

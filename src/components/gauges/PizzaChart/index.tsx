/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { arc, interpolateNumber, pie, scaleLinear, transition } from 'd3';
import { select, selectAll } from 'd3-selection';
import { useCallback, useEffect } from 'react';
import useTooltip from '@/hooks/useTooltip';

import { GaugeProps } from '@/types';
import { defaultChartClassNames } from '@/utils';
import { twMerge } from 'tailwind-merge';

export interface PizzaChartProps<TData = any> extends Omit<GaugeProps<TData>, 'data'> {
  data: TData;
  max?: number;
  min?: number;
  paddingAngle?: number;
  cornerRadius?: number;
  metrics: {
    key: Extract<keyof TData, string> | string;
    className?: string;
    classNameBackground?: string;
  }[];
}

const PizzaChart = <TData = any,>({
  data = {} as TData,
  className,
  id,
  margin = { top: 20, bottom: 20, left: 20, right: 20 },
  max = 1,
  min = 0,
  drawing = undefined,
  paddingAngle = 2,
  cornerRadius = 0,
  metrics = [],
  tooltip,
  style = {},
}: PizzaChartProps<TData>) => {
  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: (d: any) =>
      `<div class="text-gray-800">${metrics[d.index].key} = ${
        (data as any)[metrics[d.index].key]
      }</div>`,
  });
  const refreshChart = useCallback(() => {
    const svg = select(`#${id}`);

    svg.selectAll('*').remove();

    const width = +svg.style('width').split('px')[0];
    const height = +svg.style('height').split('px')[0];

    const chartArea = [
      width - (margin.left ?? 0) - (margin.right ?? 0),
      height - (margin.top ?? 0) - (margin.bottom ?? 0),
    ];

    const maxRadius =
      Math.min(
        width - (margin.left ?? 0) - (margin.right ?? 0),
        height - (margin.top ?? 0) - (margin.bottom ?? 0)
      ) / 2;

    const g = svg
      .append('g')
      .attr(
        'transform',
        `translate(${(margin.left ?? 0) + chartArea[0] / 2},${
          (margin.top ?? 0) + chartArea[1] / 2
        })`
      );

    const radiusScale = scaleLinear().domain([min, max]).range([0, maxRadius]);

    const pieFn = pie();

    // console.log(pieFn(metrics.map((d: any) => 1)));

    const outsideCircles = g.append('g');

    outsideCircles
      .selectAll('path')
      .data(pieFn(metrics.map(() => 1)))
      .enter()
      .append('path')
      .attr('d', (d: any) =>
        arc()
          .innerRadius(0)
          .outerRadius(maxRadius)
          .padAngle((paddingAngle / 360) * (2 * Math.PI))
          .cornerRadius(cornerRadius)(d)
      )
      .attr('class', (d: any) =>
        twMerge('fill-gray-200', metrics[d.index].classNameBackground)
      )
      .on('mouseenter', onMouseOver)
      .on('mousemove', onMouseMove)
      .on('mouseleave', onMouseLeave);

    const pathG = g.append('g');
    const arcs = pathG
      .selectAll('path')
      .data(pieFn(metrics.map(() => 1)))
      .join('path')
      .attr('d', (d: any) =>
        arc()
          .innerRadius(0)
          .outerRadius((metric: any) =>
            drawing?.duration
              ? 0
              : radiusScale((data as any)[metrics[metric.index].key])
          )
          .padAngle((paddingAngle / 360) * (2 * Math.PI))
          .cornerRadius(cornerRadius)(d)
      )
      .attr('class', (metric: any) =>
        twMerge('fill-gray-800', metrics[metric.index].className)
      )
      .on('mouseenter', onMouseOver)
      .on('mousemove', onMouseMove)
      .on('mouseleave', onMouseLeave);

    transition();

    if (drawing?.duration) {
      arcs
        .transition()
        .duration(drawing.duration)
        .delay((_, i: number) => i * (drawing?.delay || 0))
        // @ts-ignore
        .attrTween('d', (d: any) => {
          const interpolationFn = interpolateNumber(
            0,
            radiusScale((data as any)[metrics[d.index].key])
          );

          return (t: any) =>
            arc()
              .innerRadius(0)
              .outerRadius(() => interpolationFn(t))
              .padAngle((paddingAngle / 360) * (2 * Math.PI))
              .cornerRadius(cornerRadius)(d);
        });
    }
  }, [
    cornerRadius,
    data,
    id,
    margin,
    max,
    metrics,
    min,
    onMouseLeave,
    onMouseMove,
    onMouseOver,
    paddingAngle,
    drawing,
  ]);

  useEffect(() => {
    refreshChart();
    return () => {
      selectAll(`#tooltip-${id}`).remove();
    };
  }, [refreshChart]);

  return (
    <svg
      id={id}
      style={style}
      className={twMerge(className, defaultChartClassNames)}
    />
  );
};

export default PizzaChart;

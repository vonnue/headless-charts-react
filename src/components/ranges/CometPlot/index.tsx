import { ZoomTransform, zoom } from 'd3-zoom';
import { max, min } from 'd3-array';
import { scaleBand, scaleLinear } from 'd3-scale';
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
} from 'd3-shape';
import useTooltip from '@/hooks/useTooltip';
import useAxis from '@/hooks/useAxis';

import { AxisConfig, ChartProps, TooltipConfig } from '@/types';
import { useCallback, useEffect } from 'react';
import { defaultChartClassNames } from '@/utils';
import { transition } from 'd3-transition';
import { twMerge } from 'tailwind-merge';

interface RangePlotXConfig<TData = any> extends AxisConfig<TData> {
  fromKey: Extract<keyof TData, string> | string;
  toKey: Extract<keyof TData, string> | string;
  classNameTail?: string;
  classNameHead?: string;
}

export interface RangePlotProps<TData = any> extends ChartProps<TData> {
  data: TData[];
  y: AxisConfig<TData>;
  x: RangePlotXConfig<TData>;
  size?: number;
  shape?:
    | 'circle'
    | 'diamond'
    | 'triangle'
    | 'square'
    | 'cross'
    | 'star'
    | 'wye';
  tooltip?: TooltipConfig;
}

const RangePlot = <TData = any,>({
  id,
  className,
  data = [],
  y = { key: 'label' },
  x,
  margin = {
    top: 40,
    bottom: 40,
    left: 40,
    right: 20,
  },
  padding = {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  size,
  shape = 'circle',
  tooltip = {},
  zooming = {
    enabled: false,
  },
  style = {},
}: RangePlotProps<TData>) => {
  const { onMouseLeave, onMouseMove, onMouseOver } = useTooltip({
    id,
    tooltip,
    defaultHtml: (d: any) => `${d[y.key]}: ${d[x.fromKey]} to ${d[x.toKey]}`,
  });
  const { drawAxis } = useAxis();
  const refreshChart = useCallback(() => {
    const shapeMapping = {
      circle: symbolCircle,
      diamond: symbolDiamond,
      triangle: symbolTriangle,
      square: symbolSquare,
      cross: symbolCross,
      star: symbolStar,
      wye: symbolWye,
    };
    const svg = select<SVGSVGElement, unknown>(`#${id}`);
    // Clear svg

    svg.selectAll('*').remove();

    const width = +svg.style('width').split('px')[0],
      height = +svg.style('height').split('px')[0];

    const g = svg.append('g');

    const xFn = scaleLinear()
      .domain([
        Number.isFinite(x.start)
          ? x.start
          : min(data.map((d: any) => d[x.fromKey])),
        Number.isFinite(x.end) ? x.end : max(data.map((d: any) => d[x.toKey])),
      ])
      .range([(margin.left ?? 0), width - (padding.right || 0) - (margin.right ?? 0)]);

    const yFn = scaleBand()
      .domain(data.map((d: any) => d[y.key]))
      .range([
        (margin.top ?? 0) + (padding.top || 0),
        height - (margin.bottom ?? 0) - (padding.bottom || 0),
      ]);

    drawAxis({
      g,
      scale: yFn,
      config: y,
      dimensions: { width, height },
      margin,
      padding,
      orientation: 'vertical',
      className: 'yAxis axis',
    });

    const { axisG: xAxisG, axis: xAxis } = drawAxis({
      g,
      scale: xFn,
      config: x,
      dimensions: { width, height },
      margin,
      padding,
      orientation: 'horizontal',
      className: 'axis--x axis',
    });

    svg
      .append('clipPath')
      .attr('id', 'clip')
      .append('rect')
      .attr('x', margin.left ?? 0)
      .attr('y', (margin.top ?? 0) - (padding.top || 0) - 10)
      .attr('width', width - (margin.left ?? 0))
      .attr('height', height + (padding.bottom || 0) + 8);

    const dataG = g
      .append('g')
      .attr('class', 'data')
      .attr('clip-path', 'url(#clip)');

    const dotRowsG = dataG
      .selectAll('g')
      .data(data)
      .enter()
      .append('g')
      .on('mouseenter', onMouseOver)
      .on('mousemove', onMouseMove)
      .on('mouseleave', onMouseLeave);

    transition();

    // Draw the tails
    dotRowsG
      .append('polyline')
      .attr('clip-path', 'url(#clip)')
      .attr('class', (d: any) =>
        twMerge(
          `comet-tail fill-current stroke-0`,
          (d[x.fromKey] > d[x.toKey] ? x.classNameNegative : x.className) || '',
          d.className || '',
          x.classNameTail
        )
      )
      .attr(
        'points',
        (d: any) =>
          `${xFn(d[x.fromKey])} ${
            (yFn(d[y.key]) || 0) + yFn.bandwidth() / 2
          }, ${xFn(d[x.fromKey])} ${
            (yFn(d[y.key]) || 0) +
            yFn.bandwidth() / 2 -
            Math.sqrt((size || 100) / 4)
          }, ${xFn(d[x.fromKey])} ${
            (yFn(d[y.key]) || 0) +
            Math.sqrt((size || 100) / 4) +
            yFn.bandwidth() / 2
          }, ${xFn(d[x.fromKey])} ${(yFn(d[y.key]) || 0) + yFn.bandwidth() / 2}`
      )
      .transition()
      .duration(1000)
      .attr(
        'points',
        (d: any) =>
          // Draw a triangle From (minX midY) to (maxX midY-Sqrt(size)) to (maxX midY+Sqrt(size) to minX midY) and then close it
          `${xFn(d[x.fromKey])} ${
            (yFn(d[y.key]) || 0) + yFn.bandwidth() / 2
          }, ${xFn(d[x.toKey])} ${
            (yFn(d[y.key]) || 0) -
            Math.sqrt((size || 100) / 4) +
            yFn.bandwidth() / 2
          }, ${xFn(d[x.toKey])} ${
            (yFn(d[y.key]) || 0) +
            Math.sqrt((size || 100) / 4) +
            yFn.bandwidth() / 2
          }, ${xFn(d[x.fromKey])} ${(yFn(d[y.key]) || 0) + yFn.bandwidth() / 2}`
      );

    // Draw the head
    dotRowsG
      .append('path')
      .attr('class', (d: any) =>
        twMerge(
          `fill-current end-dots stroke-current stroke-0`,
          (d[x.fromKey] > d[x.toKey] ? x.classNameNegative : x.className) || '',
          d.className || '',
          x.classNameHead || ''
        )
      )
      .attr('d', () => symbol(shapeMapping[shape], size || 100)())
      .attr(
        'transform',
        (d: any) =>
          `translate(${xFn(d[x.fromKey])},${
            (yFn(d[y.key]) || 0) + yFn.bandwidth() / 2
          })`
      )
      .transition()
      .duration(1000)
      .attr(
        'transform',
        (d: any) =>
          `translate(${xFn(d[x.toKey])},${
            (yFn(d[y.key]) || 0) + yFn.bandwidth() / 2
          })`
      );

    if (zooming?.enabled) {
      const zoomed = ({ transform }: { transform: ZoomTransform }) => {
        // transform g across only x axis
        dotRowsG.attr(
          'transform',
          `translate(${transform.x},0)scale(${transform.k},1)`
        );
        xAxisG.call(xAxis.scale(transform.rescaleX(xFn)));
      };

      const zoomFn = zoom<SVGSVGElement, unknown>()
        .scaleExtent([zooming.min || 0.9, zooming.max || 2])
        .translateExtent([
          [0, 0],
          [width, height],
        ])
        .on('zoom', zoomed);

      svg.call(zoomFn);
    }
  }, [
    data,
    id,
    margin,
    padding,
    shape,
    size,
    x,
    y,
    zooming,
    onMouseLeave,
    onMouseMove,
    onMouseOver,
    drawAxis,
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
      className={twMerge(defaultChartClassNames, className || '')}
    />
  );
};

export default RangePlot;

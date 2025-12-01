import { max, min } from 'd3-array';
import { scaleBand, scaleLinear } from 'd3-scale';
import { select, selectAll } from 'd3-selection';
import useTooltip from '@/hooks/useTooltip';
import { drawAxis } from '@/hooks/useAxis';

import { AxisConfig, ChartProps, TooltipConfig } from '@/types';
import { useCallback, useEffect } from 'react';
import { defaultChartClassNames } from '@/utils';
import { transition } from 'd3-transition';
import { twMerge } from 'tailwind-merge';

export interface BarAxisConfig<TData = any> extends AxisConfig<TData> {
  rx?: number;
}

export interface BarChartProps<TData = any> extends ChartProps<TData> {
  x: BarAxisConfig<TData>[];
  direction?: 'left' | 'right';
  y: AxisConfig<TData> & {
    padding?: number;
  };
  dataLabel?: {
    className?: string;
  };
  tooltip?: TooltipConfig;
}

const BarChart = <TData = any,>({
  data,
  id,
  className,
  x,
  y,
  direction = 'right',
  padding = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    bar: 0.1,
  },
  margin = {
    top: x && x.some((column) => column.axis?.location === 'top') ? 60 : 40,
    right: direction === 'right' ? 20 : 40,
    bottom:
      x && x.some((column) => column.axis?.location === 'bottom') ? 60 : 40,
    left: 60,
  },
  drawing = {
    duration: 0,
  },
  dataLabel,
  tooltip,
  style = {},
}: BarChartProps<TData>) => {
  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
  });

  const refreshChart = useCallback(() => {
    if (!data || data.length === 0) return;

    const svg = select(`#${id}`);
    svg.selectAll('*').remove();

    const width = +svg.style('width').split('px')[0],
      height = +svg.style('height').split('px')[0];

    const minStart = min(x.map((column: BarAxisConfig) => column.start || 0)),
      minX = min(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        x
          .map((column: BarAxisConfig) => min(data, (d: any) => d[column.key]))
          .filter((v): v is number => v !== undefined)
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      maxX = max(
        x
          .map((column) => max(data, (d: any) => d[column.key]))
          .filter((v): v is number => v !== undefined)
      ),
      maxEnd = max(
        x
          .map((column: BarAxisConfig) => column.end || maxX)
          .filter((v): v is number => v !== undefined)
      ),
      areAllGreaterThanZero = (minX ?? 0) > 0;

    const xFnRange =
      direction === 'left'
        ? [
            width - (margin.right ?? 0) - (padding?.right ?? 0),
            (margin.left ?? 0) + (padding?.left ?? 0),
          ]
        : [
            (margin.left ?? 0) + (padding?.left ?? 0),
            width - (margin.right ?? 0) - (padding?.right ?? 0),
          ];

    const xFn = scaleLinear()
      .domain([
        Number.isFinite(minStart)
          ? minStart!
          : areAllGreaterThanZero
          ? 0
          : minX ?? 0,
        Number.isFinite(maxEnd) ? maxEnd! : maxX ?? 0,
      ])
      .range(xFnRange);

    const yFn = scaleBand()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .domain(data.map((d: any) => d[y.key]))
      .range([
        (margin.top ?? 0) + (padding?.top ?? 0),
        height - (margin.bottom ?? 0) - (padding?.bottom ?? 0),
      ])
      .padding(padding?.bar ?? 0); // add paddingBar here

    const g = svg.append('g');

    // Determine x-axis location from first x column that has axis config
    const xAxisLocation = x.find((col) => col.axis?.location)?.axis?.location || 'bottom';
    const xAxisLabel = x.map((column) => column.axis?.label || column.key || '').join(', ');

    // Create a merged config for x-axis with combined label
    const xAxisConfig: AxisConfig = {
      key: x[0]?.key || '',
      axis: {
        location: xAxisLocation as 'top' | 'bottom',
        ticks: x[0]?.axis?.ticks || 5,
        label: xAxisLabel,
      },
    };

    // Determine y-axis location based on direction
    const yAxisConfig: AxisConfig = {
      ...y,
      axis: {
        ...y.axis,
        location: direction === 'left' ? 'right' : 'left',
      },
    };

    // Draw x-axis using shared utility
    drawAxis({
      g,
      scale: xFn,
      config: xAxisConfig,
      dimensions: { width, height },
      margin,
      padding,
      orientation: 'horizontal',
    });

    // Draw y-axis using shared utility
    drawAxis({
      g,
      scale: yFn,
      config: yAxisConfig,
      dimensions: { width, height },
      margin,
      padding,
      orientation: 'vertical',
    });

    x.map((column, i) => {
      const barsG = g.append('g');

      const bars = barsG
        .selectAll('g')
        .data(data)
        .enter()
        .append('rect')
        .attr(
          'class',
          (d: any) =>
            `fill-current ${
              (column.classNameNegative && d[column.key] < 0
                ? column.classNameNegative
                : column.className) || ''
            }`
        )
        .attr('rx', column.rx || 0)
        .attr('x', (d: any) =>
          drawing.duration
            ? xFn(0)
            : direction === 'left' || d[column.key] < 0
            ? xFn(d[column.key])
            : xFn(0)
        )
        .attr(
          'y',
          (d: any) => (yFn(d[y.key]) || 0) + (i * yFn.bandwidth()) / x.length
        )
        .attr('width', (d: any) =>
          drawing?.duration
            ? 0
            : direction === 'left'
            ? xFn(0) - xFn(Math.abs(d[column.key]))
            : d[column.key] < 0
            ? xFn(0) - xFn(d[column.key])
            : xFn(Math.abs(d[column.key])) - xFn(0)
        )
        .attr('height', yFn.bandwidth() / x.length - (y?.padding ?? 0))
        .on('mouseenter', onMouseOver)
        .on('mousemove', onMouseMove)
        .on('mouseleave', onMouseLeave);

      transition();

      drawing?.duration &&
        bars
          .transition()
          .duration(drawing.duration)
          .delay(
            (_: any, idx: number) => i * (drawing.delay || 100) + idx * 100
          )
          .attr('x', (d: any) =>
            direction === 'left' || d[column.key] < 0
              ? xFn(d[column.key])
              : xFn(0)
          )
          .attr('width', (d: any) =>
            Math.abs(xFn(0) - xFn(Math.abs(d[column.key])))
          );

      dataLabel &&
        barsG
          .selectAll('g')
          .data(data)
          .enter()
          .append('text')
          .text((d: any) => d[column.key])
          .attr('class', twMerge('fill-current', dataLabel.className || ''))
          .attr('data-testid', 'label')
          .attr('text-anchor', direction === 'left' ? 'start' : 'end')
          .attr(
            'x',
            (d: any) => xFn(d[column.key]) + (direction === 'left' ? 5 : -2)
          )
          .attr('font-size', '0.5em')
          .attr(
            'y',
            (d: any) =>
              (yFn(d[y.key]) || 0) +
              ((i + 1) * yFn.bandwidth()) / x.length -
              yFn.bandwidth() / x.length / 4
          );
    });
  }, [data, direction, drawing, id, margin, padding, x, y, dataLabel, tooltip]);

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
      data-testid='bar-chart'
    />
  );
};

export default BarChart;

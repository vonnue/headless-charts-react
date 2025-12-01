import { max, min } from 'd3-array';
import { select, selectAll } from 'd3-selection';
import useTooltip from '@/hooks/useTooltip';
import { drawAxis } from '@/hooks/useAxis';
import { scaleBand, scaleLinear } from 'd3-scale';
import { useCallback, useEffect } from 'react';

import { AxisConfig, ChartProps, TooltipConfig } from '@/types';
import { defaultChartClassNames } from '@/utils';
import { twMerge } from 'tailwind-merge';

export interface ColumnChartGroupedProps<TData = any> extends ChartProps<TData> {
  x: AxisConfig<TData>;
  y: AxisConfig<TData>[];
  paddingBar?: number;
  tooltip?: TooltipConfig;
  referenceLines?: {
    y?: number;
    className?: string;
  }[];
  wholeNumbers?: boolean;
}

interface drawHLineProps {
  x: number;
  y: number;
  direction?: 'left' | 'right';
  className?: string;
  dashed?: boolean;
}

const ColumnChartGrouped = <TData = any,>({
  data = [],
  id,
  className,
  x,
  y,
  margin = {
    top: 40,
    bottom: 40,
    left: 40,
    right: 40,
  },
  padding = {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  paddingBar = 0.2,
  drawing,
  tooltip,
  referenceLines = [],
  style = {},
  wholeNumbers = false,
}: ColumnChartGroupedProps<TData>) => {
  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: (d: any) =>
      `${d[x.key]} <br/> ${y.map((col) => `${col.key}: ${d[col.key]}`).join('<br/>')}`,
  });

  const refreshChart = useCallback(() => {
    /* eslint-disable */
    const svg = select(`#${id}`);
    svg.selectAll('*').remove();
    const g = svg.append('g');

    // @ts-ignore
    const minStart = min(y.map((column) => column.start));
    // @ts-ignore
    const minY: number = min(
      y.map((column: AxisConfig) => min(data, (d: any) => d[column.key]))
    );
    // @ts-ignore
    const maxY: number = max(
      y.map((column: AxisConfig) => max(data, (d: any) => d[column.key]))
    );
    // @ts-ignore
    const maxEnd = max(y.map((column) => column.end));
    // @ts-ignore
    const areAllGreaterThanZero = minY > 0;

    const width = +svg.style('width').split('px')[0],
      height = +svg.style('height').split('px')[0];

    const xFn = scaleBand()
      // @ts-ignore
      .domain(data.map((d) => (d as any)[x.key]))
      .range([
        (margin.left ?? 0) + (padding.left ?? 0),
        width - (margin.right ?? 0) - (padding.right ?? 0),
      ])
      .padding(paddingBar);

    const yFn = scaleLinear()
      // @ts-ignore
      .domain([
        Number.isFinite(minStart) ? minStart : minY || 0,
        maxEnd || maxY,
      ])
      .range([
        height - (margin.bottom ?? 0) - (padding.bottom ?? 0),
        (margin.top ?? 0) + (padding.top ?? 0),
      ]);

    y.map((column, i) => {
      const barsG = g.append('g');

      const bars = barsG
        .selectAll('g')
        .data(data)
        .enter()
        .append('rect')
        .attr(
          'class',
          (d) =>
            `fill-current ${
              // @ts-ignore
              column.classNameNegative && (d as any)[column.key] < 0
                ? column.classNameNegative
                : column.className
            }`
        )
        // @ts-ignore
        .attr(
          'x',
          (d) =>
            (xFn((d as any)[x.key]) || 0) + (i * xFn.bandwidth()) / y.length
        )
        .attr('y', (d) =>
          // @ts-ignore
          drawing && drawing.duration ? yFn(0) : yFn((d as any)[column.key])
        )
        .attr('width', xFn.bandwidth() / y.length)
        .attr('height', (d) =>
          drawing && drawing.duration
            ? 0
            : (d as any)[column.key]
            ? // @ts-ignore
              height -
              (margin.bottom ?? 0) -
              (padding.bottom ?? 0) -
              yFn((d as any)[column.key])
            : 0
        )
        .on('mouseenter', onMouseOver)
        .on('mousemove', onMouseMove)
        .on('mouseleave', onMouseLeave);

      drawing?.duration &&
        bars
          .transition()
          .duration(drawing.duration)
          // @ts-ignore
          .attr('y', (d) => yFn((d as any)[column.key]))
          .attr('height', (d) =>
            Number.isFinite((d as any)[column.key])
              ? // @ts-ignore
                height -
                (margin.bottom ?? 0) -
                (padding.bottom ?? 0) -
                yFn((d as any)[column.key])
              : 0
          );
    });

    function drawHLine({
      x,
      y,
      direction = 'left',
      className,
      dashed = false,
    }: drawHLineProps) {
      const horizontalLine = g
        .append('line')
        .attr('class', twMerge(className, 'line stroke-current'))
        .attr('x1', direction === 'left' ? margin.left ?? 0 : x)
        .attr('x2', direction === 'left' ? x : width + (margin.left ?? 0))
        .attr('y1', y)
        .attr('y2', y)
        .attr('clip-path', 'url(#clip)')
        .attr('stroke', '#dddddd');
      dashed && horizontalLine.style('stroke-dasharray', '10,5');
    }

    referenceLines.map((object) => {
      object.y &&
        drawHLine({
          x: width - (margin.right ?? 0),
          y: yFn(object.y),
          className: `${object.className || ''} reference-line`,
        });
    });

    // Determine y-axis location
    const yAxisLocation = y.find((col) => col.axis?.location)?.axis?.location || 'left';
    const yAxisLabel = y.map((column) => column.axis?.label || column.key || '').join(', ');

    // Create y-axis config
    const yAxisConfig: AxisConfig = {
      key: y[0]?.key || '',
      axis: {
        location: yAxisLocation as 'left' | 'right',
        ticks: y[0]?.axis?.ticks || (wholeNumbers && maxY < 10 ? maxY : 5),
        label: yAxisLabel,
      },
    };

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
      config: yAxisConfig,
      dimensions: { width, height },
      margin,
      padding,
      orientation: 'vertical',
    });
  }, [data, onMouseOver, onMouseMove, onMouseLeave]);
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

export default ColumnChartGrouped;

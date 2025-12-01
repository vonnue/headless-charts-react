import { max, sum } from 'd3-array';
import { scaleBand, scaleLinear } from 'd3-scale';
import { select, selectAll } from 'd3-selection';
import { useCallback, useEffect } from 'react';
import useTooltip from '@/hooks/useTooltip';
import { drawAxis } from '@/hooks/useAxis';

import { AxisConfig, ChartProps, TooltipConfig } from '@/types';
import { defaultChartClassNames } from '@/utils';
import { stack } from 'd3';
import { transition } from 'd3-transition';
import { twMerge } from 'tailwind-merge';

interface DataLabel<TData = any> {
  text?: (data: TData, column: AxisConfig<TData>) => string;
}

interface ReferenceLines {
  x?: number;
  className?: string;
}

interface StackedArrayItem<TData = any> {
  0: number;
  1: number;
  data: TData;
}

interface StackedDataItem<TData = any> {
  start: number;
  end: number;
  data: TData;
  index: number;
}

export interface BarChartStackedProps<TData = any> extends ChartProps<TData> {
  direction?: 'left' | 'right';
  referenceLines?: ReferenceLines[];
  waterfall?: boolean;
  x: AxisConfig<TData>[];
  tickFormat?: string;
  y: AxisConfig<TData>;
  tooltip?: TooltipConfig;
  dataLabel?: DataLabel<TData>;
}

const BarChartStacked = <TData = any,>({
  data = [],
  id,
  className,
  direction = 'right',
  padding = {
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    bar: 0.3,
  },
  margin = {
    left: 60,
    right: 20,
    top: 20,
    bottom: 40,
  },
  referenceLines = [],
  waterfall,
  x,
  tickFormat,
  y,
  tooltip,
  drawing = undefined,
  dataLabel,
  style = {},
}: BarChartStackedProps<TData>) => {
  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: (d: any) =>
      `${d.data[y.key]} <br/> ${x
        .map((field) => `${field.key}: ${d.data[field.key]}`)
        .join('<br/>')}`,
  });

  const refreshChart = useCallback(() => {
    const svg = select(`#${id}`);
    svg.selectAll('*').remove();

    const width = +svg.style('width').split('px')[0],
      height = +svg.style('height').split('px')[0];

    const g = svg.append('g');

    const yFn = scaleBand()
      .domain(data.map((d) => (d as any)[y.key]))
      .range([
        (margin.top ?? 0) + (padding.top ?? 0),
        height - (margin.bottom ?? 0) - (padding.bottom ?? 0),
      ])
      .padding(padding.bar ?? 0.3);

    const xFnRange =
      direction === 'left'
        ? [
            width - (margin.right ?? 0) - (padding.right ?? 0),
            (margin.left ?? 0) + (padding.left ?? 0),
          ]
        : [
            (margin.left ?? 0) + (padding.left ?? 0),
            width - (margin.right ?? 0) - (padding.right ?? 0),
          ];

    const xFn = scaleLinear()
      // @ts-ignore
      .domain([0, max(data.map((d) => sum(x.map((value) => d[value.key]))))])
      .range(xFnRange);

    x.reverse();

    const dataStacked = stack().keys(x.map((column) => column.key))(
      data as Iterable<{ [key: string]: number }>
    );

    transition();
    // @ts-ignore
    g.append('g')
      .selectAll('g')
      .data(dataStacked)
      .enter()
      .append('g')
      // @ts-ignore
      .attr('class', (d: any) => x[d.index].className)
      .selectAll('rect')
      .data((d: StackedArrayItem[], index: number) => {
        return d.map((v: StackedArrayItem) => {
          return {
            start: v[0],
            end: v[1],
            data: v.data,
            index,
          };
        });
      })
      .enter()
      .append('rect')
      .attr('x', () => xFn(0))
      .attr('y', (d: StackedDataItem) => {
        return (
          (yFn(d.data[y.key]) || 0) +
          (waterfall ? (yFn.bandwidth() / x.length) * d.index : 0)
        );
      })
      .attr('width', (d: StackedDataItem) =>
        drawing?.duration ? 0 : xFn(d.end) - xFn(d.start)
      )
      .attr('height', waterfall ? yFn.bandwidth() / x.length : yFn.bandwidth())
      .on('mouseenter', onMouseOver)
      .on('mousemove', onMouseMove)
      .on('mouseleave', onMouseLeave)
      .transition()
      .duration(drawing?.duration || 0)
      .delay((_, i) => (drawing?.delay || 0) * i)
      .attr('x', (d: StackedDataItem) => xFn(d.start))
      .attr('width', (d: StackedDataItem) => xFn(d.end) - xFn(d.start));

    // Determine x-axis location
    const xAxisLocation = x.find((col) => col.axis?.location)?.axis?.location || 'bottom';
    const xAxisLabel = x.map((column) => column.axis?.label || column.key || '').join(', ');

    // Create x-axis config
    const xAxisConfig: AxisConfig = {
      key: x[0]?.key || '',
      axis: {
        location: xAxisLocation as 'top' | 'bottom',
        ticks: x[0]?.axis?.ticks || 5,
        label: xAxisLabel,
      },
    };

    // Create y-axis config
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
  }, [
    data,
    id,
    direction,
    padding,
    margin,
    referenceLines,
    waterfall,
    x,
    tickFormat,
    y,
    tooltip,
    drawing,
    dataLabel,
  ]);
  /* eslint-enable */

  useEffect(() => {
    refreshChart();
    return () => {
      selectAll(`#tooltip-${id}`).remove();
    };
  }, [data, refreshChart]);
  return (
    <>
      <svg
        id={id}
        style={style}
        className={twMerge(defaultChartClassNames, className)}
      />
    </>
  );
};

export default BarChartStacked;

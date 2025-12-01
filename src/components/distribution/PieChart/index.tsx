/* eslint-disable @typescript-eslint/ban-ts-comment */
import { arc, pie } from 'd3';
import { select, selectAll } from 'd3-selection';
import { useCallback, useEffect, useRef } from 'react';
import useTooltip from '@/hooks/useTooltip';

import { ChartProps, TooltipConfig } from '@/types';
import { deepValue } from '@/utils';
import { defaultChartClassNames } from '@/utils';
import { interpolate } from 'd3-interpolate';
import { min } from 'd3-array';
import { twMerge } from 'tailwind-merge';

interface DataItem {
  name: string;
  [key: string]: any;
  innerRadius?: number;
  outerRadius?: number;
}

interface ClassNameMap {
  [key: string]: string;
}

interface DrawingOptions {
  duration: number;
}

interface LabelOptions<TData = any> {
  radius?: number;
  text?: (data: TData) => string;
  className?: string;
  classNameMap?: { [key: string]: string };
}

export interface PieChartProps<TData = any> extends ChartProps<TData> {
  data: TData[];
  id: string;
  className?: string;
  classNameMap?: ClassNameMap;
  paddingAngle?: number;
  cornerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  nameKey: Extract<keyof TData, string> | string;
  valueKey: Extract<keyof TData, string> | string;
  drawing?: DrawingOptions;
  tooltip?: TooltipConfig;
  labels?: LabelOptions<TData>;
  title?: {
    text?: string | null;
    className?: string;
  };
  subtitle?: {
    text?: string | null;
    className?: string;
  };
  sort?: boolean;
}

const PieChart = <TData = any,>({
  data,
  id,
  className = '',
  classNameMap = {},
  padding = {
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  paddingAngle = 2,
  startAngle = 0,
  endAngle = 360 + startAngle,
  cornerRadius = 0,
  margin = {
    left: 40,
    right: 40,
    top: 40,
    bottom: 40,
  },
  innerRadius = 0,
  outerRadius = 1,
  nameKey = 'name',
  valueKey,
  drawing,
  tooltip,
  labels,
  style = {},
  title = {
    text: null,
    className: 'text-center text-base font-bold',
  },
  subtitle = {
    text: null,
    className: 'text-center text-sm font-normal',
  },
  sort = true,
}: PieChartProps<TData>) => {
  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: (d: any) => `${d.data[nameKey]} = ${d.value}`,
  });

  const previousArcs = useRef<any[]>([]);

  const refreshChart = useCallback(() => {
    const svg = select(`#${id}`);
    svg.selectAll('*').remove();

    const width = +svg.style('width').split('px')[0];
    const height = +svg.style('height').split('px')[0];

    const g = svg.append('g');

    const pieFn = pie<DataItem>()
      .startAngle((startAngle / 180) * Math.PI || 0)
      .endAngle((endAngle / 180) * Math.PI || 2 * Math.PI)
      .padAngle(paddingAngle / 180)
      .value((d) => d[valueKey]);

    if (!sort) {
      pieFn.sort(null);
    }

    const chartArea = [
      width - (margin.left ?? 0) - (margin.right ?? 0),
      height - (margin.top ?? 0) - (margin.bottom ?? 0),
    ];

    const radius =
      min(
        endAngle - startAngle <= 180
          ? [chartArea[0] / 2, chartArea[1]]
          : chartArea.map((a) => a / 2)
      ) || 0;

    const arcFn = arc<DataItem>()
      .innerRadius((d) => (d.data.innerRadius || innerRadius) * radius)
      .outerRadius((d) => (d.data.outerRadius || outerRadius) * radius)
      .padAngle((paddingAngle / 360) * (2 * Math.PI))
      .cornerRadius(cornerRadius);

    const labelArc =
      labels?.radius &&
      arc<DataItem>()
        .innerRadius(radius * labels.radius)
        .outerRadius(radius * labels.radius);

    const arcs = pieFn(data as any);

    const pathsG = g
      .append('g')
      .attr(
        'transform',
        `translate(${
          (padding.left ?? 0) + (margin.left ?? 0) + chartArea[0] / 2
        },${
          endAngle - startAngle <= 180
            ? height - (margin.bottom ?? 0) - (padding.bottom ?? 0)
            : (margin.top ?? 0) + (padding.top || 0) + chartArea[1] / 2
        })`
      );

    pathsG
      .selectAll('path')
      .data(arcs)
      .join('path')
      // @ts-ignore
      .attr('id', (d) => deepValue(d.data, nameKey))
      // @ts-ignore
      .attr('data-testid', (d) => deepValue(d.data, nameKey))
      .attr('class', (d: any) =>
        twMerge('fill-black', classNameMap[d.data[nameKey]])
      )
      // @ts-ignore
      .attr('d', (d) => arcFn(d))
      .on('mouseenter', onMouseOver)
      .on('mousemove', onMouseMove)
      .on('mouseleave', onMouseLeave)
      .transition()
      .duration(drawing?.duration || 0)
      .attrTween('d', function (d) {
        const previousArc = previousArcs.current.find(
          (a) => a.data[nameKey] === d.data[nameKey]
        );

        const i = interpolate(
          {
            startAngle: previousArc?.startAngle || (startAngle / 180) * Math.PI,
            endAngle: previousArc?.endAngle || (startAngle / 180) * Math.PI,
          },
          d
        );

        // @ts-ignore
        return (t) => arcFn(i(t));
      });

    const timeOut = setTimeout(() => {
      previousArcs.current = arcs;
    }, drawing?.duration);

    const labelsG = labelArc && pathsG.append('g').attr('class', 'labels');

    labelArc &&
      labelsG &&
      labelsG
        .selectAll('g')
        .data(arcs)
        .enter()
        .append('text')
        .attr(
          'transform',
          // @ts-ignore
          (d: { data: DataItem }) => `translate(${labelArc.centroid(d)})`
        )
        .attr('text-anchor', 'middle')
        .attr('class', (d: any) =>
          twMerge(
            labels?.className,
            labels?.classNameMap && labels.classNameMap[d.data[nameKey]],
            `fill-current`
          )
        )
        // @ts-ignore
        .text((d: { data: DataItem }) =>
          labels.text ? labels.text(d.data as any) : deepValue(d.data, nameKey)
        );

    title &&
      title.text &&
      g
        .append('text')
        .attr('class', title.className || 'text-center text-base font-bold')
        .attr('x', width / 2)
        .attr('y', height / 2 - 10)
        .attr('text-anchor', 'middle')
        .attr('opacity', 0)
        .transition()
        .duration(drawing?.duration || 0)
        .attr('opacity', 1)
        .text(title.text);

    subtitle &&
      subtitle.text &&
      g
        .append('text')
        .attr('class', subtitle.className || 'text-center text-sm font-normal ')
        .attr('x', width / 2)
        .attr('y', height / 2 + 10)
        .attr('text-anchor', 'middle')
        .attr('font-weight', 'normal')
        .attr('font-size', '12px')
        .attr('opacity', 0)
        .transition()
        .duration(drawing?.duration || 0)
        .attr('opacity', 1)
        .text(subtitle.text);

    return () => {
      clearTimeout(timeOut);
    };
  }, [
    id,
    startAngle,
    endAngle,
    paddingAngle,
    margin,
    innerRadius,
    cornerRadius,
    onMouseLeave,
    onMouseMove,
    onMouseOver,
    labels,
    data,
    padding,
    drawing,
    valueKey,
    nameKey,
    classNameMap,
  ]);

  useEffect(() => {
    refreshChart();
    return () => {
      selectAll(`#tooltip-${id}`).remove();
    };
  }, [data, refreshChart]);

  return (
    <svg
      data-testid={id}
      style={style}
      id={id}
      className={twMerge(defaultChartClassNames, className)}
    />
  );
};

export default PieChart;

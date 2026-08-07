import { PieArcDatum, arc } from 'd3-shape';
import { useCallback, useEffect, useRef } from 'react';
import { select, selectAll } from 'd3-selection';

import { defaultChartClassNames } from '@/utils';
import { GaugeProps } from '@/types';
import { interpolateNumber } from 'd3-interpolate';
import { min } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import { transition } from 'd3-transition';
import { twMerge } from 'tailwind-merge';
import useTooltip from '@/hooks/useTooltip';

/* eslint-disable @typescript-eslint/no-unused-vars */

export interface RingGaugeProps<TData = any> extends Omit<GaugeProps<TData>, 'data'> {
  data?: TData[];
  labelKey: Extract<keyof TData, string> | string;
  targetKey: Extract<keyof TData, string> | string;
  dataKey: Extract<keyof TData, string> | string;
  errorKey?: Extract<keyof TData, string> | string;
  labels?: {
    position?: 'top' | 'bottom';
    className?: string;
  };
  padding?: {
    arc?: number;
  };
  minRadius?: number;
  startAngle?: number;
  endAngle?: number;
  cornerRadius?: number;
  classNameGauge?: string;
  classNameGaugeBg?: string;
}

/* catalog:start */
/**
 * Concentric arcs, one per metric, each filled to its own target — the Apple
 * Watch activity rings pattern.
 *
 * @remarks
 *
 * **Use when**
 * - Several metrics each have their own target and should read as a single
 *   glanceable unit
 * - Completion against goal is the message rather than absolute values
 * - The set of metrics is stable and small, so ring order can be learned
 *
 * **Avoid when**
 * - Metrics share one scale and their shape should be compared — use
 *   RadarChart
 * - There is only one metric — use BulletChart or LinearGauge
 * - Absolute values must be compared across metrics — arc lengths at
 *   different radii are not comparable; use ColumnChart
 * - Metrics have no target, only a raw value — use PizzaChart
 *
 * Also called: activity rings, radial progress chart, concentric gauge, donut gauge.
 *
 * Answers: progress, profile. Required props: `id`, `data`, `labelKey`, `dataKey`, `targetKey`.
 *
 * @example
 * ```tsx
 * <RingGauge
 *   id="activity-rings"
 *   className="w-full h-64"
 *   data={metrics}
 *   labelKey="name"
 *   dataKey="score"
 *   targetKey="target"
 * />
 * ```
 *
 * @see BulletChart — a single metric, with qualitative bands
 * @see RadarChart — metrics share one scale and profile shape matters
 * @see PizzaChart — metrics have a shared maximum rather than individual
 *   targets
 */
/* catalog:end */
const RingGauge = <TData = any,>({
  className,
  id,
  labelKey,
  targetKey,
  dataKey,
  data = [],
  margin = {
    top: 40,
    bottom: 40,
    left: 40,
    right: 40,
  },
  padding = {
    arc: 5,
  },
  minRadius = 10,
  cornerRadius = 2,
  drawing = { duration: 1000, delay: 0 },
  startAngle = 0,
  endAngle = 270,
  tooltip,
  classNameGaugeBg = '',
  labels = { position: 'top' },
  style = {},
}: RingGaugeProps<TData>) => {
  const PI = Math.PI,
    numArcs = data.length;

  const previousData = useRef<any[]>([]);

  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: (d: any) =>
      `${d[labelKey]} <br/>${d[dataKey]}/${d[targetKey]}`,
  });

  const refreshChart = useCallback(() => {
    const svg = select(`#${id}`);

    svg.selectAll('*').remove();

    const g = svg.append('g');

    const width = +svg.style('width').split('px')[0],
      height = +svg.style('height').split('px')[0];

    const getInnerRadius = (index: number) =>
        minRadius + (numArcs - (index + 1)) * (arcWidth + (padding.arc || 0)),
      getOuterRadius = (index: number) => getInnerRadius(index) + arcWidth;

    g.attr('transform', `translate(${width / 2},${height / 2})`);

    const innerWidth = width - (margin.left || 0) - (margin.right || 0),
      innerHeight = height - (margin.top || 0) - (margin.bottom || 0),
      chartRadius = Math.min(innerHeight, innerWidth) / 2;

    const scale = scaleLinear()
      .domain([0, 1])
      .range([0, (endAngle / 180) * PI]);

    const arcWidth =
      (chartRadius - minRadius - numArcs * (padding.arc || 5)) / numArcs;

    const arcFn = arc<PieArcDatum<any> | number>()
      .innerRadius((_d: any, i: number) => getInnerRadius(i))
      .outerRadius((_d: any, i: number) => getOuterRadius(i))
      .startAngle(((startAngle / 90) * PI) / 2)
      .endAngle((d: any) => scale(d))
      .cornerRadius(cornerRadius);

    g.append('g')
      .attr('class', `background-arcs`)
      .selectAll('path')
      .data(data)
      .enter()
      .append('path')
      .attr(
        'class',
        twMerge(
          ` fill-current text-gray-200 dark:text-gray-700`,
          classNameGaugeBg
        )
      )
      .attr('d', function (_d, i: number) {
        return arcFn(1, i);
      });

    transition();

    g.append('g')
      .attr('class', 'data')
      .selectAll('path')
      .data(data)
      .enter()
      .append('path')
      .attr('class', (d: any) => twMerge('data-arc fill-current ', d.className))
      .attr('d', (d: any, i: number) => {
        // Draw previous arc first
        const previousArc = previousData.current.find(
          (a) => a['name'] === d['name']
        );
        return arcFn(
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          min([previousArc?.[dataKey] / previousArc?.[targetKey], 1]),
          i
        );
      })
      .on('mouseenter', onMouseOver)
      .on('mousemove', onMouseMove)
      .on('mouseleave', onMouseLeave)
      .transition()
      .duration(drawing?.duration || 1000)
      .delay(drawing?.delay || 0)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      .attrTween('d', (d: any, i: number) => {
        const previousArc = previousData?.current?.find(
          (a) => a['name'] === d['name']
        );

        // Animate from previous arc to current arc

        const interpolate = interpolateNumber(
          min([previousArc?.[dataKey] / previousArc?.[targetKey], 1]) || 0,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          min([d[dataKey] / d[targetKey], 1])
        );
        return (t: any) => arcFn(interpolate(t), i);
      });

    const timeOut = setTimeout(() => {
      previousData.current = data;
    }, drawing?.duration);

    labels &&
      g
        .append('g')
        .attr('class', 'labels')
        .selectAll('.labels')
        .data(data)
        .enter()
        .append('text')
        .attr('text-anchor', 'end')
        .attr('class', `fill-current text-xs ${labels.className || ''}`)
        .attr('x', -5)
        .attr('y', (_d, i) =>
          labels?.position === 'bottom'
            ? getInnerRadius(i) + arcWidth - 1
            : -getInnerRadius(i) - 2
        )
        .text((d: any) => d[labelKey]);

    return () => {
      clearTimeout(timeOut);
    };
  }, [
    PI,
    classNameGaugeBg,
    data,
    dataKey,
    drawing?.delay,
    drawing?.duration,
    endAngle,
    id,
    labelKey,
    labels,
    margin.bottom,
    margin.left,
    margin.right,
    margin.top,
    minRadius,
    numArcs,
    padding.arc,
    startAngle,
    cornerRadius,
    targetKey,
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
      className={twMerge(defaultChartClassNames, className || '')}
    />
  );
};

export default RingGauge;

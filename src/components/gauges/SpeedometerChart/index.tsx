import { Arc, SymbolType, arc, symbol, symbolTriangle } from 'd3';
import { ScaleLinear, scaleLinear } from 'd3-scale';
import { select, selectAll } from 'd3-selection';
import { useCallback, useEffect, useRef } from 'react';

import { Axis } from 'd3-axis';
import { defaultChartClassNames } from '@/utils';
import { GaugeProps } from '@/types';
import { max } from 'd3-array';
import { twMerge } from 'tailwind-merge';
import useTooltip from '@/hooks/useTooltip';

interface Region {
  limit: number;
  className?: string;
}

interface Label {
  text: string;
  className?: string;
}

export interface SpeedometerChartProps<TData = any> extends GaugeProps<TData> {
  label?: Label;
  regions?: Region[];
  axisTicks?: number;
  needleRadius?: number;
}

const SpeedometerChart = <TData = any,>({
  data,
  label,
  id,
  className,
  margin = {
    top: 0,
    bottom: 20,
    left: 40,
    right: 40,
  },
  regions = [],
  axisTicks = 5,
  needleRadius = 0.8,
  style = {},
  tooltip,
}: SpeedometerChartProps<TData>) => {
  const PI = Math.PI;
  const MIN_ANGLE = -PI / 2;
  const MAX_ANGLE = PI / 2;
  const maxValue = max(regions.map((region) => region.limit)) || 1;

  const previousData = useRef(0);
  regions.sort((a, b) => b.limit - a.limit);

  const dataValue = typeof data === 'number' ? data : 0;

  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: () => `Value: ${dataValue}`,
  });

  const setup = useCallback(() => {
    const svg = select<SVGSVGElement, unknown>(`#${id}`);

    svg.selectAll('*').remove();

    const g = svg.append('g');

    const width = +svg.style('width').split('px')[0];
    const height = +svg.style('height').split('px')[0];

    g.attr('transform', `translate(${width / 2},${(margin.top ?? 0) + width / 2})`);

    const innerWidth = width - (margin.left ?? 0) - (margin.right ?? 0);
    const chartRadius = innerWidth / 2;

    const scale: ScaleLinear<number, number> = scaleLinear()
      .domain([0, maxValue])
      .range([MIN_ANGLE, MAX_ANGLE]);
    /* eslint-disable */
    // @ts-ignore
    const arcFn: Arc<unknown, Region> = arc()
      .innerRadius(() => chartRadius * 0.7)
      .outerRadius(() => chartRadius)
      .startAngle(MIN_ANGLE)
      // @ts-ignore
      .endAngle((d) => scale(d.limit));

    const arcsG = g.append('g').attr('class', 'gauge-levels');

    arcsG
      .selectAll<SVGPathElement, Region>('path')
      .data(regions)
      .enter()
      .append('path')
      .attr('class', (d) =>
        twMerge('gauge-level fill-current stroke-current', d.className)
      )
      .attr('d', (d) => arcFn(d));

    const [xStart, xEnd] = scale.domain();
    const gap = (xEnd - xStart) / axisTicks;
    const axisTickLabels = new Array(axisTicks + 2)
      .fill('')
      .map((_, i) => +((i - 1) * gap).toFixed(1));

    const dataG = g.append('g').attr('class', 'data-group');
    dataG
      .append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 3)
      .attr('class', 'fill-current stroke-current');

    dataG
      .append('line')
      .attr('x1', 0)
      .attr('x2', -chartRadius * needleRadius)
      .attr('y1', 0)
      .attr('y2', 0)
      .attr('class', 'fill-current stroke-current stroke-2');

    dataG
      .append('path')
      // @ts-ignore
      .attr('d', symbol<SymbolType>(symbolTriangle).size(50))
      .attr(
        'transform',
        `translate(${-chartRadius * needleRadius},0)rotate(-90)`
      )
      .attr('class', 'fill-current stroke-current stroke-2');

    // Add tooltip events to the needle group
    dataG
      .style('cursor', 'pointer')
      .on('mouseenter', (event: any) => onMouseOver(event, { value: dataValue }))
      .on('mousemove', onMouseMove)
      .on('mouseleave', onMouseLeave);

    refreshChart();

    label &&
      g
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('class', `fill-current ${label?.className}`)
        .attr('x', 0)
        .attr(
          'y',
          height - (margin.bottom ?? 0) - (margin.top ?? 0) - width / 2
        )
        .text(label.text);
    // @ts-ignore
    const xAxis: Axis<number> = (g) =>
      // @ts-ignore
      g.attr('text-anchor', 'middle').call((g: any) =>
        // @ts-ignore
        g
          .selectAll<SVGGElement, number>('g')
          .data(axisTickLabels)
          .enter()
          .append('g')
          .attr(
            'transform',
            (d: any) =>
              `rotate(${(scale(d) * 180) / Math.PI - 90}) translate(${
                chartRadius * 0.7
              },0)`
          )
          .call((g: any) =>
            g
              .append('line')
              .attr('x1', 4)
              .attr('x2', -4)
              .attr('class', 'axis-line stroke-current')
          )
          .call((g: any) =>
            g
              .append('text')
              .attr('class', 'text-xs fill-current')
              .attr('transform', (d: any) =>
                ((scale(d) + PI) / 2) % (2 * PI) < PI
                  ? `rotate(90)translate(0,16)`
                  : `rotate(-90)translate(0,-9)`
              )
              .text((d: any) => d)
          )
      );

    g.call(xAxis);
  }, [id, margin, needleRadius, onMouseOver, onMouseMove, onMouseLeave, dataValue]);

  const currentAngle = ((dataValue / maxValue) * (MAX_ANGLE - MIN_ANGLE) * 180) / PI;
  const previousAngle =
    ((previousData.current / maxValue) * (MAX_ANGLE - MIN_ANGLE) * 180) / PI;

  const refreshChart = useCallback(() => {
    select<SVGElement, number>('.data-group')
      .data([data])
      .attr('transform', `rotate(${previousAngle})`) // Start from previousData.current
      .transition()
      .duration(1000)
      .attr('transform', `rotate(${currentAngle})`); // Transition to the new value
    previousData.current = dataValue;
  }, [data, max]);

  useEffect(() => {
    setup();
  }, [setup]);

  useEffect(() => {
    refreshChart();
    return () => {
      selectAll(`#tooltip-${id}`).remove();
    };
  }, [data, max, refreshChart]);
  /* eslint-enable */
  return (
    <svg
      data-testid='speedometer'
      id={id}
      style={style}
      className={twMerge(defaultChartClassNames, className)}
    />
  );
};

export default SpeedometerChart;

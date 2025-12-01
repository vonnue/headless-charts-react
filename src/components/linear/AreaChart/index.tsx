import { max, min } from 'd3-array';
import { scaleLinear, scaleTime } from 'd3';
import { select, selectAll } from 'd3-selection';
import {
  stack,
  stackOffsetDiverging,
  stackOffsetExpand,
  stackOffsetWiggle,
  stackOrderInsideOut,
  stackOrderReverse,
} from 'd3';
import { useCallback, useEffect } from 'react';

import {
  AxisConfig,
  ChartProps,
  SeriesAxisConfig,
  TooltipConfig,
} from '@/types';
import { timeFormat, timeParse, isoParse } from 'd3-time-format';
import useTooltip from '@/hooks/useTooltip';
import { area } from 'd3-shape';
import { defaultChartClassNames } from '@/utils';
import { twMerge } from 'tailwind-merge';
import { zoom } from 'd3-zoom';
import * as d3 from 'd3';
import { drawAxis } from '@/hooks/useAxis';

export interface AreaChartProps<TData = any> extends ChartProps<TData> {
  data: TData[];
  id: string;
  className?: string;
  x: AxisConfig<TData>;
  y: Array<SeriesAxisConfig<TData>>;
  stacking?: {
    type?: 'normal' | '100%' | 'streamgraph' | 'diverging';
  };

  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  tooltip?: TooltipConfig;
  zooming?: {
    enabled: boolean;
    min?: number;
    max?: number;
  };
}

const AreaChart = <TData = any,>({
  data = [],
  id,
  className,
  x,
  y,
  stacking = {
    type: 'normal',
  },
  tooltip,

  padding = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  margin = {
    top: 20,
    right: 20,
    bottom: 20,
    left: 40,
  },
  zooming,
  style = {},
}: AreaChartProps<TData>) => {
  const d3Format = x.time?.format || '%Y-%m-%d';
  const formatDate = timeFormat(d3Format);
  const parseDate = timeParse(d3Format);

  const { onMouseOver, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: (d: any) => {
      const xValue =
        x.scalingFunction === 'time'
          ? x.time?.isISO
            ? formatDate(isoParse(d[x.key]) as Date)
            : formatDate(parseDate(d[x.key]) as Date)
          : d[x.key];
      return `${xValue}<br/>${y
        .map((column) => `${column.key}: ${d[column.key]}`)
        .join('<br/>')}`;
    },
  });

  const refreshChart = useCallback(() => {
    const svg = select(`#${id}`);
    // Clear svg
    svg.selectAll('*').remove();

    const width = +svg.style('width').split('px')[0],
      height = +svg.style('height').split('px')[0];

    const g = svg.append('g');

    svg
      .append('clipPath')
      .attr('id', 'clip')
      .append('rect')
      .attr('x', margin?.left ?? 0)
      .attr('y', (margin?.top ?? 0) - (padding?.top ?? 0))
      .attr(
        'width',
        width -
          (padding?.right ?? 0) -
          (margin?.right ?? 0) -
          (margin?.left ?? 0)
      )
      .attr('height', height - (margin?.top ?? 0) - (margin?.bottom ?? 0));

    const toDateTime = (d: any): Date =>
      x.time?.isISO
        ? (isoParse(d[x.key]) as Date)
        : (parseDate(d[x.key]) as Date);

    const xFn =
      x.scalingFunction === 'time' ? scaleTime().nice() : scaleLinear();

    const setDefaultXDomain = (xFunction: any) => {
      x.scalingFunction === 'time'
        ? xFunction.domain([
            Number.isFinite(x.start)
              ? x.start
              : min(data.map((d) => toDateTime(d))),
            Number.isFinite(x.end)
              ? x.end
              : max(data.map((d) => toDateTime(d))),
          ])
        : xFunction.domain([
            Number.isFinite(x.start)
              ? x.start
              : !x.convert
              ? min(data.map((d: any) => d[x.key]))
              : // @ts-ignore
                min(data.map((d: any) => x.convert(d))),
            Number.isFinite(x.end)
              ? x.end
              : x.convert
              ? // @ts-ignore
                max(data.map((d) => x.convert(d)))
              : max(data.map((d: any) => d[x.key])),
          ]);
    };

    setDefaultXDomain(xFn);
    xFn.range([
      (margin?.left ?? 0) + (padding?.left ?? 0),
      width - (margin?.right ?? 0) - (padding?.right ?? 0),
    ]);

    // Draw X-axis using shared utility
    const { axisG: xAxisG, axis: xAxis } = drawAxis({
      g,
      scale: xFn,
      config: {
        ...x,
        axis: {
          ...x.axis,
          location: x.axis?.location || 'bottom',
          ticks: x.axis?.ticks || 5,
        },
      },
      dimensions: { width, height },
      margin,
      padding,
      orientation: 'horizontal',
      className: 'axis--x axis',
    });

    const stackerFn = stack().keys(y.map((column) => column.key));

    stacking?.type === '100%' && stackerFn.offset(stackOffsetExpand);

    stacking?.type === 'streamgraph' &&
      stackerFn.offset(stackOffsetWiggle).order(stackOrderInsideOut);

    stacking?.type === 'diverging' &&
      stackerFn.offset(stackOffsetDiverging).order(stackOrderReverse);

    const dataStacked = stackerFn(data as Iterable<{ [key: string]: number }>);

    const yFn = scaleLinear()
      // @ts-ignore
      .domain([
        min(dataStacked, (d) => min(d, (d) => d[0])) ?? 0,
        max(dataStacked, (d) => max(d, (d) => d[1])) ?? 0,
      ])
      .range([
        height - (margin?.bottom ?? 0) - (padding?.bottom ?? 0),
        (margin?.top ?? 0) + (padding?.top ?? 0),
      ]);

    // Get combined Y-axis label from series
    const yLabels = y
      .map((column) => column.axis?.label)
      .filter(Boolean)
      .join(', ');

    // Draw Y-axis using shared utility
    drawAxis({
      g,
      scale: yFn,
      config: {
        key: y[0].key,
        axis: {
          location: 'left',
          ticks: y[0].axis?.ticks || 5,
        },
      },
      dimensions: { width, height },
      margin,
      padding,
      orientation: 'vertical',
      labelText: yLabels || undefined,
      className: 'axis--y axis',
    });

    const areaFn = area()
      .x((d: any) =>
        x.scalingFunction === 'time'
          ? xFn(toDateTime(d.data))
          : xFn(d.data[x.key])
      )
      .y0((d: any) => yFn(d[0]))
      .y1((d: any) => yFn(d[1]));

    const areaG = g.append('g').attr('class', 'area');

    const redraw = () => {
      areaG
        .selectAll('path')
        .data(dataStacked)
        .join('path')
        // @ts-ignore
        .attr('d', areaFn)
        .attr('class', (d: any, i) =>
          twMerge(
            'fill-current stroke-1 [fill-opacity:50%]',
            y[i].className,
            d?.className || ''
          )
        )
        .attr('clip-path', 'url(#clip)')
        .on('mousemove', (event: MouseEvent) => {
          const [mouseX] = d3.pointer(event);
          const x0 = xFn.invert(mouseX);

          // Find closest data point
          const bisect = d3.bisector((d: any) =>
            x.scalingFunction === 'time'
              ? toDateTime(d).getTime()
              : Number(d[x.key])
          ).left;

          const i = bisect(data, x0, 1);
          const d0 = data[i - 1];
          const d1 = data[i];
          const closestData =
            Number(x0) -
              (x.scalingFunction === 'time'
                ? toDateTime(d0).getTime()
                : Number((d0 as any)[x.key])) >
            (x.scalingFunction === 'time'
              ? toDateTime(d1).getTime()
              : Number((d1 as any)[x.key])) -
              Number(x0)
              ? d1
              : d0;

          onMouseOver(event, closestData);
        })
        .on('mouseenter', (event: MouseEvent) => {
          onMouseOver(event, data[0]);
        })
        .on('mouseleave', onMouseLeave);
    };
    redraw();

    const extent = [
      [margin?.left ?? 0, margin?.top ?? 0],
      [width, height],
    ];

    if (zooming?.enabled) {
      const zoomFunc = zoom()
        .scaleExtent([zooming?.min || 1, zooming?.max || 1.2])
        // @ts-ignore
        .extent(extent)
        // @ts-ignore
        .translateExtent(extent)
        .on('zoom', zoomed);

      function zoomed(event: MouseEvent) {
        xFn.range(
          [
            (margin?.left ?? 0) + (padding?.left ?? 0),
            width - (margin?.right ?? 0) - (padding?.right ?? 0),
          ].map(
            // @ts-ignore
            (d: any) => event.transform.applyX(d)
          )
        );
        xAxisG.call(xAxis);
        redraw();
      }
      svg.call(zoomFunc);
    }
  }, []);

  useEffect(() => {
    refreshChart();
    return () => {
      selectAll(`#tooltip-${id}`).remove();
    };
  }, [data, refreshChart]);

  return (
    <svg
      data-testid={id}
      id={id}
      style={style}
      className={twMerge(defaultChartClassNames, className)}
    />
  );
};

export default AreaChart;

/* eslint-disable @typescript-eslint/ban-ts-comment */
import { arc, pie } from 'd3';
import { select } from 'd3-selection';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import useTooltip, { UseTooltipResult } from '@/hooks/useTooltip';

import { ChartProps, TooltipConfig } from '@/types';
import { deepValue } from '@/utils';
import { defaultChartClassNames } from '@/utils';
import measureSvg from '@/utils/measureSvg';
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

type TooltipHandlers = Pick<
  UseTooltipResult,
  'onMouseOver' | 'onMouseMove' | 'onMouseLeave'
>;

// Module-level defaults, so a render without these props passes the same
// objects each time and does not recreate refreshChart (a full redraw).
const DEFAULT_CLASS_NAME_MAP: ClassNameMap = {};
const DEFAULT_PADDING = { left: 0, top: 0, right: 0, bottom: 0 };
const DEFAULT_MARGIN = { left: 40, right: 40, top: 40, bottom: 40 };
const DEFAULT_STYLE = {};
const DEFAULT_TITLE = {
  text: null,
  className: 'text-center text-base font-bold',
};
const DEFAULT_SUBTITLE = {
  text: null,
  className: 'text-center text-sm font-normal',
};

/* catalog:start */
/**
 * Divides a circle into slices sized by value, showing how much each category
 * contributes to one whole.
 *
 * @remarks
 *
 * **Use when**
 * - The values are parts of a single whole and sum to something meaningful
 * - There are roughly six or fewer categories
 * - The rough share of one or two dominant slices is the message, not
 *   precise comparison
 * - A seating or parliament metaphor fits — set `startAngle`/`endAngle` for
 *   a semicircle
 *
 * **Avoid when**
 * - Slices need precise comparison — angles are read far less accurately
 *   than lengths; use BarChart or ColumnChart
 * - The values do not sum to a meaningful whole, e.g. independent metrics or
 *   averages
 * - Composition must be compared across categories or over time — use
 *   ColumnChartStacked or AreaChart
 * - Any value is negative — a slice cannot represent it
 *
 * **Specialised types**
 * - Donut chart — Set `innerRadius` above 0. Values are a fraction of
 *   `outerRadius`, so `innerRadius={0.5}` hollows half the radius.
 * - Semicircle chart — Set `startAngle={-90}` and `endAngle={90}`. Combine
 *   with `innerRadius` for a half donut.
 *
 * Also called: circle chart, part-to-whole chart.
 *
 * Answers: composition. Required props: `id`, `data`, `nameKey`, `valueKey`.
 *
 * @example
 * ```tsx
 * <PieChart
 *   id="revenue-share"
 *   className="w-full h-64"
 *   data={data}
 *   nameKey="product"
 *   valueKey="revenue"
 *   classNameMap={{ macbook: 'fill-purple-300', iphone: 'fill-purple-800' }}
 * />
 * ```
 *
 * @example Donut chart
 * ```tsx
 * <PieChart
 *   id="revenue-donut"
 *   className="w-full h-64"
 *   data={data}
 *   nameKey="product"
 *   valueKey="revenue"
 *   innerRadius={0.5}
 *   cornerRadius={4}
 *   paddingAngle={2}
 * />
 * ```
 *
 * @example Semicircle chart
 * ```tsx
 * <PieChart
 *   id="seat-share"
 *   className="w-full h-64"
 *   data={data}
 *   nameKey="party"
 *   valueKey="seats"
 *   startAngle={-90}
 *   endAngle={90}
 * />
 * ```
 *
 * @see ColumnChartStacked — composition compared across several
 *   categories or periods
 * @see BarChart — slices need precise comparison
 * @see WaffleChart — part-to-whole shown as countable cells rather than
 *   angles
 */
/* catalog:end */
const PieChart = <TData = any,>({
  data,
  id,
  className = '',
  classNameMap = DEFAULT_CLASS_NAME_MAP,
  padding = DEFAULT_PADDING,
  paddingAngle = 2,
  startAngle = 0,
  endAngle = 360 + startAngle,
  cornerRadius = 0,
  margin = DEFAULT_MARGIN,
  innerRadius = 0,
  outerRadius = 1,
  nameKey = 'name',
  valueKey,
  drawing,
  tooltip,
  labels,
  style = DEFAULT_STYLE,
  title = DEFAULT_TITLE,
  subtitle = DEFAULT_SUBTITLE,
  sort = true,
}: PieChartProps<TData>) => {
  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: (d: any) => `${d.data[nameKey]} = ${d.value}`,
  });

  // The hook handlers are new each render but read the latest config, so the
  // d3 listeners call them through a ref instead of making them redraw deps.
  const tooltipHandlers = useRef<TooltipHandlers | null>(null);
  useLayoutEffect(() => {
    tooltipHandlers.current = { onMouseOver, onMouseMove, onMouseLeave };
  });

  const previousArcs = useRef<any[]>([]);

  const refreshChart = useCallback(() => {
    const svg = select<SVGSVGElement, unknown>(`#${id}`);
    svg.selectAll('*').interrupt();
    svg.selectAll('*').remove();

    const { width, height } = measureSvg(svg.node());

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
    // Each draw animates from the arcs the previous draw ended on. Saved now,
    // not after the animation, so no timer is needed and a redraw mid-way
    // still starts from the last drawn data.
    const prev = previousArcs.current;
    previousArcs.current = arcs;

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
      .on('mouseenter', (e, d) => tooltipHandlers.current?.onMouseOver(e, d))
      .on('mousemove', (e, d) => tooltipHandlers.current?.onMouseMove(e, d))
      .on('mouseleave', () => tooltipHandlers.current?.onMouseLeave())
      .transition()
      .duration(drawing?.duration || 0)
      .attrTween('d', function (d) {
        const previousArc = prev.find(
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
  }, [
    id,
    startAngle,
    endAngle,
    paddingAngle,
    margin,
    innerRadius,
    cornerRadius,
    outerRadius,
    sort,
    title,
    subtitle,
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
    // Hold the node: on unmount the cleanup runs after the svg has left the
    // document, so a lookup by id would find nothing to interrupt.
    const svg = select(`#${id}`);
    return () => {
      svg.selectAll('*').interrupt();
    };
    // style is not read by refreshChart, but it sets the size refreshChart measures.
  }, [refreshChart, id, style?.width, style?.height]);

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

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { ValueFn, select } from 'd3';

import { GaugeProps } from '@/types';
import { scaleLinear } from 'd3';
import { twMerge } from 'tailwind-merge';
import useTooltip, { UseTooltipResult } from '@/hooks/useTooltip';

type TooltipHandlers = Pick<
  UseTooltipResult,
  'onMouseOver' | 'onMouseMove' | 'onMouseLeave'
>;

export interface LinearGaugeProps<TData = any> extends GaugeProps<TData> {
  label:
    | string
    | number
    | boolean
    | ValueFn<SVGTextElement, unknown, string | number | boolean | null>
    | null;
  max?: number;
  error?: { data: number; className?: string };
  gaugeHeight?: number;
  classNameGauge?: string;
  classNameGaugeBg?: string;
}

// Module-level defaults, so a render without these props passes the same
// objects each time and does not rebuild the gauge.
const DEFAULT_MARGIN = { left: 40, top: 30, right: 40, bottom: 10 };
const DEFAULT_DRAWING = { duration: 1000 };
const DEFAULT_STYLE = {};

/* catalog:start */
/**
 * A single value drawn as a filled bar on a linear scale, with an optional
 * error band.
 *
 * @remarks
 *
 * **Use when**
 * - A single value needs showing as a share of a total, with no target to
 *   compare against
 * - The gauge must fit in a table cell, list row or card — it is the most
 *   compact chart here
 * - An error or shortfall portion should be visible alongside the value
 *
 * **Avoid when**
 * - There is a target, threshold or qualitative band to compare against —
 *   use BulletChart, which encodes all of them
 * - Several related metrics should read as one unit — use RingGauge
 * - History or trend matters — use LineChart
 *
 * Also called: progress bar chart, linear progress gauge, meter.
 *
 * Answers: progress. Required props: `id`, `data`, `label`.
 *
 * @example
 * ```tsx
 * <LinearGauge
 *   id="disk-usage"
 *   className="h-12"
 *   label="Disk usage"
 *   data={0.47}
 * />
 * ```
 *
 * @see BulletChart — there is a target and threshold to show
 * @see RingGauge — several metrics each with their own target
 * @see SpeedometerChart — a dial metaphor with coloured regions suits
 *   better
 */
/* catalog:end */
const LinearGauge = <TData = any,>({
  id,
  className,
  label,
  data = 0 as any,
  max = 1,
  error,
  gaugeHeight = 6,
  margin = DEFAULT_MARGIN,
  drawing = DEFAULT_DRAWING,
  tooltip = undefined,
  classNameGauge = '',
  classNameGaugeBg = '',
  style = DEFAULT_STYLE,
}: LinearGaugeProps<TData>) => {
  // Value the data rect last animated to; each update animates from it.
  const previousData = useRef(0);
  // This instance's data rect, so updates never select another gauge's.
  const dataRectRef = useRef<SVGRectElement | null>(null);
  // The build function the svg was last built with.
  const builtWith = useRef<(() => void) | null>(null);

  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: () => `Data: ${data} <br/> Error: ${error?.data || 0}`,
  });

  // The hook handlers are new each render but read the latest config, so the
  // d3 listeners call them through a ref instead of making them rebuild deps.
  const tooltipHandlers = useRef<TooltipHandlers | null>(null);
  useLayoutEffect(() => {
    tooltipHandlers.current = { onMouseOver, onMouseMove, onMouseLeave };
  });

  const errorData = error?.data;
  const errorClassName = error?.className;

  const xScale = useCallback(() => {
    const width = +select(`#${id}`).style('width').split('px')[0];
    return scaleLinear()
      .domain([0, max])
      .range([margin.left || 0, width - (margin.right || 0)]);
  }, [id, max, margin.left, margin.right]);

  // Builds the static parts, with the data rect at the previous value. Data
  // changes do not rebuild; `update` animates the existing rect.
  const build = useCallback(() => {
    const svg = select(`#${id}`);

    svg.selectAll('*').interrupt();
    svg.selectAll('*').remove();

    const width = +svg.style('width').split('px')[0];
    const height = +svg.style('height').split('px')[0];

    const xFn = xScale();

    const g = svg.append('g');

    const gaugeG = g.append('g');

    gaugeG
      .append('text')
      .attr('class', 'fill-current text-lg')
      .text(label)
      .attr('text-anchor', 'middle')
      .attr(
        'x',
        (margin.left || 0) +
          (width - (margin.left || 0) - (margin.right || 0)) / 2
      )
      .attr('y', height - (margin.top || 0));

    gaugeG
      .append('rect')
      .attr(
        'class',
        twMerge(
          'fill-current stroke-current text-gray-300 dark:text-gray-700',
          classNameGaugeBg
        )
      )
      .attr('x', margin.left || 0)
      .attr('y', height - (margin.bottom || 0) - gaugeHeight)
      .attr('width', width - (margin.left || 0) - (margin.right || 0))
      .attr('height', gaugeHeight)
      .attr('ry', gaugeHeight / 2)
      .on('mouseenter', (e, d) => tooltipHandlers.current?.onMouseOver(e, d))
      .on('mousemove', (e, d) => tooltipHandlers.current?.onMouseMove(e, d))
      .on('mouseleave', () => tooltipHandlers.current?.onMouseLeave());

    dataRectRef.current = gaugeG
      .append('rect')
      .attr(
        'class',
        twMerge('data-rect fill-current stroke-current', classNameGauge)
      )
      .attr('x', margin.left || 0)
      .attr('y', height - (margin.bottom || 0) - gaugeHeight)
      .attr('width', xFn(previousData.current) - xFn(0))
      .attr('height', gaugeHeight)
      .attr('ry', gaugeHeight / 2)
      .node();

    errorData &&
      gaugeG
        .append('rect')
        .attr(
          'class',
          twMerge(
            'data-rect fill-current stroke-current text-red-700',
            errorClassName || ''
          )
        )
        .attr('x', width - (margin.right || 0))
        .attr('y', height - (margin.bottom || 0) - gaugeHeight)
        .attr('ry', gaugeHeight / 2)
        .attr('width', 0)
        .attr('height', gaugeHeight)
        .transition()
        .duration(drawing.duration ?? 0)
        .attr('x', () => xFn(max - errorData))
        .attr('width', () => xFn(max) - xFn(max - errorData));
  }, [
    classNameGauge,
    classNameGaugeBg,
    drawing.duration,
    errorClassName,
    errorData,
    gaugeHeight,
    id,
    label,
    margin.bottom,
    margin.left,
    margin.right,
    margin.top,
    max,
    xScale,
  ]);

  // Animates this gauge's data rect from the previous value to `data`.
  const update = useCallback(() => {
    if (!dataRectRef.current) return;
    const xFn = xScale();
    select(dataRectRef.current)
      .transition()
      .duration(drawing.duration ?? 0)
      .attr('width', xFn(data) - xFn(0));
    previousData.current = data;
  }, [data, drawing.duration, xScale]);

  // One update path: rebuild only when a structural prop changed, then
  // animate the data rect once.
  useEffect(() => {
    if (builtWith.current !== build) {
      build();
      builtWith.current = build;
    }
    update();
    // Stop the data rect's transition before the next update; other
    // transitions (the error rect) keep running unless the gauge is rebuilt.
    const rect = dataRectRef.current;
    return () => {
      if (rect) select(rect).interrupt();
    };
  }, [build, update]);

  useEffect(() => {
    // Hold the node: on unmount the cleanup runs after the svg has left the
    // document, so a lookup by id would find nothing to interrupt.
    const svg = select(`#${id}`);
    return () => {
      svg.selectAll('*').interrupt();
    };
  }, [id]);

  return (
    <svg
      id={id}
      style={style}
      className={twMerge(
        className,
        `w-full md:w-6/12 lg:w-4/12 dark:bg-gray-800 text-gray-900 dark:text-gray-50 chart `
      )}
    />
  );
};

export default LinearGauge;

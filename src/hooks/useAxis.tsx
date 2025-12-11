import { axisBottom, axisLeft, axisRight, axisTop } from 'd3-axis';
import { Selection } from 'd3-selection';
import { AxisConfig } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AxisScale = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface DrawAxisOptions<TData = any> {
  g: Selection<SVGGElement, unknown, any, any>;
  scale: AxisScale;
  config: AxisConfig<TData>;
  dimensions: {
    width: number;
    height: number;
  };
  margin: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  orientation: 'horizontal' | 'vertical';
  /** Custom label text (overrides config.axis.label) */
  labelText?: string;
  /** Custom label Y position (overrides default calculation) */
  labelY?: number;
  /** Custom CSS class for the axis group */
  className?: string;
}

export interface AxisResult {
  axisG: Selection<SVGGElement, unknown, null, undefined>;
  axis: any;
}

/**
 * Draws an axis on the provided SVG group element
 * @param options - Configuration options for the axis
 * @returns The axis group element and the d3 axis function
 */
export function drawAxis<TData = any>({
  g,
  scale,
  config,
  dimensions,
  margin,
  padding = {},
  orientation,
  labelText,
  labelY: customLabelY,
  className,
}: DrawAxisOptions<TData>): AxisResult {
  const { width, height } = dimensions;
  const location = config.axis?.location;
  const ticks = config.axis?.ticks || 5;
  const label = labelText ?? config.axis?.label;

  let axis;
  let transform: string;
  let labelX: number;
  let labelY: number;
  const textAnchor = 'middle';

  if (orientation === 'horizontal') {
    // X-axis (horizontal)
    if (location === 'top') {
      axis = axisTop(scale).ticks(ticks);
      transform = `translate(0, ${margin.top ?? 0})`;
      labelX = width / 2;
      labelY = customLabelY ?? -30;
    } else {
      // default to bottom
      axis = axisBottom(scale).ticks(ticks);
      transform = `translate(0, ${height - (margin.bottom ?? 0)})`;
      labelX = width / 2;
      labelY = customLabelY ?? 30;
    }
  } else {
    // Y-axis (vertical)
    if (location === 'right') {
      axis = axisRight(scale).ticks(ticks);
      transform = `translate(${width - (margin.right ?? 0)}, 0)`;
      labelX = 0;
      labelY = customLabelY ?? (margin.top ?? 0) - 15;
    } else {
      // default to left
      axis = axisLeft(scale).ticks(ticks);
      transform = `translate(${margin.left ?? 0}, 0)`;
      labelX = 0;
      labelY = customLabelY ?? (margin.top ?? 0) - 15;
    }
  }

  const axisClassName =
    className ?? `axis axis--${orientation === 'horizontal' ? 'x' : 'y'}`;
  const testId = orientation === 'horizontal' ? 'x-axis' : 'y-axis';

  const axisG = g
    .append('g')
    .attr('class', axisClassName)
    .attr('data-testid', testId)
    .attr('transform', transform);

  axisG.call(axis);

  // Add padding lines if needed
  if (orientation === 'horizontal') {
    if (padding.left && padding.left > 0) {
      axisG
        .append('line')
        .attr('x1', margin.left ?? 0)
        .attr('x2', (margin.left ?? 0) + padding.left)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', 'currentColor');
    }
    if (padding.right && padding.right > 0) {
      axisG
        .append('line')
        .attr('x1', width - (margin.right ?? 0) - padding.right)
        .attr('x2', width - (margin.right ?? 0))
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', 'currentColor');
    }
  } else {
    if (padding.bottom && padding.bottom > 0) {
      axisG
        .append('line')
        .attr('x1', 0)
        .attr('x2', 0)
        .attr('y1', height - (margin.bottom ?? 0) - padding.bottom)
        .attr('y2', height - (margin.bottom ?? 0))
        .attr('stroke', 'currentColor');
    }
    if (padding.top && padding.top > 0) {
      axisG
        .append('line')
        .attr('x1', 0)
        .attr('x2', 0)
        .attr('y1', margin.top ?? 0)
        .attr('y2', (margin.top ?? 0) + padding.top)
        .attr('stroke', 'currentColor');
    }
  }

  // Add label if provided
  if (label) {
    axisG
      .append('text')
      .text(label)
      .attr('fill', 'currentColor')
      .attr('text-anchor', textAnchor)
      .attr('x', labelX)
      .attr('y', labelY)
      .style('font-size', '1.1em');
  }

  return { axisG, axis };
}

/**
 * Hook that provides axis drawing utilities
 */
const useAxis = () => {
  return {
    drawAxis,
  };
};

export default useAxis;

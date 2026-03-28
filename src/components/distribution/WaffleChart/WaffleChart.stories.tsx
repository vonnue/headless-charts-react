import preview from '../../../../.storybook/preview';
import { interpolateRdYlGn, interpolateBlues } from 'd3-scale-chromatic';

import WaffleChart from '.';
import data from './sample.json';

/**
 * Waffle charts display data as a categorical heatmap grid.
 * Each cell represents a data point at the intersection of two categorical axes,
 * with color encoding a continuous value via a D3 color scale.
 *
 * Default settings:
 * - grid dimensions derived from unique x and y values in the data
 * - gap between cells = 2px
 * - no animation or tooltips
 * - all margins = 40px
 * - cell shape controlled via `classNameCell` (e.g. `rounded-full` for circles)
 */
const meta = preview.meta({
  title: 'Distribution/WaffleChart/Intro',
  component: WaffleChart,
  tags: ['autodocs'],
});

/**
 * The default chart maps `x.key` to columns, `y.key` to rows, and `color.key` to cell color
 * via a D3 sequential color scale.
 *
 * This example shows average monthly temperatures (London, 2018–2024) using the RdYlGn scale.
 */
export const Default = meta.story({
  args: {
    data,
    id: 'default-waffle-chart',
    x: { key: 'year' },
    y: { key: 'month' },
    color: {
      key: 'temperature',
      scale: interpolateRdYlGn,
    },
  },
});

/**
 * Use a single-hue sequential scale like `interpolateBlues` for a different look.
 */
export const BluesScale = meta.story({
  args: {
    ...Default.input.args,
    id: 'blues-waffle-chart',
    color: {
      key: 'temperature',
      scale: interpolateBlues,
    },
  },
});

/**
 * Animate the chart entrance with a staggered fill effect.
 */
export const Drawing = meta.story({
  args: {
    ...Default.input.args,
    id: 'drawing-waffle-chart',
    drawing: {
      duration: 1000,
    },
  },
});

/**
 * Use `classNameCell` with `rounded-full` for circular cells.
 */
export const CircleCells = meta.story({
  args: {
    ...Default.input.args,
    id: 'circle-waffle-chart',
    classNameCell: 'rounded-full',
  },
});

/**
 * Use `classNameCell` with `rounded-lg` for rounded squares.
 */
export const RoundedCells = meta.story({
  args: {
    ...Default.input.args,
    id: 'rounded-waffle-chart',
    classNameCell: 'rounded-lg',
  },
});

/**
 * Adjust `gap` to control spacing between cells.
 */
export const LargeGap = meta.story({
  args: {
    ...Default.input.args,
    id: 'large-gap-waffle-chart',
    gap: 6,
  },
});

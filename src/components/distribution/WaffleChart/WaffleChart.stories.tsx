import preview from '../../../../.storybook/preview';

import WaffleChart from '.';
import data from './sample.json';

/**
 * Waffle charts display part-to-whole relationships using a grid of cells.
 * Each cell represents a proportion of the total, colored by category.
 *
 * Default settings:
 * - 10x10 grid (100 cells)
 * - gap between cells = 2px
 * - no animation or tooltips
 * - all margins = 40px
 * - cell shape controlled via `classNameCell` (e.g. `rounded-full` for circles, `rounded-lg` for rounded squares)
 */
const meta = preview.meta({
  title: 'Distribution/WaffleChart/Intro',
  component: WaffleChart,
  tags: ['autodocs'],
});

const classNameMap = {
  macbook: 'fill-purple-300 dark:fill-purple-100',
  services: 'fill-purple-400 dark:fill-purple-300',
  wearables: 'fill-purple-500 dark:fill-purple-500',
  ipad: 'fill-purple-600 dark:fill-purple-700',
  iphone: 'fill-purple-800 dark:fill-purple-900',
};

/**
 * The default chart iterates through the `data` prop, using `valueKey` as the value and `nameKey` as the category name.
 *
 * `data`, `valueKey` and `nameKey` are required props.
 */
export const Default = meta.story({
  args: {
    data,
    id: 'default-waffle-chart',
    valueKey: 'Y2012',
    nameKey: 'name',
  },
});

/**
 * Provide a `classNameMap` prop to style each category with Tailwind classes.
 */
export const Styled = meta.story({
  args: {
    ...Default.input.args,
    id: 'styled-waffle-chart',
    classNameMap,
  },
});

/**
 * Animate the chart entrance by specifying a `duration` in milliseconds via the `drawing` prop. Cells appear one-by-one in a staggered fill effect.
 */
export const Drawing = meta.story({
  args: {
    ...Styled.input.args,
    id: 'drawing-waffle-chart',
    drawing: {
      duration: 1000,
    },
  },
});

/**
 * Use `classNameCell` with `rounded-full` to render circular cells.
 */
export const CircleCells = meta.story({
  args: {
    ...Styled.input.args,
    id: 'circle-waffle-chart',
    classNameCell: 'rounded-full',
  },
});

/**
 * Use `classNameCell` with `rounded-lg` for rounded squares.
 */
export const RoundedCells = meta.story({
  args: {
    ...Styled.input.args,
    id: 'rounded-waffle-chart',
    classNameCell: 'rounded-lg',
  },
});

/**
 * Configure the grid dimensions with `rows` and `columns` props for non-square layouts.
 */
export const CustomGrid = meta.story({
  args: {
    ...Styled.input.args,
    id: 'custom-grid-waffle-chart',
    rows: 5,
    columns: 20,
  },
});

/**
 * Adjust `gap` to control spacing between cells.
 */
export const LargeGap = meta.story({
  args: {
    ...Styled.input.args,
    id: 'large-gap-waffle-chart',
    gap: 6,
  },
});

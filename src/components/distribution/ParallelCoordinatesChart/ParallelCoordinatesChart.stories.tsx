import preview from '../../../../.storybook/preview';
import { ResizableBox } from '../../../../.storybook/ResizableContainer';
import ParallelCoordinatesChart from '.';
import data from './sample.json';

/**
 * Parallel coordinates draw one axis per measure, each with its own scale,
 * and one line per record across them. Use them to spot clusters, trade-offs
 * (lines crossing between neighbouring axes) and outliers across many
 * measures with different units.
 *
 * To create one, use the `<ParallelCoordinatesChart />` component.
 */
const meta = preview.meta({
  title: 'Distribution/ParallelCoordinatesChart/Intro',
  component: ParallelCoordinatesChart,
  tags: ['autodocs'],
});

const classNameMap = {
  US: 'stroke-slate-600',
  EU: 'stroke-sky-600',
  JP: 'stroke-amber-600',
};

/** Default: vertical axes, linear segments, hover highlight, gaps for missing values. */
export const Default = meta.story({
  args: {
    id: 'pc-default',
    className: 'w-full h-96',
    data,
    label: { key: 'model' },
    dimensions: [
      'mpg',
      { key: 'hp', label: 'Horsepower' },
      { key: 'weight', format: (v: number | string) => `${v} kg` },
      'acceleration',
      { key: 'origin', type: 'point', order: ['US', 'EU', 'JP'] },
    ],
    line: { className: 'stroke-slate-500' },
    tooltip: { className: 'bg-white text-xs p-2 shadow' },
    title: 'Cars by economy, power and weight',
  },
});

/** Colour by a categorical field with `color.classNameMap`. */
export const ColorByCategory = meta.story({
  args: {
    ...Default.input.args,
    id: 'pc-color',
    color: { key: 'origin', classNameMap },
  },
});

/** Horizontal axes stacked top to bottom, with a bump curve and a reversed axis. */
export const HorizontalBump = meta.story({
  args: {
    ...Default.input.args,
    id: 'pc-horizontal',
    className: 'w-full h-[32rem]',
    orientation: 'horizontal',
    line: { className: 'stroke-slate-500', curve: 'bump' },
    dimensions: [
      'mpg',
      { key: 'hp', label: 'Horsepower', reverse: true },
      'weight',
      'cylinders',
    ],
  },
});

/** `missing: 'drop'` removes records with a missing value instead of breaking their lines. */
export const DropMissing = meta.story({
  args: {
    ...Default.input.args,
    id: 'pc-drop',
    missing: 'drop',
  },
});

/** Empty data: an empty SVG shell. */
export const Empty = meta.story({
  args: {
    ...Default.input.args,
    id: 'pc-empty',
    data: [],
  },
});

/**
 * Charts follow the size of their container, not only `style.width`/`style.height`.
 * Drag the bottom-right corner of the box to resize it: the chart is sized with
 * `width: 100%; height: 100%` and redraws at the new size, once per animation frame.
 */
export const ResizableContainer = meta.story({
  args: {
    ...Default.input.args,
    id: 'parallel-coordinates-chart-resizable',
    style: { width: '100%', height: '100%' },
  },
  render: (args) => (
    <ResizableBox>
      <ParallelCoordinatesChart {...args} />
    </ResizableBox>
  ),
});

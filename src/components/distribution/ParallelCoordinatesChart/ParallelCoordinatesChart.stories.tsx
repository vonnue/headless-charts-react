import preview from '../../../../.storybook/preview';
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

/** Brushing: drag along an axis to filter; filtered lines are styled with `data-[filtered=true]:`. */
export const Brushing = meta.story({
  args: {
    ...Default.input.args,
    id: 'pc-brushing',
    color: { key: 'origin', classNameMap },
    line: { className: 'data-[filtered=true]:stroke-gray-200' },
    brushing: {
      className: 'fill-sky-200/40',
      onChange: (s: { indices: number[] }) => console.log('selected', s.indices),
    },
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

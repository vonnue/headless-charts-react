import preview from '../../../../.storybook/preview';
import ParallelCoordinatesChart from '.';
import data from './sample.json';

/**
 * Lines and points unfold from each axis midpoint to their values when
 * `drawing.duration` is set, after `drawing.delay`. Remount a story to replay.
 */
const meta = preview.meta({
  title: 'Distribution/ParallelCoordinatesChart/Drawing',
  component: ParallelCoordinatesChart,
  tags: ['autodocs'],
});

const classNameMap = {
  US: 'stroke-slate-600',
  EU: 'stroke-sky-600',
  JP: 'stroke-amber-600',
};

const base = {
  className: 'w-full h-96',
  data,
  label: { key: 'model' },
  dimensions: [
    'mpg',
    { key: 'hp', label: 'Horsepower' },
    { key: 'weight', format: (v: number | string) => `${v} kg` },
    'acceleration',
    { key: 'origin', type: 'point' as const, order: ['US', 'EU', 'JP'] },
  ],
  line: { className: 'stroke-slate-500' },
};

/** Vertical axes, coloured by origin. */
export const Drawing = meta.story({
  args: {
    ...base,
    id: 'pc-drawing',
    color: { key: 'origin', classNameMap },
    drawing: { duration: 1000, delay: 100 },
  },
});

/** Horizontal axes with a bump curve. */
export const Horizontal = meta.story({
  args: {
    ...base,
    id: 'pc-drawing-horizontal',
    className: 'w-full h-[32rem]',
    orientation: 'horizontal',
    line: { className: 'stroke-slate-500', curve: 'bump' },
    drawing: { duration: 1000, delay: 100 },
  },
});

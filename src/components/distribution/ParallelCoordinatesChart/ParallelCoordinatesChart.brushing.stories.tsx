import preview from '../../../../.storybook/preview';
import ParallelCoordinatesChart from '.';
import data from './sample.json';

/**
 * Set `brushing` to drag along an axis and filter records. Lines outside
 * every active brush get `data-filtered="true"`; style them with
 * `data-[filtered=true]:`. `brushing.onChange` fires on brush end and on
 * clear with the selected rows and their indices.
 */
const meta = preview.meta({
  title: 'Distribution/ParallelCoordinatesChart/Brushing',
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

/** Drag along an axis to filter; filtered lines turn light grey. */
export const Brushing = meta.story({
  args: {
    ...base,
    id: 'pc-brushing',
    color: { key: 'origin', classNameMap },
    line: { className: 'data-[filtered=true]:stroke-gray-200' },
    brushing: {
      className: 'fill-sky-200/40',
      onChange: (s: { indices: number[] }) => console.log('selected', s.indices),
    },
  },
});

/** Brushing on horizontal axes. */
export const BrushingHorizontal = meta.story({
  args: {
    ...base,
    id: 'pc-brushing-horizontal',
    className: 'w-full h-[32rem]',
    orientation: 'horizontal',
    color: { key: 'origin', classNameMap },
    line: { className: 'data-[filtered=true]:stroke-gray-200' },
    brushing: { className: 'fill-sky-200/40' },
  },
});

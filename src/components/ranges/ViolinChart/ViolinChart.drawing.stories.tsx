import preview from '../../../../.storybook/preview';
import ViolinChart from '.';
import data from './sample.json';

/**
 * Violins grow out from their centre line when `drawing.duration` is set.
 * Groups are staggered 100ms apart, after `drawing.delay`. Remount a story
 * to replay.
 */
const meta = preview.meta({
  title: 'Ranges/ViolinChart/Drawing',
  component: ViolinChart,
  tags: ['autodocs'],
});

const classNameMap = {
  Eng: 'fill-sky-300 stroke-sky-600',
  Sales: 'fill-amber-300 stroke-amber-600',
  Ops: 'fill-emerald-300 stroke-emerald-600',
};

const base = {
  className: 'w-full h-80',
  data,
  category: { key: 'dept', axis: { label: 'Department' } },
  value: {
    key: 'salary',
    className: 'fill-slate-300 stroke-slate-500',
    axis: { label: 'Salary (k)' },
  },
};

/** Vertical violins with an inner box. */
export const Vertical = meta.story({
  args: {
    ...base,
    id: 'violin-drawing',
    classNameMap,
    drawing: { duration: 1000, delay: 100 },
  },
});

/** Horizontal violins with quartile lines. */
export const Horizontal = meta.story({
  args: {
    ...base,
    id: 'violin-drawing-horizontal',
    orientation: 'horizontal',
    inner: 'quartiles',
    classNameMap,
    margin: { left: 60 },
    drawing: { duration: 1000, delay: 100 },
  },
});

/** Raincloud: half violins with jittered points. */
export const Raincloud = meta.story({
  args: {
    ...base,
    id: 'violin-drawing-raincloud',
    side: 'start',
    points: { className: 'fill-slate-600', radius: 1.5 },
    classNameMap,
    drawing: { duration: 1000, delay: 100 },
  },
});

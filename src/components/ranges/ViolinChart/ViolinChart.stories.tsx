import preview from '../../../../.storybook/preview';
import ViolinChart from '.';
import data from './sample.json';

/**
 * Violin charts show the shape of a numeric distribution in each group: a
 * mirrored kernel density estimate, with an inner box for the quartiles.
 *
 * To create a violin chart, use the `<ViolinChart />` component.
 */
const meta = preview.meta({
  title: 'Ranges/ViolinChart/Intro',
  component: ViolinChart,
  tags: ['autodocs'],
});

const classNameMap = {
  Eng: 'fill-sky-300 stroke-sky-600',
  Sales: 'fill-amber-300 stroke-amber-600',
  Ops: 'fill-emerald-300 stroke-emerald-600',
};

/** Default: vertical violins with an inner box. */
export const Default = meta.story({
  args: {
    id: 'violin-default',
    className: 'w-full h-80',
    data,
    category: { key: 'dept', axis: { label: 'Department' } },
    value: { key: 'salary', className: 'fill-slate-300 stroke-slate-500', axis: { label: 'Salary (k)' } },
    tooltip: { className: 'bg-white text-xs p-2 shadow' },
  },
});

/** Horizontal: groups run top → bottom, same inner box as Default. */
export const Horizontal = meta.story({
  args: {
    ...Default.input.args,
    id: 'violin-horizontal',
    orientation: 'horizontal',
    margin: { left: 60 },
  },
});

/** Dashed Q1/Q3 and a solid median across the violin width. */
export const Quartiles = meta.story({
  args: {
    ...Default.input.args,
    id: 'violin-quartiles',
    inner: 'quartiles',
  },
});

/** Only the median line. */
export const Median = meta.story({
  args: {
    ...Default.input.args,
    id: 'violin-median',
    inner: 'median',
  },
});

/** Density only, no inner summary. */
export const InnerNone = meta.story({
  args: {
    ...Default.input.args,
    id: 'violin-inner-none',
    inner: 'none',
  },
});

/** Raw samples overlaid on the full violin. */
export const Points = meta.story({
  args: {
    ...Default.input.args,
    id: 'violin-points',
    points: { className: 'fill-slate-600', radius: 1.5 },
  },
});

/** Raincloud: a half violin with jittered points on the empty side. */
export const Raincloud = meta.story({
  args: {
    ...Default.input.args,
    id: 'violin-raincloud',
    side: 'start',
    points: { className: 'fill-slate-600', radius: 1.5 },
    classNameMap,
  },
});

/** Violin area is proportional to sample count. Ops has fewer samples. */
export const CountScale = meta.story({
  args: {
    ...Default.input.args,
    id: 'violin-count',
    data: data.filter((d, i) => d.dept !== 'Ops' || i % 4 === 0),
    density: { scale: 'count' },
  },
});

/** Density extends 3 bandwidths past the data. */
export const Tails = meta.story({
  args: {
    ...Default.input.args,
    id: 'violin-tails',
    density: { extent: 'tails' },
  },
});

/** Degenerate groups: one sample, zero spread, and no valid samples. */
export const Degenerate = meta.story({
  args: {
    ...Default.input.args,
    id: 'violin-degenerate',
    data: [
      ...data.filter((d) => d.dept === 'Eng'),
      { dept: 'Solo', salary: 90 },
      { dept: 'Flat', salary: 80 },
      { dept: 'Flat', salary: 80 },
      { dept: 'Empty', salary: null },
    ],
  },
});

/** Empty data: an empty SVG shell. */
export const Empty = meta.story({
  args: {
    ...Default.input.args,
    id: 'violin-empty',
    data: [],
  },
});

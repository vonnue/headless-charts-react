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

/** Horizontal with quartile lines and per-group colours. */
export const Horizontal = meta.story({
  args: {
    ...Default.input.args,
    id: 'violin-horizontal',
    orientation: 'horizontal',
    inner: 'quartiles',
    classNameMap,
    margin: { left: 60 },
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

/** Count scaling with tails: area ∝ sample count, density runs past the data. */
export const CountScaleTails = meta.story({
  args: {
    ...Default.input.args,
    id: 'violin-count',
    data: data.filter((d, i) => d.dept !== 'Ops' || i % 4 === 0),
    density: { scale: 'count', extent: 'tails' },
    inner: 'median',
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

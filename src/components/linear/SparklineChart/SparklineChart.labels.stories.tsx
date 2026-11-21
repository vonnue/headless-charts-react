import preview from '../../../../.storybook/preview';
import SparklineChart from '.';
import data from './sample.json';

/**
 * Markers (`last`, `min`, `max`) and labels (`name`, `last` value) are
 * opt-in and uncoloured. Labels sit in the margins and the chart does not
 * measure text, so widen `margin.left` for names and `margin.right` for
 * last values.
 */
const meta = preview.meta({
  title: 'Linear/SparklineChart/Labels',
  component: SparklineChart,
  tags: ['autodocs'],
});

const base = {
  className: 'w-72 h-48',
  data,
  x: { key: 'date', scalingFunction: 'time' as const, time: { isISO: true } },
  y: [
    { key: 'north', label: 'North', className: 'text-slate-700' },
    { key: 'south', label: 'South', className: 'text-slate-700' },
    { key: 'east', label: 'East', className: 'text-slate-700' },
    { key: 'west', label: 'West', className: 'text-slate-700' },
  ],
};

/** Series names on the left and last values on the right, with widened margins. */
export const NameAndLastValue = meta.story({
  args: {
    ...base,
    id: 'sparkline-labels',
    margin: { top: 4, right: 40, bottom: 4, left: 48 },
    labels: { name: { className: 'text-xs' }, last: { className: 'text-xs' } },
  },
});

/** End, min and max dots; they take the row colour unless given a class. */
export const Markers = meta.story({
  args: {
    ...base,
    id: 'sparkline-markers',
    markers: { last: true, min: true, max: true },
  },
});

/** Tufte style: names, last value and dot, red min and blue max via classes. */
export const Tufte = meta.story({
  args: {
    ...base,
    id: 'sparkline-tufte',
    y: base.y.map((s) => ({ ...s, className: 'text-slate-500' })),
    margin: { top: 4, right: 40, bottom: 4, left: 48 },
    markers: {
      last: { className: 'text-slate-900' },
      min: { className: 'text-red-600' },
      max: { className: 'text-blue-600' },
    },
    labels: {
      name: { className: 'text-xs text-slate-900' },
      last: { className: 'text-xs text-slate-900', format: (v: number) => v.toFixed(1) },
    },
  },
});

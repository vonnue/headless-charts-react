import preview from '../../../../.storybook/preview';
import SparklineChart from '.';
import data from './sample.json';

/**
 * With `drawing.duration`, each line reveals left to right; markers and
 * labels fade in when their row finishes. Row `i` starts after
 * `i * drawing.delay`. Remount a story to replay the animation.
 */
const meta = preview.meta({
  title: 'Linear/SparklineChart/Drawing',
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
  margin: { top: 4, right: 40, bottom: 4, left: 48 },
  markers: { last: true },
  labels: { name: { className: 'text-xs' }, last: { className: 'text-xs' } },
};

/** All rows reveal together over one second. */
export const Drawing = meta.story({
  args: { ...base, id: 'sparkline-drawing', drawing: { duration: 1000 } },
});

/** Rows staggered 150ms apart. */
export const DrawingWithDelay = meta.story({
  args: { ...base, id: 'sparkline-drawing-delay', drawing: { duration: 600, delay: 150 } },
});

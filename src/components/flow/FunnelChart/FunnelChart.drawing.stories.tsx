import preview from '../../../../.storybook/preview';
import FunnelChart from '.';
import data from './sample.json';

/**
 * Marks grow from the midline when `drawing.duration` is set. Stages are
 * staggered 100ms apart, after `drawing.delay`. Remount a story to replay.
 */
const meta = preview.meta({
  title: 'Flow/FunnelChart/Drawing',
  component: FunnelChart,
  tags: ['autodocs'],
});

const classNameMap = {
  Visit: 'fill-slate-600',
  Signup: 'fill-slate-500',
  Activate: 'fill-slate-400',
  Subscribe: 'fill-slate-300',
  Renew: 'fill-slate-200',
};

const base = {
  className: 'w-full h-80',
  data,
  stage: { key: 'name' as const },
  value: { key: 'count' as const, className: 'fill-slate-400' },
  drawing: { duration: 1000, delay: 100 },
};

/** Trapezoid funnel, growing from the midline. */
export const Trapezoid = meta.story({
  args: {
    ...base,
    id: 'funnel-drawing',
    shape: 'trapezoid',
    classNameMap,
    labels: { stage: true },
  },
});

/** Centred bars. */
export const Bars = meta.story({
  args: {
    ...base,
    id: 'funnel-drawing-bars',
    labels: { stage: true },
  },
});

/** Horizontal trapezoids. */
export const Horizontal = meta.story({
  args: {
    ...base,
    id: 'funnel-drawing-horizontal',
    orientation: 'horizontal',
    shape: 'trapezoid',
    classNameMap,
    labels: { stage: true },
  },
});

import preview from '../../../../.storybook/preview';
import SunburstChart from '.';
import data from './sample.json';

/**
 * On first paint, arcs grow in when `drawing.duration` is set, after
 * `drawing.delay`. With `zoom`, the same `drawing.duration` also sets the zoom
 * transition. Remount a story to replay.
 */
const meta = preview.meta({
  title: 'Distribution/SunburstChart/Drawing',
  component: SunburstChart,
  tags: ['autodocs'],
});

const classNameMap = {
  src: 'fill-sky-400 stroke-white',
  docs: 'fill-amber-300 stroke-white',
  test: 'fill-emerald-400 stroke-white',
};

const base = {
  className:
    'w-full h-96 [&_[data-dimmed]]:opacity-30 [&_[data-highlighted]]:opacity-100',
  data,
  value: { key: 'size', className: 'fill-slate-300 stroke-white' },
  classNameMap,
};

/** Centre disc and rings growing in. */
export const Drawing = meta.story({
  args: {
    ...base,
    id: 'sunburst-drawing',
    labels: { name: true },
    drawing: { duration: 1000, delay: 100 },
  },
});

/** Donut growing in. */
export const Donut = meta.story({
  args: {
    ...base,
    id: 'sunburst-drawing-donut',
    innerRadius: 0.35,
    labels: { name: true },
    drawing: { duration: 1000, delay: 100 },
  },
});

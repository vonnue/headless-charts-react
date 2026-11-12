import preview from '../../../../.storybook/preview';
import SunburstChart from '.';
import data from './sample.json';

/**
 * Name, value and percent labels are off by default. Set `labels.name`,
 * `labels.value` and `labels.percent`. A label is hidden when its arc is
 * shorter than `minArcLength` or its ring thinner than `minThickness`.
 */
const meta = preview.meta({
  title: 'Distribution/SunburstChart/Labels',
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

/** Name labels. */
export const Names = meta.story({
  args: {
    ...base,
    id: 'sunburst-labels',
    labels: { name: true },
  },
});

/** Donut with percent-of-parent labels. */
export const PercentOfParent = meta.story({
  args: {
    ...base,
    id: 'sunburst-labels-percent',
    innerRadius: 0.35,
    labels: { name: true, percent: 'ofParent', minThickness: 20 },
  },
});

/** Formatted values and percent-of-root, with an object `percent` option. */
export const ValueAndPercent = meta.story({
  args: {
    ...base,
    id: 'sunburst-labels-value',
    labels: {
      value: { className: 'text-xs', format: (v: number) => v.toLocaleString() },
      percent: {
        of: 'root',
        className: 'text-xs',
        format: (pct: number | null) =>
          pct === null ? 'n/a' : `${Math.round(pct * 100)}%`,
      },
      minThickness: 20,
    },
  },
});

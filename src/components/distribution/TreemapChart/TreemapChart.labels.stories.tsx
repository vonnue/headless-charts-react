import preview from '../../../../.storybook/preview';
import TreemapChart, { HierarchyPercentKind } from '.';
import data from './sample.json';

/**
 * Name, value and percent labels are off by default. Set `labels.name`,
 * `labels.value` and `labels.percent`; cells smaller than `minWidth` /
 * `minHeight` drop their text and the rest clip to the cell.
 */
const meta = preview.meta({
  title: 'Distribution/TreemapChart/Labels',
  component: TreemapChart,
  tags: ['autodocs'],
});

const classNameMap = {
  Ops: 'fill-sky-300 stroke-white stroke-1',
  Growth: 'fill-amber-300 stroke-white stroke-1',
  'R&D': 'fill-emerald-300 stroke-white stroke-1',
};

const base = {
  className: 'w-full h-96',
  data,
  value: { key: 'amount', className: 'fill-slate-300 stroke-white stroke-1' },
  classNameMap,
};

/** Name, value and percent-of-parent labels. */
export const Labels = meta.story({
  args: {
    ...base,
    id: 'treemap-labels',
    labels: {
      name: { className: 'text-xs font-semibold' },
      value: { className: 'text-xs', format: (v: number) => `$${v}k` },
      percent: 'ofParent',
      minWidth: 50,
      minHeight: 30,
    },
  },
});

/** `labels.percent` object form: both percents with a custom class and format. */
export const Percent = meta.story({
  args: {
    ...base,
    id: 'treemap-labels-percent',
    labels: {
      name: { className: 'text-xs font-semibold' },
      percent: {
        of: 'both',
        className: 'text-xs',
        format: (pct: number | null, kind: HierarchyPercentKind) =>
          `${kind === 'ofParent' ? 'parent' : 'root'}: ${
            pct === null ? 'n/a' : `${Math.round(pct * 100)}%`
          }`,
      },
      minWidth: 60,
      minHeight: 40,
    },
  },
});

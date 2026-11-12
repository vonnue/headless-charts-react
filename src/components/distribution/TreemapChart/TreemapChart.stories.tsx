import preview from '../../../../.storybook/preview';
import TreemapChart from '.';
import data from './sample.json';

/**
 * Treemaps show a hierarchical part-to-whole as nested rectangles: each
 * cell's area encodes its value, and groups are drawn as labelled blocks
 * around their children.
 *
 * To create a treemap, use the `<TreemapChart />` component.
 */
const meta = preview.meta({
  title: 'Distribution/TreemapChart/Intro',
  component: TreemapChart,
  tags: ['autodocs'],
});

const classNameMap = {
  Ops: 'fill-sky-300',
  Growth: 'fill-amber-300',
  'R&D': 'fill-emerald-300',
};

/** Default: nested group headers (`leavesOnly` false). */
export const Default = meta.story({
  args: {
    id: 'treemap-default',
    className: 'w-full h-96',
    data,
    value: { key: 'amount', className: 'fill-slate-300 stroke-white' },
    labels: { name: true },
    tooltip: { className: 'bg-white text-xs p-2 shadow' },
  },
});

/** `leavesOnly`: leaf cells only, no group headers. */
export const LeavesOnly = meta.story({
  args: {
    ...Default.input.args,
    id: 'treemap-leaves',
    leavesOnly: true,
    classNameMap,
  },
});

/** Colour by top-level group with `classNameMap`; misses fall back to `value.className`. */
export const ColorMap = meta.story({
  args: {
    ...Default.input.args,
    id: 'treemap-colors',
    classNameMap: { Ops: 'fill-sky-400', Growth: 'fill-amber-400' },
    labels: { name: true, value: true },
  },
});

/** Empty data: an empty SVG shell, no cells. */
export const Empty = meta.story({
  args: {
    ...Default.input.args,
    id: 'treemap-empty',
    data: [],
  },
});

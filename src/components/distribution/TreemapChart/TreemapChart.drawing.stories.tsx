import preview from '../../../../.storybook/preview';
import TreemapChart from '.';
import data from './sample.json';

/**
 * Cells fade in when `drawing.duration` is set, after `drawing.delay`, each
 * depth 100ms after its parent: group headers first, then their children.
 * Remount a story to replay.
 */
const meta = preview.meta({
  title: 'Distribution/TreemapChart/Drawing',
  component: TreemapChart,
  tags: ['autodocs'],
});

const classNameMap = {
  Ops: 'fill-sky-300',
  Growth: 'fill-amber-300',
  'R&D': 'fill-emerald-300',
};

const base = {
  className: 'w-full h-96',
  data,
  value: { key: 'amount', className: 'fill-slate-300 stroke-white' },
  labels: { name: true },
  drawing: { duration: 1000, delay: 100 },
};

/** Nested group headers, drawn depth by depth. */
export const Nested = meta.story({
  args: {
    ...base,
    id: 'treemap-drawing',
    classNameMap,
  },
});

/** `leavesOnly`: leaf cells only. */
export const LeavesOnly = meta.story({
  args: {
    ...base,
    id: 'treemap-drawing-leaves',
    leavesOnly: true,
    classNameMap,
  },
});

import preview from '../../../../.storybook/preview';
import SankeyChart from '.';
import sample from './sample.json';

/**
 * Nodes in each layer grow from their leading edge, then the links
 * leaving that layer draw from source to target, when `drawing.duration`
 * is set, after `drawing.delay`. Remount a story to replay.
 */
const meta = preview.meta({
  title: 'Flow/SankeyChart/Drawing',
  component: SankeyChart,
  tags: ['autodocs'],
});

const nodeClassNameMap = {
  Coal: 'fill-stone-600',
  Gas: 'fill-sky-600',
  Solar: 'fill-amber-400',
  Wind: 'fill-teal-500',
  Nuclear: 'fill-violet-500',
  Electricity: 'fill-slate-600',
  Heat: 'fill-orange-500',
};
const linkClassNameMap = {
  Coal: 'stroke-stone-400',
  Gas: 'stroke-sky-300',
  Solar: 'stroke-amber-300',
  Wind: 'stroke-teal-300',
  Nuclear: 'stroke-violet-300',
  Electricity: 'stroke-slate-300',
  Heat: 'stroke-orange-300',
};

const base = {
  className: 'w-full h-96 text-slate-500',
  nodes: sample.nodes,
  links: sample.links,
  nodeDef: {
    labelKey: 'name',
    className: 'fill-slate-500',
    classNameMap: nodeClassNameMap,
  },
  linkDef: {
    valueKey: 'twh',
    className: 'stroke-slate-300',
    classNameMap: linkClassNameMap,
  },
};

/** Nodes grow, then links draw, layer by layer. */
export const Drawing = meta.story({
  args: {
    ...base,
    id: 'sankey-drawing',
    labels: { name: { className: 'text-xs' } },
    drawing: { duration: 1000, delay: 100 },
  },
});

/** Vertical: nodes grow along the cross axis, then links draw. */
export const Vertical = meta.story({
  args: {
    ...base,
    id: 'sankey-drawing-vertical',
    className: 'w-full h-[32rem] text-slate-500',
    orientation: 'vertical',
    labels: { name: { className: 'text-xs' } },
    drawing: { duration: 1000, delay: 100 },
  },
});

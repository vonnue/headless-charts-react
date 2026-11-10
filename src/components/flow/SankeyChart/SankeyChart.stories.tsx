import preview from '../../../../.storybook/preview';
import SankeyChart from '.';
import sample from './sample.json';

/**
 * Sankey charts show how much flows from where to where. Nodes sit in
 * layered columns, and every node height and link width uses one shared
 * scale, so both totals and splits can be read.
 *
 * To create a Sankey chart, use the `<SankeyChart />` component. Pass
 * `links` (source, target, value); `nodes` are optional.
 */
const meta = preview.meta({
  title: 'Flow/SankeyChart/Intro',
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

/** Default: links-only input, nodes inferred from the link endpoints. */
export const Default = meta.story({
  args: {
    id: 'sankey-default',
    className: 'w-full h-96 text-slate-500',
    links: sample.links,
    linkDef: { valueKey: 'twh' },
    tooltip: { className: 'bg-white text-xs p-2 shadow' },
  },
});

/** Explicit `nodes` with labels, per-node colours and value labels. */
export const Energy = meta.story({
  args: {
    ...Default.input.args,
    id: 'sankey-energy',
    nodes: sample.nodes,
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
    labels: { name: { className: 'text-xs' }, value: { className: 'fill-slate-400' } },
    title: 'Energy flows (TWh)',
  },
});

/**
 * Highlighting is headless: hovered elements get `data-highlighted`, the
 * rest `data-dimmed`. Style them with attribute selectors.
 */
export const PathHighlight = meta.story({
  args: {
    ...Energy.input.args,
    id: 'sankey-path-highlight',
    className:
      'w-full h-96 text-slate-500 [&_[data-dimmed=true]]:opacity-20 [&_path]:transition-opacity',
    highlight: 'path',
  },
});

/** `orientation="vertical"`: columns run top → bottom. */
export const Vertical = meta.story({
  args: {
    ...Energy.input.args,
    id: 'sankey-vertical',
    className: 'w-full h-[32rem] text-slate-500',
    orientation: 'vertical',
    labels: { name: { className: 'text-xs' } },
  },
});

/** `align="left"`: nodes by depth; sinks are not pushed to the last column. */
export const AlignLeft = meta.story({
  args: {
    ...Energy.input.args,
    id: 'sankey-align-left',
    align: 'left',
  },
});

/** `nodeSort="input"`: node input order in each column, no relaxation. */
export const InputOrder = meta.story({
  args: {
    ...Energy.input.args,
    id: 'sankey-input-order',
    nodeSort: 'input',
  },
});

/** Grow-in animation over `drawing.duration`. */
export const Animated = meta.story({
  args: {
    ...Energy.input.args,
    id: 'sankey-animated',
    drawing: { duration: 800 },
  },
});

/** Empty links: an empty SVG shell, no marks. */
export const Empty = meta.story({
  args: {
    ...Default.input.args,
    id: 'sankey-empty',
    links: [],
  },
});

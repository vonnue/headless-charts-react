import preview from '../../../../.storybook/preview';
import SankeyChart from '.';
import sample from './sample.json';

/**
 * Highlighting is headless: hovered elements get `data-highlighted`, the
 * rest `data-dimmed`. Style them with attribute selectors. `highlight` is
 * `'adjacent'` by default, `'path'` for every upstream and downstream
 * node and link, or `false`.
 */
const meta = preview.meta({
  title: 'Flow/SankeyChart/Highlight',
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

const dimClass =
  'w-full h-96 text-slate-500 [&_[data-dimmed=true]]:opacity-20 [&_path]:transition-opacity';

/** `highlight="path"`: the whole upstream and downstream path. */
export const PathHighlight = meta.story({
  args: {
    ...base,
    id: 'sankey-path-highlight',
    className: dimClass,
    labels: { name: { className: 'text-xs' } },
    highlight: 'path',
  },
});

/** Default `highlight="adjacent"`: the hovered element and its direct neighbours. */
export const Adjacent = meta.story({
  args: {
    ...base,
    id: 'sankey-adjacent-highlight',
    className: dimClass,
    labels: { name: { className: 'text-xs' } },
  },
});

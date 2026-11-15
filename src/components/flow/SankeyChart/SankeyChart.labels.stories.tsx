import preview from '../../../../.storybook/preview';
import SankeyChart from '.';
import sample from './sample.json';

/**
 * Node name labels are on by default; value labels are off. Set
 * `labels.name`, `labels.value` and `labels.side`.
 */
const meta = preview.meta({
  title: 'Flow/SankeyChart/Labels',
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

/** Name and value labels. */
export const Labels = meta.story({
  args: {
    ...base,
    id: 'sankey-labels',
    labels: {
      name: { className: 'text-xs' },
      value: { className: 'fill-slate-400' },
    },
  },
});

/** Formatted values, and every label on the `end` side. */
export const FormattedEnd = meta.story({
  args: {
    ...base,
    id: 'sankey-labels-formatted',
    labels: {
      name: { className: 'text-xs' },
      value: {
        className: 'fill-slate-400',
        format: (v: number) => ` ${v} TWh`,
      },
      side: 'end',
    },
  },
});

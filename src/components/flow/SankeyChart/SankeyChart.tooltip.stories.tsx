import preview from '../../../../.storybook/preview';
import SankeyChart, { SankeyLinkDatum, SankeyNodeDatum } from '.';
import sample from './sample.json';

/**
 * Hover a node or a link. Enable with `tooltip={{}}`; the default HTML is the
 * node label with its in/out totals, or for a link source → target, value and
 * its share of the source's outflow.
 */
const meta = preview.meta({
  title: 'Flow/SankeyChart/Tooltip',
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

/** Default tooltip HTML. */
export const Tooltip = meta.story({
  args: {
    ...base,
    id: 'sankey-tooltip',
    tooltip: {},
  },
});

/** Style the tooltip with `tooltip.className`. */
export const TooltipStyled = meta.story({
  args: {
    ...base,
    id: 'sankey-tooltip-styled',
    tooltip: { className: 'bg-white text-xs p-2 shadow' },
  },
});

/**
 * `tooltip.html` replaces the default HTML. The datum is a
 * `SankeyNodeDatum` or a `SankeyLinkDatum`; tell them apart with `kind`.
 */
export const TooltipCustomHtml = meta.story({
  args: {
    ...base,
    id: 'sankey-tooltip-html',
    tooltip: {
      className: 'bg-slate-800 text-white text-xs p-2 rounded',
      html: (d: SankeyNodeDatum | SankeyLinkDatum) => {
        if (d.kind === 'node')
          return `<div class="font-medium">${d.label}</div><div>${d.value} TWh</div>`;
        const share =
          d.ofTarget === null ? 'n/a' : `${Math.round(d.ofTarget * 100)}%`;
        return `<div class="font-medium">${d.source.label} → ${d.target.label}</div><div>${d.value} TWh · ${share} of ${d.target.label}</div>`;
      },
    },
  },
});

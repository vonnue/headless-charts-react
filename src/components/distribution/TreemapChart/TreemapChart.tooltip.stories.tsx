import preview from '../../../../.storybook/preview';
import TreemapChart, { HierarchyDatum } from '.';
import data from './sample.json';

/**
 * Hover a cell or group header to see its details. Enable with
 * `tooltip={{}}`; the default HTML is the breadcrumb path, the value, and the
 * percent of parent and of root.
 */
const meta = preview.meta({
  title: 'Distribution/TreemapChart/Tooltip',
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
  labels: { name: true },
  classNameMap,
};

/** Default tooltip HTML: path, value, of parent, of root. */
export const Tooltip = meta.story({
  args: {
    ...base,
    id: 'treemap-tooltip',
    tooltip: {},
  },
});

/** Style the tooltip with `tooltip.className`. */
export const TooltipStyled = meta.story({
  args: {
    ...base,
    id: 'treemap-tooltip-styled',
    tooltip: { className: 'bg-white text-xs p-2 shadow' },
  },
});

/**
 * `tooltip.html` replaces the default HTML. The datum is a `HierarchyDatum`:
 * `name`, `path`, `value`, `depth`, `parentValue`, `rootValue` and the
 * original node as `data`.
 */
export const TooltipCustomHtml = meta.story({
  args: {
    ...base,
    id: 'treemap-tooltip-html',
    tooltip: {
      className: 'bg-slate-800 text-white text-xs p-2 rounded',
      html: (d: HierarchyDatum) => {
        const share = d.rootValue
          ? `${Math.round((d.value / d.rootValue) * 100)}% of budget`
          : 'n/a';
        return `<div class="font-medium">${d.path.join(' / ')}</div><div>$${d.value}k · ${share}</div>`;
      },
    },
  },
});

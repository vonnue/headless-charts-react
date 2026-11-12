import preview from '../../../../.storybook/preview';
import SunburstChart, { HierarchyDatum } from '.';
import data from './sample.json';

/**
 * Hover an arc to see its details. Enable with `tooltip={{}}`; the default
 * HTML is the breadcrumb path, the value, and the percent of parent and of
 * root.
 */
const meta = preview.meta({
  title: 'Distribution/SunburstChart/Tooltip',
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

/** Default tooltip HTML: path, value, of parent, of root. */
export const Tooltip = meta.story({
  args: {
    ...base,
    id: 'sunburst-tooltip',
    labels: { name: true },
    tooltip: {},
  },
});

/** Style the tooltip with `tooltip.className`. */
export const TooltipStyled = meta.story({
  args: {
    ...base,
    id: 'sunburst-tooltip-styled',
    labels: { name: true },
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
    id: 'sunburst-tooltip-html',
    labels: { name: true },
    tooltip: {
      className: 'bg-slate-800 text-white text-xs p-2 rounded',
      html: (d: HierarchyDatum) => {
        const share = d.rootValue
          ? `${Math.round((d.value / d.rootValue) * 100)}% of total`
          : 'n/a';
        return `<div class="font-medium">${d.path.join(' / ')}</div><div>${d.value} · ${share}</div>`;
      },
    },
  },
});

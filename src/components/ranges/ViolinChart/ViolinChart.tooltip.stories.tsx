import preview from '../../../../.storybook/preview';
import ViolinChart, { ViolinDatum } from '.';
import data from './sample.json';

/**
 * Hover a violin to see its group's summary. Enable with `tooltip={{}}`; the
 * default HTML is the category, sample count, median, IQR and range.
 */
const meta = preview.meta({
  title: 'Ranges/ViolinChart/Tooltip',
  component: ViolinChart,
  tags: ['autodocs'],
});

const classNameMap = {
  Eng: 'fill-sky-300 stroke-sky-600',
  Sales: 'fill-amber-300 stroke-amber-600',
  Ops: 'fill-emerald-300 stroke-emerald-600',
};

const base = {
  className: 'w-full h-80',
  data,
  category: { key: 'dept', axis: { label: 'Department' } },
  value: {
    key: 'salary',
    className: 'fill-slate-300 stroke-slate-500',
    axis: { label: 'Salary (k)' },
  },
};

/** Default tooltip HTML. */
export const Tooltip = meta.story({
  args: {
    ...base,
    id: 'violin-tooltip',
    classNameMap,
    tooltip: {},
  },
});

/** Style the tooltip with `tooltip.className`. */
export const TooltipStyled = meta.story({
  args: {
    ...base,
    id: 'violin-tooltip-styled',
    classNameMap,
    tooltip: { className: 'bg-white text-xs p-2 shadow' },
  },
});

/**
 * `tooltip.html` replaces the default HTML. The datum is a `ViolinDatum`:
 * `category`, `n`, `min`, `q1`, `median`, `q3`, `max`, `mean`,
 * `bandwidth` and the group's `rows`. Stats are `NaN` when a group has no
 * valid samples.
 */
export const TooltipCustomHtml = meta.story({
  args: {
    ...base,
    id: 'violin-tooltip-html',
    classNameMap,
    tooltip: {
      className: 'bg-slate-800 text-white text-xs p-2 rounded',
      html: (d: ViolinDatum) => {
        const mean = Number.isFinite(d.mean) ? `${d.mean.toFixed(1)}k` : 'n/a';
        return `<div class="font-medium">${d.category}</div><div>mean ${mean} · ${d.n} people</div>`;
      },
    },
  },
});

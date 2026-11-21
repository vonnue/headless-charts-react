import preview from '../../../../.storybook/preview';
import ParallelCoordinatesChart, { PCDatum } from '.';
import data from './sample.json';

/**
 * Hover a line to see its record. Enable with `tooltip={{}}`; the default
 * HTML is the `label` field, then each dimension with its formatted value
 * (`n/a` when missing).
 */
const meta = preview.meta({
  title: 'Distribution/ParallelCoordinatesChart/Tooltip',
  component: ParallelCoordinatesChart,
  tags: ['autodocs'],
});

const classNameMap = {
  US: 'stroke-slate-600',
  EU: 'stroke-sky-600',
  JP: 'stroke-amber-600',
};

const base = {
  className: 'w-full h-96',
  data,
  label: { key: 'model' },
  dimensions: [
    'mpg',
    { key: 'hp', label: 'Horsepower' },
    { key: 'weight', format: (v: number | string) => `${v} kg` },
    'acceleration',
    { key: 'origin', type: 'point' as const, order: ['US', 'EU', 'JP'] },
  ],
  line: { className: 'stroke-slate-500' },
  color: { key: 'origin', classNameMap },
};

/** Default tooltip HTML. */
export const Tooltip = meta.story({
  args: {
    ...base,
    id: 'pc-tooltip',
    tooltip: {},
  },
});

/** Style the tooltip with `tooltip.className`. */
export const TooltipStyled = meta.story({
  args: {
    ...base,
    id: 'pc-tooltip-styled',
    tooltip: { className: 'bg-white text-xs p-2 shadow' },
  },
});

/**
 * `tooltip.html` replaces the default HTML. The datum is a `PCDatum`: the
 * original row as `data`, its `index`, the parsed `values` per dimension and
 * whether it passes the brushes (`selected`).
 */
export const TooltipCustomHtml = meta.story({
  args: {
    ...base,
    id: 'pc-tooltip-html',
    tooltip: {
      className: 'bg-slate-800 text-white text-xs p-2 rounded',
      html: (d: PCDatum<{ model?: string }>) =>
        `<div class="font-medium">${d.data.model ?? ''}</div><div>${d.values.mpg ?? 'n/a'} mpg · ${d.values.hp ?? 'n/a'} hp</div>`,
    },
  },
});

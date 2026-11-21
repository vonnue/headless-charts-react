import preview from '../../../../.storybook/preview';
import BoxPlot from '.';
import data from '../sample.json';

/**
 * Hover anywhere in a group's band. `tooltip={{}}` shows min, quartile
 * range, median and max (and the date in time mode).
 */
const meta = preview.meta({
  title: 'Ranges/BoxPlot/Tooltip',
  component: BoxPlot,
  tags: ['autodocs'],
});

const stats = {
  minKey: 'min',
  maxKey: 'max',
  midKey: 'mid',
  boxStart: 'firstQuartile',
  boxEnd: 'lastQuartile',
  start: 0,
};

const base = { className: 'w-full h-80', data, x: { key: 'name' }, y: stats };

/** The default HTML. */
export const DefaultTooltip = meta.story({
  args: { ...base, id: 'box-plot-tooltip-default', tooltip: {} },
});

/** Styled with `tooltip.className`. */
export const StyledTooltip = meta.story({
  args: {
    ...base,
    id: 'box-plot-tooltip-styled',
    tooltip: { className: 'bg-gray-100 text-gray-900 p-2 rounded' },
  },
});

/** A custom `tooltip.html` callback; it receives the row. */
export const CustomHtmlTooltip = meta.story({
  args: {
    ...base,
    id: 'box-plot-tooltip-html',
    tooltip: {
      html: (d: { name: string; min: number; max: number; mid: number }) =>
        `<div class="bg-gray-100 text-gray-900 p-2 rounded">
          <div class="text-lg font-bold">${d.name}</div>
          <div class="text-sm">Ranges from ${d.min} to ${d.max}, median ${d.mid}.</div>
        </div>`,
    },
  },
});

/** In vertical time mode the default HTML leads with the formatted date. */
export const TimeTooltip = meta.story({
  args: {
    ...base,
    id: 'box-plot-tooltip-time',
    tooltip: {},
    data: data.map((d, i) => ({ ...d, weekStart: `2025-01-${String(6 + 7 * i).padStart(2, '0')}` })),
    x: {
      key: 'weekStart',
      scalingFunction: 'time',
      time: { isISO: true, tooltipFormat: '%b %d, %Y' },
    },
  },
});

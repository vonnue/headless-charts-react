import preview from '../../../../.storybook/preview';
import LollipopChart from '.';
import data from './sample.json';

/**
 * Hover anywhere in a category's band. `tooltip={{}}` shows
 * `{category}: {value}` (and the formatted date in time mode).
 */
const meta = preview.meta({
  title: 'Linear/LollipopChart/Tooltip',
  component: LollipopChart,
  tags: ['autodocs'],
});

const base = {
  className: 'w-full h-80',
  data,
  x: { key: 'name' },
  y: { key: 'value', start: 0 },
};

/** The default HTML. */
export const DefaultTooltip = meta.story({
  args: { ...base, id: 'lollipop-tooltip-default', tooltip: {} },
});

/** Styled with `tooltip.className`. */
export const StyledTooltip = meta.story({
  args: {
    ...base,
    id: 'lollipop-tooltip-styled',
    tooltip: { className: 'bg-gray-100 text-gray-900 p-2 rounded' },
  },
});

/** A custom `tooltip.html` callback; it receives the row. */
export const CustomHtmlTooltip = meta.story({
  args: {
    ...base,
    id: 'lollipop-tooltip-html',
    tooltip: {
      html: (d: { name: string; value: number }) =>
        `<div class="bg-gray-100 text-gray-900 p-2 rounded">
          <div class="text-lg font-bold">${d.name}</div>
          <div class="text-sm">Value ${d.value}</div>
        </div>`,
    },
  },
});

/** In vertical time mode the default HTML uses the formatted date. */
export const TimeTooltip = meta.story({
  args: {
    className: 'w-full h-80',
    id: 'lollipop-tooltip-time',
    tooltip: {},
    data: data.map((d, i) => ({
      ...d,
      date: `2025-01-${String(6 + 7 * i).padStart(2, '0')}`,
    })),
    x: {
      key: 'date',
      scalingFunction: 'time',
      time: { isISO: true, tooltipFormat: '%b %d, %Y' },
    },
    y: { key: 'value', start: 0 },
  },
});

import preview from '../../../../.storybook/preview';
import { interpolateRdYlGn } from 'd3-scale-chromatic';

import WaffleChart from '.';
import data from './sample.json';

const meta = preview.meta({
  title: 'Distribution/WaffleChart/Tooltips',
  component: WaffleChart,
  tags: ['autodocs'],
});

/**
 * Enable tooltips by passing an empty `tooltip` object. The default tooltip shows the x, y, and color values.
 */
export const Tooltip = meta.story({
  args: {
    data,
    id: 'tooltip-waffle-chart',
    x: { key: 'year' },
    y: { key: 'month' },
    color: {
      key: 'temperature',
      scale: interpolateRdYlGn,
    },
    tooltip: {},
  },
});

/**
 * Use `tooltip.className` to style the tooltip container with Tailwind classes.
 */
export const TooltipClassName = meta.story({
  args: {
    ...Tooltip.input.args,
    id: 'tooltip-classname-waffle-chart',
    tooltip: {
      className: 'bg-gray-800 text-white px-4 py-2 rounded-md shadow-md',
    },
  },
});

/**
 * Use `tooltip.keys` to display specific fields from the data.
 */
export const TooltipKeys = meta.story({
  args: {
    ...Tooltip.input.args,
    id: 'tooltip-keys-waffle-chart',
    tooltip: {
      keys: ['year', 'month', 'temperature'],
    },
  },
});

/**
 * Use `tooltip.html` for fully custom tooltip content.
 */
export const TooltipCustomHtml = meta.story({
  args: {
    ...Tooltip.input.args,
    id: 'tooltip-html-waffle-chart',
    tooltip: {
      html: (d: any) =>
        `<strong>${d.data.month} ${d.data.year}</strong><br/>${d.data.temperature}°C`,
    },
  },
});

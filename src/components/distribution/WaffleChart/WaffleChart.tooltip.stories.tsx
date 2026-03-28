import preview from '../../../../.storybook/preview';

import WaffleChart from '.';
import data from './sample.json';

const meta = preview.meta({
  title: 'Distribution/WaffleChart/Tooltips',
  component: WaffleChart,
  tags: ['autodocs'],
});

const color = {
  key: 'name',
  classNameMap: {
    macbook: 'fill-purple-300 dark:fill-purple-100',
    services: 'fill-purple-400 dark:fill-purple-300',
    wearables: 'fill-purple-500 dark:fill-purple-500',
    ipad: 'fill-purple-600 dark:fill-purple-700',
    iphone: 'fill-purple-800 dark:fill-purple-900',
  },
};

/**
 * Enable tooltips by passing an empty `tooltip` object. The default tooltip shows the category name, value, and percentage.
 */
export const Tooltip = meta.story({
  args: {
    data,
    id: 'tooltip-waffle-chart',
    x: { key: 'Y2012' },
    color,
    tooltip: {},
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
      keys: ['name', 'Y2012'],
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
        `<strong>${d.name}</strong><br/>Revenue: $${d.value}B`,
    },
  },
});

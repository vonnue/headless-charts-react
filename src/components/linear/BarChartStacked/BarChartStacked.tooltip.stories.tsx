import preview from '../../../../.storybook/preview';
import BarChartStacked from '.';
import data from './sample.json';

/**
 * Stacked bar charts are used to compare values across categories by using horizontal bars, with some grouping. Stacked bar charts additionally show proportions within categories.
 *
 *
 * */

const meta = preview.meta({
  title: 'Linear/BarChartStacked/Tooltip',
  component: BarChartStacked,
  tags: ['autodocs'],
  args: {
    data,
  },
});

export const Tooltip = meta.story({
  args: {
    id: 'bar-chart-tooltip-default',
    x: [
      {
        key: 'macbook',
        className: 'fill-purple-800',
      },
      {
        key: 'iphone',
        className: 'fill-purple-600',
      },
      {
        key: 'ipad',
        className: 'fill-purple-400',
      },
      {
        key: 'wearables',
        className: 'fill-purple-300',
      },
      {
        key: 'services',
        className: 'fill-purple-200',
      },
    ],
    y: { key: 'year' },
    tooltip: {},
  },
});

export const TooltipStyled = meta.story({
  args: {
    ...Tooltip.input.args,
    id: 'bar-chart-tooltip-styled',
    tooltip: {
      className: 'bg-gray-100 rounded p-2',
    },
  },
});

export const TooltipCustomKeys = meta.story({
  args: {
    ...Tooltip.input.args,
    id: 'bar-chart-tooltip-custom-keys',
    tooltip: {
      className: 'bg-gray-100 rounded p-2',
      keys: ['year', 'macbook'],
    },
  },
});

export const TooltipCustomHtml = meta.story({
  args: {
    ...Tooltip.input.args,
    id: 'bar-chart-tooltip-custom-html',
    tooltip: {
      className: 'bg-gray-100 rounded p-2',
      html: (d: any) =>
        `<p className="text-xl">${d.data.year}</p><p classname="text-xs"> macbooks sold $${d.data.macbook}B</p>`,
    },
  },
});

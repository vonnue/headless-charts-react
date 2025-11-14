import preview from '../../../../.storybook/preview';

import AreaChart from '.';
import data from './data.json';

const meta = preview.meta({
  title: 'Linear/AreaChart/Tooltip',
  component: AreaChart,
  parameters: {
    controls: { expanded: true },
  },
  tags: ['autodocs'],
});

export const Tooltip = meta.story({
  args: {
    id: 'area-chart-tooltip',
    data,
    tooltip: {
      keys: ['year', 'iphone', 'macbook', 'ipad', 'wearables', 'services'],
    },
    x: {
      key: 'year',
    },
    y: [
      {
        key: 'iphone',
        className: 'text-purple-900',
      },
      {
        key: 'macbook',
        className: 'text-purple-700',
      },

      {
        key: 'ipad',
        className: 'text-purple-500',
      },
      {
        key: 'wearables',
        className: 'text-pink-700',
      },
      {
        key: 'services',
        className: 'text-purple-300',
      },
    ],
  },
});

export const TooltipWithCustomStyle = meta.story({
  args: {
    ...Tooltip.input.args,
    tooltip: {
      keys: ['year', 'iphone', 'macbook', 'ipad', 'wearables', 'services'],
      className: 'text-purple-900 bg-white p-2 rounded-md shadow-md',
    },
  },
});

export const TooltipWithCustomHtml = meta.story({
  args: {
    ...Tooltip.input.args,
    tooltip: {
      keys: ['year', 'iphone', 'macbook', 'ipad', 'wearables', 'services'],
      html: (d: any) => {
        return `<div>${d.year}</div>`;
      },
    },
  },
});

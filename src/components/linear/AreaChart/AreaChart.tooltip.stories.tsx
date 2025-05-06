import { Meta, StoryObj } from '@storybook/react';

import AreaChart from '.';
import data from './data.json';

const meta: Meta<typeof AreaChart> = {
  title: 'Linear/AreaChart/Tooltip',
  component: AreaChart,
  parameters: {
    controls: { expanded: true },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof AreaChart>;

export const Tooltip: Story = {
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
};

export const TooltipWithCustomStyle: Story = {
  args: {
    ...Tooltip.args,
    tooltip: {
      keys: ['year', 'iphone', 'macbook', 'ipad', 'wearables', 'services'],
      className: 'text-purple-900 bg-white p-2 rounded-md shadow-md',
    },
  },
};

export const TooltipWithCustomHtml: Story = {
  args: {
    ...Tooltip.args,
    tooltip: {
      keys: ['year', 'iphone', 'macbook', 'ipad', 'wearables', 'services'],
      html: (d: any) => {
        return `<div>${d.year}</div>`;
      },
    },
  },
};

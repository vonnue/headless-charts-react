import type { Meta, StoryObj } from '@storybook/react';
import AreaChart from './index';
import { DateTime } from 'luxon';

import data from './data.json';
const meta: Meta<typeof AreaChart> = {
  title: 'Linear/AreaChart/Time Scaling',
  component: AreaChart,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    data: { control: 'object' },
  },
};

export default meta;
type Story = StoryObj<typeof AreaChart>;

const timeSeriesData = data.map((d) => ({
  ...d,
  date: DateTime.fromFormat(`31-12-${d.year}`, 'dd-MM-yyyy').toFormat(
    'yyyy-MM-dd'
  ),
}));

export const TimeScaledAreaChart: Story = {
  args: {
    id: 'time-area-chart',
    data: timeSeriesData,
    x: {
      key: 'date',
      scalingFunction: 'time',
      format: 'yyyy-MM-dd',
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
    stacking: {
      type: 'normal',
    },

    tooltip: {
      html: (d: any) =>
        `Date: ${d.date}<br/>Macbook:${d.macbook}<br/>Iphone:${d.iphone}<br/>Ipad:${d.ipad}<br/>Wearables:${d.wearables}<br/>Services:${d.services}`,
    },
  },
};

export const TimeScaledStreamgraphAreaChart: Story = {
  args: {
    ...TimeScaledAreaChart.args,
    id: 'time-streamgraph-area-chart',
    stacking: {
      type: 'streamgraph',
    },
  },
};

export const TimeScaledPercentAreaChart: Story = {
  args: {
    ...TimeScaledAreaChart.args,
    id: 'time-percent-area-chart',
    stacking: {
      type: '100%',
    },
  },
};

export const TimeScaledDivergingAreaChart: Story = {
  args: {
    ...TimeScaledAreaChart.args,
    id: 'time-diverging-area-chart',
    stacking: {
      type: 'diverging',
    },
  },
};

import BarChart from '.';
import { Meta } from '@storybook/react';

import data from './sample.json';
/**
 * Bar charts are used to compare values across categories by using horizontal bars.  Bar charts are useful for showing data changes over a period of time or for comparing data among items.
 *
 * To create a bar chart, use the `<BarChart />` component.
 *
 * */
const meta: Meta<typeof BarChart> = {
  title: 'Linear/BarChart/Diverging',
  component: BarChart,
  tags: ['autodocs'],
};

export default meta;

export const DivergingBarChart = {
  args: {
    data,
    id: 'bar-chart-diverging',
    x: [
      {
        key: 'deltaMacbook',
        className: 'text-green-500 rounded',
        classNameNegative: 'text-red-500 rounded',
        axis: 'top',
        start: -10,
        end: 10,
      },
    ],
    y: { key: 'year', padding: 10 },
  },
};

export const DrawingDivergingBarChart = {
  args: {
    ...DivergingBarChart.args,
    id: 'bar-chart-diverging-drawing',
    drawing: {
      enabled: true,
      duration: 1000,
      delay: 100,
    },
  },
};

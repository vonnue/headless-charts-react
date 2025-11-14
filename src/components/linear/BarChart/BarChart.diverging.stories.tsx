import preview from '../../../../.storybook/preview';
import BarChart from '.';

import data from './sample.json';
/**
 * Bar charts are used to compare values across categories by using horizontal bars.  Bar charts are useful for showing data changes over a period of time or for comparing data among items.
 *
 * To create a bar chart, use the `<BarChart />` component.
 *
 * */
const meta = preview.meta({
  title: 'Linear/BarChart/Diverging',
  component: BarChart,
  tags: ['autodocs'],
});

export const DivergingBarChart = meta.story({
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
});

export const DrawingDivergingBarChart = meta.story({
  args: {
    ...DivergingBarChart.input.args,
    id: 'bar-chart-diverging-drawing',
    drawing: {
      enabled: true,
      duration: 1000,
      delay: 100,
    },
  },
});

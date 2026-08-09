import preview from '../../../../.storybook/preview';

import AreaChart from '.';
import data from './data.json';

const meta = preview.meta({
  title: 'Linear/AreaChart/Intro',
  component: AreaChart,
});
/**
 * AreaChart is normally used when you want to show both a trend and a split of the total.
 * For example, you want to show the trend of a product and the split of the total product by category.
 *
 */
export const Default = meta.story({
  args: {
    id: 'area-chart',
    data,
    x: {
      key: 'year',
    },
    y: [
      {
        key: 'iphone',
      },
      {
        key: 'macbook',
      },

      {
        key: 'ipad',
      },
      {
        key: 'wearables',
      },
      {
        key: 'services',
      },
    ],
  },
});

export const Styled = meta.story({
  args: {
    id: 'area-chart-styled',
    data,
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

/** AreaChart with axis labels */
export const AxisLabels = meta.story({
  args: {
    id: 'area-chart-axis-labels',
    data,
    x: {
      key: 'year',
      axis: {
        label: 'Year',
      },
    },
    y: [
      {
        key: 'iphone',
        className: 'text-purple-900',
        axis: {
          label: 'Sales ',
        },
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
    margin: {
      top: 30,
      right: 20,
      bottom: 40,
      left: 40,
    },
  } as any,
});

export const Padding = Styled.extend({
  args: {
    id: 'area-chart-padding',
    padding: {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20,
    },
  },
});

export const Zooming = Styled.extend({
  args: {
    id: 'area-chart-zooming',
    zooming: {
      enabled: true,
    },
  },
});

export const StackedArea100Percent = Styled.extend({
  args: {
    id: 'stacked-area-100',
    stacking: {
      type: '100%',
    },
  },
});

export const Streamgraph = Styled.extend({
  args: {
    id: 'stacked-area-streamgraph',
    stacking: {
      type: 'streamgraph',
    },
  },
});

const flowsData = [
  { year: 2012, inflow: 12.8, outflow: -8.6 },
  { year: 2013, inflow: 16.0, outflow: -10.1 },
  { year: 2014, inflow: 18.0, outflow: -14.3 },
  { year: 2015, inflow: 19.9, outflow: -12.7 },
  { year: 2016, inflow: 15.2, outflow: -17.4 },
  { year: 2017, inflow: 22.6, outflow: -13.9 },
];

export const DivergingArea = meta.story({
  args: {
    id: 'area-chart-diverging',
    data: flowsData,
    x: {
      key: 'year',
    },
    y: [
      {
        key: 'inflow',
        className: 'text-green-700',
      },
      {
        key: 'outflow',
        className: 'text-red-700',
      },
    ],
    stacking: {
      type: 'diverging',
    },
  },
});

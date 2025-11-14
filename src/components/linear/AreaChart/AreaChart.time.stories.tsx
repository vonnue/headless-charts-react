import preview from '../../../../.storybook/preview';
import AreaChart from './index';
import { DateTime } from 'luxon';

import data from './data.json';
const meta = preview.meta({
  title: 'Linear/AreaChart/Time Scaling',
  component: AreaChart,
  argTypes: {
    data: { control: 'object' },
  },
});

const timeSeriesData = data.map((d) => ({
  ...d,
  date: DateTime.fromFormat(`31-12-${d.year} 23:59:59`, 'dd-MM-yyyy HH:mm:ss')
    .toUTC()
    .toISO(),
}));

export const TimeScaledAreaChart = meta.story({
  args: {
    id: 'time-area-chart',
    data: timeSeriesData,
    x: {
      key: 'date',
      scalingFunction: 'time',
      isISO: true,
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
});

export const TimeScaledStreamgraphAreaChart = meta.story({
  args: {
    ...TimeScaledAreaChart.input.args,
    id: 'time-streamgraph-area-chart',
    stacking: {
      type: 'streamgraph',
    },
  },
});

export const TimeScaledPercentAreaChart = meta.story({
  args: {
    ...TimeScaledAreaChart.input.args,
    id: 'time-percent-area-chart',
    stacking: {
      type: '100%',
    },
  },
});

export const TimeScaledDivergingAreaChart = meta.story({
  args: {
    ...TimeScaledAreaChart.input.args,
    id: 'time-diverging-area-chart',
    stacking: {
      type: 'diverging',
    },
  },
});

/**
 * Example demonstrating type-safe key suggestions.
 * Define your data type and TypeScript will provide autocomplete for keys.
 */
type MetricsData = {
  time_bucket: string;
  count: number;
  totalViolation: number;
};

const metricsData: MetricsData[] = [
  {
    time_bucket: '2025-11-06T08:00:00.000Z',
    count: 29871,
    totalViolation: 17477,
  },
  {
    time_bucket: '2025-11-06T07:00:00.000Z',
    count: 10334,
    totalViolation: 6010,
  },
  {
    time_bucket: '2025-11-06T06:00:00.000Z',
    count: 22403,
    totalViolation: 12984,
  },
];

export const TypedTimeSeries = meta.story({
  args: {
    id: 'typed-time-series',
    data: metricsData,
    x: {
      key: 'time_bucket', // TypeScript autocomplete works here!
      scalingFunction: 'time',
      isISO: true,
    },
    y: [
      {
        key: 'count', // TypeScript autocomplete works here!
        className: 'text-purple-900',
      },
      {
        key: 'totalViolation', // TypeScript autocomplete works here!
        className: 'text-purple-700',
      },
    ],
  },
});

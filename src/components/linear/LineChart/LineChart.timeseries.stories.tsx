import preview from '../../../../.storybook/preview';

import { timeFormat } from 'd3-time-format';
import { timeDay } from 'd3-time';
import LineChart from '.';

const meta = preview.meta({
  title: 'Linear/LineChart/TimeSeries',
  component: LineChart,
  tags: ['autodocs'],
});

const randBetween = (x: number, y: number) => x + Math.random() * (y - x);

const arrayLength = 200;

const formatDateTime = timeFormat('%Y-%m-%d %H:%M:%S');
const formatISO = timeFormat('%Y-%m-%dT%H:%M:%S.000Z');

const today = new Date();
today.setHours(0, 0, 0, 0); // Start of day

const dataForTimeSeriesChart = new Array(arrayLength)
  .fill('')
  .map((_, index) => ({
    date: formatDateTime(timeDay.offset(today, -(arrayLength - index))),
    value: randBetween(1000, 1004),
    reading: randBetween(1000, 996),
  }));

export const TimeSeriesForLineChart = meta.story({
  args: {
    data: dataForTimeSeriesChart,
    id: 'time-series',
    x: {
      key: 'date',
      scalingFunction: 'time',
      time: {
        format: '%Y-%m-%d %H:%M:%S',
      },
      axis: { label: 'Date' },
    },
    y: [
      {
        key: 'value',
        axis: { location: 'left' },
        className: 'text-red-200 dark:text-red-700 stroke-current',
        curve: 'rounded',
      },
      {
        key: 'reading',
        className: 'text-blue-200 dark:text-red-700',
        axis: { location: 'left' },
        symbol: 'none',
      },
    ],
    referenceLines: [
      { yLeft: 1000, className: 'text-gray-200 dashed', showText: true },
    ],
  },
});

const dataForISOChart = new Array(arrayLength).fill('').map((_, index) => ({
  date: formatISO(timeDay.offset(today, -(arrayLength - index))),
  temperature: randBetween(15, 25),
  humidity: randBetween(40, 80),
}));

export const TimeSeriesWithISODates = meta.story({
  args: {
    data: dataForISOChart,
    id: 'time-series-iso',
    x: {
      key: 'date',
      scalingFunction: 'time',
      time: {
        isISO: true,
        format: '%Y-%m-%d',
      },
      axis: { label: 'Date' },
    },
    y: [
      {
        key: 'temperature',
        axis: { location: 'left' },
        className: 'text-orange-500 dark:text-orange-400 stroke-current',
        curve: 'rounded',
        symbol: 'circle',
        size: 20,
      },
      {
        key: 'humidity',
        className: 'text-blue-500 dark:text-blue-400',
        axis: { location: 'right' },
        curve: 'rounded',
        symbol: 'none',
      },
    ],
    yLeftLabel: 'Temperature (°C)',
    yRightLabel: 'Humidity (%)',
    tooltip: {
      keys: ['date', 'temperature', 'humidity'],
    },
  },
});

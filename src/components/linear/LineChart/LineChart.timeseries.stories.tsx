import preview from '../../../../.storybook/preview';

import { DateTime } from 'luxon';
import LineChart from '.';

const meta = preview.meta({
  title: 'Linear/LineChart/TimeSeries',
  component: LineChart,
  tags: ['autodocs'],
});

const randBetween = (x: number, y: number) => x + Math.random() * (y - x);

const arrayLength = 200;

const dataForTimeSeriesChart = new Array(arrayLength)
  .fill('')
  .map((_, index) => ({
    date: DateTime.now()
      .startOf('day')
      .minus({ days: arrayLength - index })
      .toFormat('yyyy-MM-dd hh:mm:ss'),
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
      format: 'yyyy-MM-dd hh:mm:ss',
      axisLabel: 'Date',
    },
    y: [
      {
        key: 'value',
        axis: 'left',
        className: 'text-red-200 dark:text-red-700 stroke-current',
        curve: 'rounded',
        // circleFill: true,
      },
      {
        key: 'reading',
        className: 'text-blue-200 dark:text-red-700',
        axis: 'left',
        symbol: 'none',
      },
    ],
    referenceLines: [
      { yLeft: 1000, className: 'text-gray-200 dashed', showText: true },
    ],
  },
});

const dataForISOChart = new Array(arrayLength)
  .fill('')
  .map((_, index) => ({
    date: DateTime.now()
      .startOf('day')
      .minus({ days: arrayLength - index })
      .toISO(),
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
      isISO: true,
      format: 'yyyy-MM-dd',
      axisLabel: 'Date',
    },
    y: [
      {
        key: 'temperature',
        axis: 'left',
        className: 'text-orange-500 dark:text-orange-400 stroke-current',
        curve: 'rounded',
        symbol: 'circle',
        size: 20,
      },
      {
        key: 'humidity',
        className: 'text-blue-500 dark:text-blue-400',
        axis: 'right',
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

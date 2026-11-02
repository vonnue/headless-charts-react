import preview from '../../../../.storybook/preview';
import ColumnChartGrouped from '.';
import data from './sample.json';

const meta = preview.meta({
  title: 'Linear/ColumnChartGrouped/Time Scaling',
  component: ColumnChartGrouped,
  tags: ['autodocs'],
});

// One true UTC instant per year (Dec 31, 00:00Z), read on a UTC axis so the
// tooltip and ticks show the same calendar date in every time zone.
const timeSeriesData = data.map((d) => ({
  ...d,
  date: new Date(Date.UTC(d.year, 11, 31)).toISOString(),
}));

export const TimeScaledColumnChart = meta.story({
  args: {
    id: 'time-column-chart',
    data: timeSeriesData,
    x: { key: 'date', scalingFunction: 'time', time: { isISO: true, utc: true } },
    y: [
      { key: 'iphone', className: 'fill-purple-800' },
      { key: 'macbook', className: 'fill-purple-500' },
    ],
    // A little extra room between the y-axis and the first slot. The time
    // domain is already padded by half a slot per side (see #16).
    padding: { left: 10, right: 10 },
  },
});

// Drop three consecutive years to exercise the median-gap cadence inference
// against an uneven gap rather than a perfectly regular cadence.
export const SparseTimeScaledColumnChart = meta.story({
  args: {
    ...TimeScaledColumnChart.input.args,
    id: 'sparse-time-column-chart',
    data: timeSeriesData.filter((d) => ![2015, 2016, 2019].includes(d.year)),
  },
});

export const ExplicitBarWidthColumnChart = meta.story({
  args: {
    ...TimeScaledColumnChart.input.args,
    id: 'explicit-bar-width-column-chart',
    x: { ...TimeScaledColumnChart.input.args.x, time: { isISO: true, utc: true, barWidth: 30 } },
  },
});

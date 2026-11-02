import preview from '../../../../.storybook/preview';
import ColumnChartStacked from '.';
import data from './sample.json';

const meta = preview.meta({
  title: 'Linear/ColumnChartStacked/Time Scaling',
  component: ColumnChartStacked,
  tags: ['autodocs'],
});

// One true UTC instant per year (Dec 31, 00:00Z), read on a UTC axis so the
// tooltip and ticks show the same calendar date in every time zone.
const timeSeriesData = data.map((d) => ({
  ...d,
  date: new Date(Date.UTC(d.year, 11, 31)).toISOString(),
}));

export const TimeScaledColumnChartStacked = meta.story({
  args: {
    id: 'time-column-chart-stacked',
    data: timeSeriesData,
    x: { key: 'date', scalingFunction: 'time', time: { isISO: true, utc: true } },
    y: [
      { key: 'macbook', className: 'fill-purple-800' },
      { key: 'iphone', className: 'fill-purple-600' },
      { key: 'ipad', className: 'fill-purple-400' },
    ],
    // A little extra room between the y-axis and the first slot. The time
    // domain is already padded by half a slot per side (see #16).
    padding: { left: 10, right: 10 },
  },
});

export const SparseTimeScaledColumnChartStacked = meta.story({
  args: {
    ...TimeScaledColumnChartStacked.input.args,
    id: 'sparse-time-column-chart-stacked',
    data: timeSeriesData.filter((d) => ![2015, 2016, 2019].includes(d.year)),
  },
});

export const ExplicitBarWidthColumnChartStacked = meta.story({
  args: {
    ...TimeScaledColumnChartStacked.input.args,
    id: 'explicit-bar-width-column-chart-stacked',
    x: { ...TimeScaledColumnChartStacked.input.args.x, time: { isISO: true, utc: true, barWidth: 30 } },
  },
});

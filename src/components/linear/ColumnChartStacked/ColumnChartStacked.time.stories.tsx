import preview from '../../../../.storybook/preview';
import ColumnChartStacked from '.';
import { timeParse, timeFormat } from 'd3-time-format';
import data from './sample.json';

const meta = preview.meta({
  title: 'Linear/ColumnChartStacked/Time Scaling',
  component: ColumnChartStacked,
  tags: ['autodocs'],
});

const parseDate = timeParse('%d-%m-%Y %H:%M:%S');
const formatISO = timeFormat('%Y-%m-%dT%H:%M:%S.000Z');
const timeSeriesData = data.map((d: any) => ({
  ...d,
  date: formatISO(parseDate(`31-12-${d.year} 23:59:59`) as Date),
}));

export const TimeScaledColumnChartStacked = meta.story({
  args: {
    id: 'time-column-chart-stacked',
    data: timeSeriesData,
    x: { key: 'date', scalingFunction: 'time', time: { isISO: true } },
    y: [
      { key: 'macbook', className: 'fill-purple-800' },
      { key: 'iphone', className: 'fill-purple-600' },
      { key: 'ipad', className: 'fill-purple-400' },
    ],
    // Without this, the first bar's left edge lands exactly on the margin
    // edge (by design — see #16, no bleed) and reads as flush against the
    // y-axis with no breathing room.
    padding: { left: 10, right: 10 },
  },
});

export const SparseTimeScaledColumnChartStacked = meta.story({
  args: {
    ...TimeScaledColumnChartStacked.input.args,
    id: 'sparse-time-column-chart-stacked',
    data: timeSeriesData.filter((d: any) => ![2015, 2016, 2019].includes(d.year)),
  },
});

export const ExplicitBarWidthColumnChartStacked = meta.story({
  args: {
    ...TimeScaledColumnChartStacked.input.args,
    id: 'explicit-bar-width-column-chart-stacked',
    x: { ...TimeScaledColumnChartStacked.input.args.x, time: { isISO: true, barWidth: 30 } },
  },
});

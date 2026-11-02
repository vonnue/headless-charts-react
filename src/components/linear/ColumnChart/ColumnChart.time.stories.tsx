import preview from '../../../../.storybook/preview';
import ColumnChartGrouped from '.';
import { timeParse, timeFormat } from 'd3-time-format';
import data from './sample.json';

const meta = preview.meta({
  title: 'Linear/ColumnChartGrouped/Time Scaling',
  component: ColumnChartGrouped,
  tags: ['autodocs'],
});

const parseDate = timeParse('%d-%m-%Y %H:%M:%S');
const formatISO = timeFormat('%Y-%m-%dT%H:%M:%S.000Z');
const timeSeriesData = data.map((d) => ({
  ...d,
  date: formatISO(parseDate(`31-12-${d.year} 23:59:59`) as Date),
}));

export const TimeScaledColumnChart = meta.story({
  args: {
    id: 'time-column-chart',
    data: timeSeriesData,
    x: { key: 'date', scalingFunction: 'time', time: { isISO: true } },
    y: [
      { key: 'iphone', className: 'fill-purple-800' },
      { key: 'macbook', className: 'fill-purple-500' },
    ],
    // Without this, the first bar's left edge lands exactly on the margin
    // edge (by design — see #16, no bleed) and reads as flush against the
    // y-axis with no breathing room.
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
    x: { ...TimeScaledColumnChart.input.args.x, time: { isISO: true, barWidth: 30 } },
  },
});

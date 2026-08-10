import preview from '../../../../.storybook/preview';
import BoxPlotV from '.';

const meta = preview.meta({
  title: 'Ranges/BoxPlotV/Time Scaling',
  component: BoxPlotV,
  tags: ['autodocs'],
});

const weeklyStats = [
  { weekStart: '2025-01-06', min: 40, firstQuartile: 55, mid: 65, lastQuartile: 78, max: 95 },
  { weekStart: '2025-01-13', min: 35, firstQuartile: 50, mid: 60, lastQuartile: 72, max: 88 },
  { weekStart: '2025-01-20', min: 45, firstQuartile: 58, mid: 70, lastQuartile: 82, max: 100 },
  { weekStart: '2025-01-27', min: 30, firstQuartile: 45, mid: 55, lastQuartile: 68, max: 80 },
  { weekStart: '2025-02-03', min: 50, firstQuartile: 62, mid: 75, lastQuartile: 88, max: 105 },
];

export const TimeScaledBoxPlotV = meta.story({
  args: {
    id: 'time-box-plot-v',
    data: weeklyStats,
    x: { key: 'weekStart', scalingFunction: 'time', time: { isISO: true } },
    y: {
      minKey: 'min',
      maxKey: 'max',
      midKey: 'mid',
      boxStart: 'firstQuartile',
      boxEnd: 'lastQuartile',
      min: 0,
    },
    padding: { left: 10, right: 10 },
  },
});

// Drop a week to show a box width derived from the median gap of the
// remaining weeks, and a visible gap where the dropped week would sit.
export const SparseTimeScaledBoxPlotV = meta.story({
  args: {
    ...TimeScaledBoxPlotV.input.args,
    id: 'sparse-time-box-plot-v',
    data: weeklyStats.filter((d) => d.weekStart !== '2025-01-20'),
  },
});

export const ExplicitBarWidthBoxPlotV = meta.story({
  args: {
    ...TimeScaledBoxPlotV.input.args,
    id: 'explicit-bar-width-box-plot-v',
    x: { ...TimeScaledBoxPlotV.input.args.x, time: { isISO: true, barWidth: 40 } },
  },
});

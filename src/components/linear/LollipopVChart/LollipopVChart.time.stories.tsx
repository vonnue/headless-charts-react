import preview from '../../../../.storybook/preview';
import LollipopVChart from '.';

const meta = preview.meta({
  title: 'Linear/LollipopVChart/Time Scaling',
  component: LollipopVChart,
  tags: ['autodocs'],
});

const weeklyData = [
  { date: '2025-01-06', reading: 12 },
  { date: '2025-01-13', reading: 18 },
  { date: '2025-01-20', reading: 9 },
  { date: '2025-01-27', reading: 22 },
  { date: '2025-02-03', reading: 16 },
  { date: '2025-02-10', reading: 28 },
  { date: '2025-02-17', reading: 20 },
  { date: '2025-02-24', reading: 31 },
];

export const TimeScaledLollipopVChart = meta.story({
  args: {
    id: 'time-lollipop-v-chart',
    data: weeklyData,
    shape: 'circle',
    x: { key: 'date', scalingFunction: 'time', time: { isISO: true } },
    y: { key: 'reading', start: 0 },
  },
});

// Drop two consecutive weeks to show stems spread proportionally to the gap.
export const SparseTimeScaledLollipopVChart = meta.story({
  args: {
    ...TimeScaledLollipopVChart.input.args,
    id: 'sparse-time-lollipop-v-chart',
    data: weeklyData.filter((d) => !['2025-02-03', '2025-02-10'].includes(d.date)),
  },
});

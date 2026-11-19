import preview from '../../../../.storybook/preview';
import LollipopChart from '.';

/**
 * A vertical lollipop whose x axis parses real dates and positions each
 * stem proportionally to elapsed time, rather than as an equal-width slot.
 */
const meta = preview.meta({
  title: 'Linear/LollipopChart/Time Scaling',
  component: LollipopChart,
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

const base = {
  className: 'w-full h-80',
  data: weeklyData,
  x: { key: 'date', scalingFunction: 'time' as const, time: { isISO: true, utc: true } },
  y: { key: 'reading', start: 0 },
  padding: { left: 10, right: 10 },
};

/** Weekly readings on a time scale. */
export const TimeScaled = meta.story({
  args: { ...base, id: 'lollipop-time-scaled' },
});

/** Two consecutive weeks dropped, so stems spread proportionally to the gap. */
export const SparseTimeScaled = meta.story({
  args: {
    ...base,
    id: 'lollipop-time-sparse',
    data: weeklyData.filter((d) => !['2025-02-03', '2025-02-10'].includes(d.date)),
  },
});

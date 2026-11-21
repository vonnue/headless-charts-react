import preview from '../../../../.storybook/preview';
import BoxPlot from '.';

/**
 * Vertical only: `x.scalingFunction: "time"` places boxes on real dates,
 * with the box width taken from the median gap between dates.
 */
const meta = preview.meta({
  title: 'Ranges/BoxPlot/Time Scaling',
  component: BoxPlot,
  tags: ['autodocs'],
});

const weeklyStats = [
  { weekStart: '2025-01-06', min: 40, firstQuartile: 55, mid: 65, lastQuartile: 78, max: 95 },
  { weekStart: '2025-01-13', min: 35, firstQuartile: 50, mid: 60, lastQuartile: 72, max: 88 },
  { weekStart: '2025-01-20', min: 45, firstQuartile: 58, mid: 70, lastQuartile: 82, max: 100 },
  { weekStart: '2025-01-27', min: 30, firstQuartile: 45, mid: 55, lastQuartile: 68, max: 80 },
  { weekStart: '2025-02-03', min: 50, firstQuartile: 62, mid: 75, lastQuartile: 88, max: 105 },
];

const stats = {
  minKey: 'min',
  maxKey: 'max',
  midKey: 'mid',
  boxStart: 'firstQuartile',
  boxEnd: 'lastQuartile',
  start: 0,
};

const base = {
  className: 'w-full h-80',
  data: weeklyStats,
  y: stats,
  padding: { left: 10, right: 10 },
};
const timeX = { key: 'weekStart', scalingFunction: 'time' as const, time: { isISO: true, utc: true } };

/** Weekly boxes on a time axis. */
export const TimeScaled = meta.story({
  args: { ...base, id: 'box-plot-time', x: timeX },
});

/** A dropped week leaves a visible gap; width still follows the median gap. */
export const SparseTimeScaled = meta.story({
  args: {
    ...base,
    id: 'box-plot-time-sparse',
    data: weeklyStats.filter((d) => d.weekStart !== '2025-01-20'),
    x: timeX,
  },
});

/** `x.time.barWidth` narrows boxes (capped at one slot). */
export const ExplicitBarWidth = meta.story({
  args: {
    ...base,
    id: 'box-plot-time-bar-width',
    x: { ...timeX, time: { ...timeX.time, barWidth: 40 } },
  },
});

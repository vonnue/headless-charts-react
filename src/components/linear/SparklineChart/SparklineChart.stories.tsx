import preview from '../../../../.storybook/preview';
import SparklineChart from '.';
import data from './sample.json';

/**
 * Sparklines are small, axis-free lines, one row per series, stacked in one
 * SVG. Every row shares one y domain (exact min..max, zero not forced), so
 * equal heights mean equal values across rows. Only the lines draw by
 * default; markers and labels are opt-in.
 *
 * To create sparklines, use the `<SparklineChart />` component.
 */
const meta = preview.meta({
  title: 'Linear/SparklineChart/Intro',
  component: SparklineChart,
  tags: ['autodocs'],
});

const base = {
  className: 'w-64 h-48',
  data,
  x: { key: 'date', scalingFunction: 'time' as const, time: { isISO: true } },
  y: [
    { key: 'north', label: 'North', className: 'text-slate-700' },
    { key: 'south', label: 'South', className: 'text-slate-700' },
    { key: 'east', label: 'East', className: 'text-slate-700' },
    { key: 'west', label: 'West', className: 'text-slate-700' },
  ],
};

// 12 series on a common scale, generated deterministically.
const MANY = Array.from({ length: 12 }, (_, s) => `s${s + 1}`);
const manyData = Array.from({ length: 40 }, (_, i) => {
  const row: Record<string, number> = { t: i };
  MANY.forEach((key, s) => {
    row[key] = +(50 + 20 * Math.sin(i / (3 + s) + s) + s * 2).toFixed(1);
  });
  return row;
});

/** Default: four regional revenue series on a time x, lines only. */
export const Default = meta.story({
  args: { ...base, id: 'sparkline-default' },
});

/** Twelve series: where a LineChart would overplot, rows stay readable. */
export const ManySeries = meta.story({
  args: {
    id: 'sparkline-many',
    className: 'w-64 h-96',
    data: manyData,
    x: { key: 't' },
    y: MANY.map((key) => ({ key, className: 'text-slate-700' })),
    margin: { top: 4, right: 4, bottom: 4, left: 32 },
    labels: { name: { className: 'text-[10px]' } },
  },
});

/** `domain` pins the shared y range; values outside it are clipped to the row. */
export const PinnedDomain = meta.story({
  args: { ...base, id: 'sparkline-pinned', domain: { start: 80, end: 160 } },
});

/** `curve: 'step'` on each series. */
export const Steps = meta.story({
  args: {
    ...base,
    id: 'sparkline-steps',
    y: base.y.map((s) => ({ ...s, curve: 'step' as const })),
  },
});

/** Empty data: an empty SVG shell, no marks. */
export const Empty = meta.story({
  args: { ...base, id: 'sparkline-empty', data: [] },
});

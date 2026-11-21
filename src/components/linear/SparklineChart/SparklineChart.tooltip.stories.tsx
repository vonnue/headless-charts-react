import preview from '../../../../.storybook/preview';
import SparklineChart, { SparklineDatum } from '.';
import data from './sample.json';

/**
 * Hover a row to see the nearest point in that series. Enable with
 * `tooltip={{}}`; the default HTML is the series label, then `x: value`.
 * There is no built-in crosshair or hover dot.
 */
const meta = preview.meta({
  title: 'Linear/SparklineChart/Tooltip',
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

/** Default tooltip HTML, styled with `tooltip.className`. */
export const DefaultTooltip = meta.story({
  args: {
    ...base,
    id: 'sparkline-tooltip',
    tooltip: { className: 'bg-white text-xs p-2 shadow' },
  },
});

/** `tooltip.html` receives a `SparklineDatum`. */
export const CustomHtml = meta.story({
  args: {
    ...base,
    id: 'sparkline-tooltip-html',
    tooltip: {
      className: 'bg-slate-800 text-white text-xs p-2 rounded',
      html: (d: SparklineDatum) =>
        `<strong>${d.seriesLabel}</strong> · ${(d.x as Date).toISOString().slice(0, 10)}<br/>${d.value.toFixed(1)}`,
    },
  },
});

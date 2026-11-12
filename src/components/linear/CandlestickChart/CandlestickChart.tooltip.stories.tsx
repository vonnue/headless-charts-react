import preview from '../../../../.storybook/preview';
import CandlestickChart, { CandleDatum } from '.';
import data from './sample.json';

/**
 * Hover a period to see its values. Enable with `tooltip={{}}`; the default
 * HTML is the date, open/high/low/close and the change from open.
 */
const meta = preview.meta({
  title: 'Linear/CandlestickChart/Tooltip',
  component: CandlestickChart,
  tags: ['autodocs'],
});

const classNames = {
  up: 'fill-sky-500 stroke-sky-600',
  down: 'fill-orange-500 stroke-orange-600',
  flat: 'fill-slate-400 stroke-slate-500',
};

const base = {
  className: 'w-full h-96',
  data,
  x: { key: 'date', time: { isISO: true } },
  open: { key: 'o' },
  high: { key: 'h' },
  low: { key: 'l' },
  close: { key: 'c' },
  classNames,
};

/** Default tooltip HTML. */
export const Tooltip = meta.story({
  args: {
    ...base,
    id: 'candlestick-tooltip',
    tooltip: {},
  },
});

/** Style the tooltip with `tooltip.className`. */
export const TooltipStyled = meta.story({
  args: {
    ...base,
    id: 'candlestick-tooltip-styled',
    tooltip: { className: 'bg-white text-xs p-2 shadow' },
  },
});

/**
 * `tooltip.html` replaces the default HTML. The datum is a `CandleDatum`:
 * `date`, `open`, `high`, `low`, `close`, `direction`, `change`,
 * `changePct`, `prevClose` and the original row as `data`.
 */
export const TooltipCustomHtml = meta.story({
  args: {
    ...base,
    id: 'candlestick-tooltip-html',
    tooltip: {
      className: 'bg-slate-800 text-white text-xs p-2 rounded',
      html: (d: CandleDatum) => {
        const pct =
          d.changePct === null ? 'n/a' : `${(d.changePct * 100).toFixed(2)}%`;
        return `<div class="font-medium">${d.date.toISOString().slice(0, 10)}</div><div>close ${d.close.toFixed(2)} · ${d.direction} ${pct}</div>`;
      },
    },
  },
});

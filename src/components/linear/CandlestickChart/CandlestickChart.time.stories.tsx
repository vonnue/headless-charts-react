import preview from '../../../../.storybook/preview';
import CandlestickChart from '.';
import data from './sample.json';

/**
 * By default the x axis is a gap-free band over the periods present. Set
 * `x.scalingFunction: 'time'` for a continuous time axis, where weekends
 * and holidays show as gaps and ticks fall on calendar boundaries.
 */
const meta = preview.meta({
  title: 'Linear/CandlestickChart/Time Scaling',
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

/** Continuous time axis: weekends and holidays show as gaps; ticks on calendar boundaries. */
export const TimeAxis = meta.story({
  args: {
    ...base,
    id: 'candlestick-time',
    x: { key: 'date', scalingFunction: 'time', time: { isISO: true } },
  },
});

/** Time axis with the volume panel. */
export const TimeAxisVolume = meta.story({
  args: {
    ...base,
    id: 'candlestick-time-volume',
    x: { key: 'date', scalingFunction: 'time', time: { isISO: true } },
    volume: { key: 'v', className: 'fill-slate-300' },
  },
});

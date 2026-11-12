import preview from '../../../../.storybook/preview';
import CandlestickChart from '.';
import data from './sample.json';

/**
 * Wicks, bodies and volume bars grow in when `drawing.duration` is set,
 * after `drawing.delay`. Remount a story to replay.
 */
const meta = preview.meta({
  title: 'Linear/CandlestickChart/Drawing',
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

/** Candles and volume growing in. */
export const Drawing = meta.story({
  args: {
    ...base,
    id: 'candlestick-drawing',
    volume: { key: 'v', className: 'fill-slate-300' },
    drawing: { duration: 1000, delay: 100 },
  },
});

/** OHLC bars growing in. */
export const OHLC = meta.story({
  args: {
    ...base,
    id: 'candlestick-drawing-ohlc',
    shape: 'ohlc',
    classNames: { up: 'stroke-sky-600', down: 'stroke-orange-600', flat: 'stroke-slate-500' },
    drawing: { duration: 1000, delay: 100 },
  },
});

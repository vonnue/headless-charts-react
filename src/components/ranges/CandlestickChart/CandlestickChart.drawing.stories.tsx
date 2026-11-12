import preview from '../../../../.storybook/preview';
import CandlestickChart from '.';
import data from './sample.json';

/**
 * Wicks and bodies (or OHLC stems) grow from open to close when
 * `drawing.duration` is set. `DrawingWithDelay` staggers that in date order:
 * the first candle starts immediately and each next one starts
 * `drawing.delay` ms after the one before. `WickReveal` uses
 * `drawing.motion: 'wick-reveal'`: each wick first extends from open to high
 * and low, then the body settles at its final rectangle while the wick stays
 * at the range (`duration` is the total, split in halves). Wick-reveal is
 * candle-only, so there is no OHLC wick-reveal story (OHLC uses `'grow'`).
 * Remount a story to replay.
 */
const meta = preview.meta({
  title: 'Ranges/CandlestickChart/Drawing',
  component: CandlestickChart,
  tags: ['autodocs'],
});

const classNames = {
  up: 'fill-sky-500 stroke-sky-600',
  down: 'fill-orange-500 stroke-orange-600',
  flat: 'fill-slate-400 stroke-slate-500',
};

const ohlcClassNames = {
  up: 'stroke-sky-600',
  down: 'stroke-orange-600',
  flat: 'stroke-slate-500',
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

/** Candles growing in together. */
export const Drawing = meta.story({
  args: {
    ...base,
    id: 'candlestick-drawing',
    drawing: { duration: 1000 },
  },
});

/** Each candle starts `drawing.delay` after the previous one. */
export const DrawingWithDelay = meta.story({
  args: {
    ...base,
    id: 'candlestick-drawing-delay',
    drawing: { duration: 200, delay: 200 },
  },
});

/** OHLC bars growing in together. */
export const OHLC = meta.story({
  args: {
    ...base,
    id: 'candlestick-drawing-ohlc',
    shape: 'ohlc',
    classNames: ohlcClassNames,
    drawing: { duration: 1000 },
  },
});

/** OHLC bars, each starting `drawing.delay` after the previous one. */
export const OHLCWithDelay = meta.story({
  args: {
    ...base,
    id: 'candlestick-drawing-ohlc-delay',
    shape: 'ohlc',
    classNames: ohlcClassNames,
    drawing: { duration: 200, delay: 200 },
  },
});

/** Wick extends to high–low, then the body settles, leaving the tails. Candle-only. */
export const WickReveal = meta.story({
  args: {
    ...base,
    id: 'candlestick-wick-reveal',
    drawing: { duration: 1000, motion: 'wick-reveal' },
  },
});

/** Wick-reveal, each candle starting `drawing.delay` after the previous one. Candle-only. */
export const WickRevealWithDelay = meta.story({
  args: {
    ...base,
    id: 'candlestick-wick-reveal-delay',
    drawing: { duration: 200, delay: 200, motion: 'wick-reveal' },
  },
});

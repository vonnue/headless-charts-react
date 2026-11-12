import preview from '../../../../.storybook/preview';
import CandlestickChart from '.';
import data from './sample.json';

/**
 * Candlestick charts show each period's open, high, low and close: a wick for
 * the high–low range and a body from open to close, classed by direction.
 * Nothing is coloured by default; pass `classNames.up/down/flat`.
 *
 * To create a candlestick chart, use the `<CandlestickChart />` component.
 */
const meta = preview.meta({
  title: 'Linear/CandlestickChart/Intro',
  component: CandlestickChart,
  tags: ['autodocs'],
});

const classNames = {
  up: 'fill-sky-500 stroke-sky-600',
  down: 'fill-orange-500 stroke-orange-600',
  flat: 'fill-slate-400 stroke-slate-500',
};

/** Default: a gap-free band axis over the trading days present (UTC for ISO dates). */
export const Default = meta.story({
  args: {
    id: 'candlestick-default',
    className: 'w-full h-96',
    data,
    x: { key: 'date', time: { isISO: true } },
    open: { key: 'o' },
    high: { key: 'h' },
    low: { key: 'l' },
    close: { key: 'c' },
    classNames,
    tooltip: { className: 'bg-white text-xs p-2 shadow' },
    title: 'Daily OHLC',
  },
});

/** OHLC bars: direction reads from the tick sides, without colour. */
export const OHLC = meta.story({
  args: {
    ...Default.input.args,
    id: 'candlestick-ohlc',
    shape: 'ohlc',
    classNames: { up: 'stroke-sky-600', down: 'stroke-orange-600', flat: 'stroke-slate-500' },
  },
});

/** Hollow up candles: shape as well as colour carries direction. */
export const Hollow = meta.story({
  args: {
    ...Default.input.args,
    id: 'candlestick-hollow',
    classNames: {
      up: 'fill-transparent stroke-slate-700',
      down: 'fill-slate-700 stroke-slate-700',
      flat: 'fill-slate-400 stroke-slate-500',
    },
  },
});

/** Crosshair that snaps to the hovered candle. */
export const Crosshair = meta.story({
  args: {
    ...Default.input.args,
    id: 'candlestick-crosshair',
    crosshair: { className: 'stroke-slate-400' },
  },
});

/** Empty data: an empty SVG shell. */
export const Empty = meta.story({
  args: {
    ...Default.input.args,
    id: 'candlestick-empty',
    data: [],
  },
});

import preview from '../../../../.storybook/preview';
import BarChart from '.';
import data from './sample.json';

/**
 * Waterfall: each series is a step of the row's running total, drawn in its
 * own slot of the band and starting where the previous step ended. Set
 * `waterfall={{ padding }}` to narrow the steps. `waterfall` wins over
 * `stacking`.
 */
const meta = preview.meta({
  title: 'Linear/BarChart/Waterfall',
  component: BarChart,
  tags: ['autodocs'],
});

const recent = data.filter((d) => d.year >= 2020);
const steps = [
  { key: 'macbook', className: 'fill-purple-800' },
  { key: 'iphone', className: 'fill-purple-600' },
  { key: 'ipad', className: 'fill-purple-400' },
  { key: 'wearables', className: 'fill-purple-300' },
  { key: 'services', className: 'fill-purple-200' },
];

export const WaterfallVertical = meta.story({
  args: {
    className: 'w-full h-80',
    data: recent,
    id: 'bar-chart-waterfall-vertical',
    waterfall: true,
    x: { key: 'year' },
    y: steps,
  },
});

export const WaterfallHorizontal = meta.story({
  args: {
    className: 'w-full h-80',
    data: recent,
    id: 'bar-chart-waterfall-horizontal',
    orientation: 'horizontal',
    waterfall: true,
    y: { key: 'year' },
    x: steps,
  },
});

/** Styled horizontal waterfall with a category inset (from the old BarChartStacked waterfall stories). */
export const WaterfallStyled = meta.story({
  args: {
    ...WaterfallHorizontal.input.args,
    id: 'bar-chart-waterfall-styled',
    className: 'w-full h-80 bg-gray-100 rounded',
    padding: { top: 20, right: 20, bottom: 20, left: 5, bar: 0.1 },
    margin: { top: 0, right: 40, bottom: 40, left: 60 },
    y: { key: 'year', className: 'text-red-500', padding: 10 },
  },
});

/** A profit bridge: gains go up and costs go down from the running total. */
export const WaterfallBridge = meta.story({
  args: {
    className: 'w-full h-80',
    id: 'bar-chart-waterfall-bridge',
    waterfall: { padding: 4 },
    data: [
      { year: '2024', revenue: 120, cost: -70, tax: -15, other: 5 },
      { year: '2025', revenue: 140, cost: -80, tax: -18, other: -4 },
    ],
    x: { key: 'year' },
    y: [
      { key: 'revenue', className: 'fill-blue-600' },
      { key: 'cost', className: 'fill-blue-600', classNameNegative: 'fill-red-500' },
      { key: 'tax', className: 'fill-blue-600', classNameNegative: 'fill-red-500' },
      { key: 'other', className: 'fill-blue-400', classNameNegative: 'fill-red-400' },
    ],
  },
});

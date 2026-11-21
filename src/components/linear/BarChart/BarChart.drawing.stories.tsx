import preview from '../../../../.storybook/preview';
import BarChart from '.';
import data from './sample.json';

/**
 * With `drawing`, bars grow from the zero baseline. Rows are staggered by
 * `drawing.delay`; every series in a row starts together. Remount a story
 * (switch away and back) to replay the animation. The component default
 * stays `{ duration: 0 }`, so the other stories render instantly.
 */
const meta = preview.meta({
  title: 'Linear/BarChart/Drawing',
  component: BarChart,
  tags: ['autodocs'],
});

const drawing = { duration: 1000, delay: 100 };

/** Vertical grouped draw-in. */
export const DrawingVertical = meta.story({
  args: {
    className: 'w-full h-80',
    data,
    id: 'bar-chart-drawing-vertical',
    drawing,
    x: { key: 'year' },
    y: [
      { key: 'macbook', className: 'fill-amber-500' },
      { key: 'iphone', className: 'fill-blue-500' },
    ],
  },
});

/** Horizontal grouped draw-in. */
export const DrawingHorizontal = meta.story({
  args: {
    className: 'w-full h-80',
    data,
    id: 'bar-chart-drawing-horizontal',
    drawing,
    orientation: 'horizontal',
    y: { key: 'year' },
    x: [
      { key: 'macbook', className: 'fill-amber-500' },
      { key: 'iphone', className: 'fill-blue-500' },
    ],
  },
});

const stackedSeries = [
  { key: 'macbook', className: 'fill-purple-800' },
  { key: 'iphone', className: 'fill-purple-600' },
  { key: 'ipad', className: 'fill-purple-400' },
];

/** Vertical stacked draw-in: segments grow from their start. */
export const DrawingStackedVertical = meta.story({
  args: {
    className: 'w-full h-80',
    data,
    id: 'bar-chart-drawing-stacked-vertical',
    drawing,
    stacking: { type: 'normal' },
    x: { key: 'year' },
    y: stackedSeries,
  },
});

/** Horizontal stacked draw-in. */
export const DrawingStackedHorizontal = meta.story({
  args: {
    className: 'w-full h-80',
    data,
    id: 'bar-chart-drawing-stacked-horizontal',
    drawing,
    orientation: 'horizontal',
    stacking: { type: 'normal' },
    y: { key: 'year' },
    x: stackedSeries,
  },
});

/** Vertical waterfall draw-in. */
export const DrawingWaterfallVertical = meta.story({
  args: {
    className: 'w-full h-80',
    data: data.filter((d) => d.year >= 2020),
    id: 'bar-chart-drawing-waterfall-vertical',
    drawing,
    waterfall: true,
    x: { key: 'year' },
    y: stackedSeries,
  },
});

/** Horizontal waterfall draw-in. */
export const DrawingWaterfallHorizontal = meta.story({
  args: {
    className: 'w-full h-80',
    data: data.filter((d) => d.year >= 2020),
    id: 'bar-chart-drawing-waterfall-horizontal',
    drawing,
    orientation: 'horizontal',
    waterfall: true,
    y: { key: 'year' },
    x: stackedSeries,
  },
});

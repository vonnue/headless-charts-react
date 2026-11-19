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

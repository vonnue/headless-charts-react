import preview from '../../../../.storybook/preview';
import BoxPlot from '.';
import data from '../sample.json';

/**
 * With `drawing`, whiskers grow from min to max, caps and medians sweep
 * across the band, and boxes grow out from the median. Rows are staggered by
 * `drawing.delay`. Remount a story (switch away and back) to replay the
 * animation. BoxPlot defaults to `{ duration: 0 }`; BoxPlotH / BoxPlotV
 * default to a 1 s draw-in.
 */
const meta = preview.meta({
  title: 'Ranges/BoxPlot/Drawing',
  component: BoxPlot,
  tags: ['autodocs'],
});

const stats = {
  minKey: 'min',
  maxKey: 'max',
  midKey: 'mid',
  boxStart: 'firstQuartile',
  boxEnd: 'lastQuartile',
  start: 0,
};

const base = {
  className: 'w-full h-80',
  data,
  drawing: { duration: 1000, delay: 100 },
};

/** Vertical draw-in. */
export const DrawingVertical = meta.story({
  args: { ...base, id: 'box-plot-drawing-vertical', x: { key: 'name' }, y: stats },
});

/** Horizontal draw-in: the same motion, mirrored. */
export const DrawingHorizontal = meta.story({
  args: {
    ...base,
    id: 'box-plot-drawing-horizontal',
    orientation: 'horizontal',
    y: { key: 'name' },
    x: stats,
  },
});

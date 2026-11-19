import preview from '../../../../.storybook/preview';
import LollipopChart from '.';
import data from './sample.json';

/**
 * With `drawing`, stems grow from the zero baseline and symbols travel with
 * them. Rows are staggered by `drawing.delay`. Remount a story (switch away
 * and back) to replay the animation. LollipopChart defaults to
 * `{ duration: 0 }`; LollipopHChart / LollipopVChart default to a 1 s
 * draw-in.
 */
const meta = preview.meta({
  title: 'Linear/LollipopChart/Drawing',
  component: LollipopChart,
  tags: ['autodocs'],
});

const base = {
  className: 'w-full h-80',
  data,
  drawing: { duration: 1000, delay: 100 },
};

/** Vertical draw-in. */
export const DrawingVertical = meta.story({
  args: {
    ...base,
    id: 'lollipop-drawing-vertical',
    x: { key: 'name' },
    y: { key: 'value', start: 0 },
  },
});

/** Horizontal draw-in: the same motion, mirrored. */
export const DrawingHorizontal = meta.story({
  args: {
    ...base,
    id: 'lollipop-drawing-horizontal',
    orientation: 'horizontal',
    y: { key: 'name' },
    x: { key: 'value', start: 0 },
  },
});

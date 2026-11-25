import preview from '../../../../.storybook/preview';
import { ResizableBox } from '../../../../.storybook/ResizableContainer';
import LollipopChart from '.';
import data from './sample.json';

/**
 * Stems ending in a symbol, marking one value per category. Vertical by
 * default; set `orientation="horizontal"` for long category labels.
 * `LollipopVChart` and `LollipopHChart` are deprecated aliases for the same
 * chart with the orientation pinned, and will be removed in 0.4.0.
 */
const meta = preview.meta({
  title: 'Linear/LollipopChart/Intro',
  component: LollipopChart,
  tags: ['autodocs'],
});

const base = { className: 'w-full h-80', data };

/** Vertical (default): categories on `x`, values on `y`. */
export const Vertical = meta.story({
  args: {
    ...base,
    id: 'lollipop-intro-vertical',
    x: { key: 'name', axis: { location: 'bottom' } },
    y: { key: 'value', start: 0, axis: { location: 'left' } },
  },
});

/** `orientation="horizontal"`: categories on `y`, values on `x`. */
export const Horizontal = meta.story({
  args: {
    ...base,
    id: 'lollipop-intro-horizontal',
    orientation: 'horizontal',
    y: { key: 'name' },
    x: { key: 'value', start: 0 },
  },
});

/** Every supported `shape`. */
export const Shapes = meta.story({
  args: {
    ...base,
    id: 'lollipop-intro-shapes',
    shape: 'diamond',
    x: { key: 'name' },
    y: { key: 'value', start: 0 },
  },
});

/** Negative values: stems grow down or left from 0. */
export const NegativeValues = meta.story({
  args: {
    className: 'w-full h-80',
    id: 'lollipop-intro-negative',
    data: [
      { name: 'A', value: -12 },
      { name: 'B', value: -4 },
      { name: 'C', value: 8 },
      { name: 'D', value: 15 },
    ],
    x: { key: 'name' },
    y: { key: 'value' },
  },
});

/** Pin `start` on the value config to leave zero out deliberately. */
export const PinnedStart = meta.story({
  args: {
    ...base,
    id: 'lollipop-intro-pinned-start',
    x: { key: 'name' },
    y: { key: 'value', start: 8 },
  },
});

/** Empty data: axes only, no marks. */
export const Empty = meta.story({
  args: {
    ...base,
    id: 'lollipop-intro-empty',
    data: [],
    x: { key: 'name' },
    y: { key: 'value', start: 0 },
  },
});

/**
 * Charts follow the size of their container, not only `style.width`/`style.height`.
 * Drag the bottom-right corner of the box to resize it: the chart is sized with
 * `width: 100%; height: 100%` and redraws at the new size, once per animation frame.
 */
export const ResizableContainer = meta.story({
  args: {
    ...Vertical.input.args,
    id: 'lollipop-chart-resizable',
    style: { width: '100%', height: '100%' },
  },
  render: (args) => (
    <ResizableBox>
      <LollipopChart {...args} />
    </ResizableBox>
  ),
});

import preview from '../../../../.storybook/preview';
import { ResizableBox } from '../../../../.storybook/ResizableContainer';
import BoxPlot from '.';
import data from '../sample.json';

/**
 * Box-and-whisker marks summarising the spread of a measure per group: min,
 * quartiles, median and max. Vertical by default; set
 * `orientation="horizontal"` for long group labels. `BoxPlotV` and
 * `BoxPlotH` are deprecated aliases for the same chart with the orientation
 * pinned, and will be removed in the next breaking release.
 */
const meta = preview.meta({
  title: 'Ranges/BoxPlot/Intro',
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

const base = { className: 'w-full h-80', data };

/** Vertical (default): groups on `x`, statistics on `y`. */
export const Vertical = meta.story({
  args: { ...base, id: 'box-plot-intro-vertical', x: { key: 'name' }, y: stats },
});

/** `orientation="horizontal"`: groups on `y`, statistics on `x`. */
export const Horizontal = meta.story({
  args: {
    ...base,
    id: 'box-plot-intro-horizontal',
    orientation: 'horizontal',
    y: { key: 'name' },
    x: stats,
  },
});

/** A `className` field on a row colours that row's box. */
export const PerRowColours = meta.story({
  args: {
    ...base,
    id: 'box-plot-intro-row-colours',
    data: data.map((d, i) => ({
      ...d,
      className: ['text-red-900', 'text-green-900', 'text-yellow-500', 'text-orange-500'][i],
    })),
    x: { key: 'name' },
    y: stats,
  },
});

/** `classNameMap` on the value config colours every mark of a group. */
export const PerGroupColours = meta.story({
  args: {
    ...base,
    id: 'box-plot-intro-group-colours',
    x: { key: 'name' },
    y: {
      ...stats,
      classNameMap: { 'Type A': 'text-sky-600', 'Type B': 'text-rose-600' },
    },
  },
});

/** One group. */
export const SingleGroup = meta.story({
  args: { ...base, id: 'box-plot-intro-single', data: data.slice(0, 1), x: { key: 'name' }, y: stats },
});

/** Empty data: axes only, no marks. */
export const Empty = meta.story({
  args: { ...base, id: 'box-plot-intro-empty', data: [], x: { key: 'name' }, y: stats },
});

/**
 * Charts follow the size of their container, not only `style.width`/`style.height`.
 * Drag the bottom-right corner of the box to resize it: the chart is sized with
 * `width: 100%; height: 100%` and redraws at the new size, once per animation frame.
 */
export const ResizableContainer = meta.story({
  args: {
    ...Vertical.input.args,
    id: 'box-plot-resizable',
    style: { width: '100%', height: '100%' },
  },
  render: (args) => (
    <ResizableBox>
      <BoxPlot {...args} />
    </ResizableBox>
  ),
});

import preview from '../../../../.storybook/preview';
import BoxPlot from '.';
import data from '../sample.json';

/** `zooming.enabled` zooms along the value axis only (scroll or pinch). */
const meta = preview.meta({
  title: 'Ranges/BoxPlot/Zoom',
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
  zooming: { enabled: true, min: 0.75, max: 2 },
};

/** Zoom along y. */
export const ZoomVertical = meta.story({
  args: { ...base, id: 'box-plot-zoom-vertical', x: { key: 'name' }, y: stats },
});

/** Zoom along x. */
export const ZoomHorizontal = meta.story({
  args: {
    ...base,
    id: 'box-plot-zoom-horizontal',
    orientation: 'horizontal',
    y: { key: 'name' },
    x: stats,
  },
});

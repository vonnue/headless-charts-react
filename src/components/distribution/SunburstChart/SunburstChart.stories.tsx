import preview from '../../../../.storybook/preview';
import SunburstChart from '.';
import data from './sample.json';

/**
 * Sunburst charts show a hierarchical part-to-whole as concentric rings:
 * each depth is a ring and each node's angle encodes its value.
 *
 * To create a sunburst, use the `<SunburstChart />` component. Hover sets
 * `data-highlighted` / `data-dimmed`; style them with attribute selectors.
 */
const meta = preview.meta({
  title: 'Distribution/SunburstChart/Intro',
  component: SunburstChart,
  tags: ['autodocs'],
});

const classNameMap = {
  src: 'fill-sky-400 stroke-white',
  docs: 'fill-amber-300 stroke-white',
  test: 'fill-emerald-400 stroke-white',
};
const highlightClass =
  'w-full h-96 [&_[data-dimmed]]:opacity-30 [&_[data-highlighted]]:opacity-100';

/** Default: centre disc, colour by top-level group, hover highlight. */
export const Default = meta.story({
  args: {
    id: 'sunburst-default',
    className: highlightClass,
    data,
    value: { key: 'size', className: 'fill-slate-300 stroke-white' },
    classNameMap,
    labels: { name: true },
    tooltip: { className: 'bg-white text-xs p-2 shadow' },
  },
});

/** Donut hole with percent-of-parent labels. */
export const Donut = meta.story({
  args: {
    ...Default.input.args,
    id: 'sunburst-donut',
    innerRadius: 0.35,
    labels: { name: true, percent: 'ofParent', minThickness: 20 },
  },
});

/** Click-to-zoom with two visible rings: click an arc to drill in, the centre (or Escape) to zoom out. */
export const Zoom = meta.story({
  args: {
    ...Default.input.args,
    id: 'sunburst-zoom',
    rings: 2,
    zoom: true,
  },
});

/** Half sunburst via startAngle / endAngle. */
export const HalfCircle = meta.story({
  args: {
    ...Default.input.args,
    id: 'sunburst-half',
    startAngle: -Math.PI / 2,
    endAngle: Math.PI / 2,
  },
});

/** Forest input: no real root, so the centre stays empty. */
export const Forest = meta.story({
  args: {
    ...Default.input.args,
    id: 'sunburst-forest',
    data: data.children,
  },
});

/** Empty data: an empty SVG shell. */
export const Empty = meta.story({
  args: {
    ...Default.input.args,
    id: 'sunburst-empty',
    data: [],
  },
});

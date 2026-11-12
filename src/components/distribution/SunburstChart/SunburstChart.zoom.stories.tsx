import preview from '../../../../.storybook/preview';
import SunburstChart from '.';
import data from './sample.json';

/**
 * Set `zoom` to drill in: click an arc (or focus it and press Enter or
 * Space) to make it the centre; click the centre or press Escape to zoom out.
 * `rings` limits how many levels show at once; deeper nodes appear as you
 * zoom in.
 */
const meta = preview.meta({
  title: 'Distribution/SunburstChart/Zoom',
  component: SunburstChart,
  tags: ['autodocs'],
});

const classNameMap = {
  src: 'fill-sky-400 stroke-white',
  docs: 'fill-amber-300 stroke-white',
  test: 'fill-emerald-400 stroke-white',
};

const base = {
  className:
    'w-full h-96 [&_[data-dimmed]]:opacity-30 [&_[data-highlighted]]:opacity-100',
  data,
  value: { key: 'size', className: 'fill-slate-300 stroke-white' },
  classNameMap,
};

/** Click-to-zoom with two visible rings. */
export const Zoom = meta.story({
  args: {
    ...base,
    id: 'sunburst-zoom',
    labels: { name: true },
    rings: 2,
    zoom: true,
  },
});

/** One ring at a time; `zoom.onChange` reports the new focus (`null` at the top). */
export const OneRingOnChange = meta.story({
  args: {
    ...base,
    id: 'sunburst-zoom-one-ring',
    labels: { name: true },
    innerRadius: 0.35,
    rings: 1,
    zoom: {
      onChange: (focus: { path: string[] } | null) =>
        console.log('focus', focus ? focus.path.join(' / ') : 'top'),
    },
  },
});

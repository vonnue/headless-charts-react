import preview from '../../../../.storybook/preview';
import BarChart from '.';
import data from './sample.json';

/**
 * `dataLabel` prints a value on each bar. Pass `className` to style the
 * text, or `dataLabel.text` to override it.
 */
const meta = preview.meta({
  title: 'Linear/BarChart/Labels',
  component: BarChart,
  tags: ['autodocs'],
});

const dataLabel = { className: 'fill-current text-xs' };

/** Labels on vertical grouped bars, centred and inside the far end. */
export const LabelsVertical = meta.story({
  args: {
    className: 'w-full h-80',
    data,
    id: 'bar-chart-labels-vertical',
    dataLabel,
    x: { key: 'year' },
    y: [{ key: 'macbook', className: 'fill-amber-500' }],
  },
});

/** Labels on horizontal bars, at the far end. */
export const LabelsHorizontal = meta.story({
  args: {
    className: 'w-full h-80',
    data,
    id: 'bar-chart-labels-horizontal',
    dataLabel,
    orientation: 'horizontal',
    y: { key: 'year' },
    x: [{ key: 'macbook', className: 'fill-amber-500' }],
  },
});

/** `dataLabel.text` overrides the printed value. */
export const CustomText = meta.story({
  args: {
    className: 'w-full h-80',
    data,
    id: 'bar-chart-labels-custom',
    dataLabel: {
      className: 'fill-current text-xs',
      text: (row: { year: number; macbook: number }) => `${row.year}: ${row.macbook}`,
    },
    x: { key: 'year' },
    y: [{ key: 'macbook', className: 'fill-amber-500' }],
  },
});

import preview from '../../../../.storybook/preview';
import LollipopVChart from '.';
import data from './sample.json';

const meta = preview.meta({
  title: 'Linear/LollipopVChart',
  component: LollipopVChart,
  tags: ['autodocs'],
});

export const Default = meta.story({
  args: {
    data,
    id: 'lollipop-v-chart-default',
    shape: 'circle',
    x: {
      axis: { location: 'bottom', ticks: 2 },
      key: 'name',
    },
    y: {
      axis: { location: 'left', ticks: 4 },
      key: 'reading',
      start: 0,
    },
  },
});

export const WithCustomShape = Default.extend({
  args: {
    shape: 'star',
  },
});

export const WithCustomStyles = WithCustomShape.extend({
  args: {
    classNameLines: 'fill-red-500 stroke-red-500',
    classNameSymbols: 'fill-blue-500 stroke-blue-500',
  },
});

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
    x: {
      axis: 'bottom',
      axisTicks: 2,
      key: 'name',
    },
    y: {
      axis: 'left',
      axisTicks: 4,
      key: 'reading',
      start: 0,
    },
  },
});

export const WithCustomShape = meta.story({
  args: {
    ...Default.input.args,
    shape: 'star',
  },
});

export const WithCustomStyles = meta.story({
  args: {
    ...WithCustomShape.input.args,
    classNameLines: 'fill-red-500 stroke-red-500',
    classNameSymbols: 'fill-blue-500 stroke-blue-500',
  },
});

import preview from '../../../../.storybook/preview';
import { deprecatedWrapperStoryMeta } from '../../../../.storybook/deprecatedWrapper';
import LollipopVChart from '.';
import data from './sample.json';

const meta = preview.meta({
  title: 'Linear/LollipopVChart',
  component: LollipopVChart,
  ...deprecatedWrapperStoryMeta('LollipopChart'),
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
    classNames: {
      lines: 'fill-red-500 stroke-red-500',
      symbols: 'fill-blue-500 stroke-blue-500',
    },
  },
});

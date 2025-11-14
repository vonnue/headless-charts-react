import preview from '../../../../.storybook/preview';
import LollipopHChart from '.';
import data from './sample.json';

const meta = preview.meta({
  title: 'Linear/LollipopHChart',
  component: LollipopHChart,
  tags: ['autodocs'],
});

export const Default = meta.story({
  args: {
    data,
    id: 'lollipop-h-chart',
    x: {
      key: 'value',
      start: 0,
    },
    y: {
      key: 'name',
    },
  },
});

export const WithTooltip = meta.story({
  args: {
    ...Default.input.args,
    id: 'lollipop-h-chart-with-tooltip',
    tooltip: {
      keys: ['name', 'value', 'reading'],
    },
  },
});

export const WithCustomTooltip = meta.story({
  args: {
    ...Default.input.args,
    id: 'lollipop-h-chart-with-custom-tooltip',
    tooltip: {
      html: (d: any) =>
        `<div class='bg-gray-800 text-white p-2 rounded'>${d.name} - ${d.value}</div>`,
    },
  },
});

export const WithCustomShape = meta.story({
  args: {
    ...Default.input.args,
    id: 'lollipop-h-chart-with-custom-shape',
    shape: 'diamond',
  },
});

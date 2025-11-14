import preview from '../../../../.storybook/preview';

import PizzaChart from '.';
import data from './sample.json';

const metrics = [
  {
    key: 'metric1',
  },
  {
    key: 'metric2',
  },
  {
    key: 'metric3',
  },
  {
    key: 'metric4',
  },
  {
    key: 'metric5',
  },
  {
    key: 'metric6',
  },
  {
    key: 'metric7',
  },
];

/**
 * Tooltips can be added to PizzaCharts to show additional information about each metric.
 */

const meta = preview.meta({
  title: 'Gauge/PizzaChart/Tooltip',
  component: PizzaChart,
  tags: ['autodocs'],
});

export const WithTooltip = meta.story({
  args: {
    id: 'pizza-chart-tooltip',
    data,
    tooltip: {},
    metrics,
  },
});

export const WithCustomColors = meta.story({
  args: {
    ...WithTooltip.input.args,
    id: 'pizza-chart-tooltip-custom-colors',
    tooltip: {
      className: 'bg-white border-2 border-purple-700 p-2 rounded',
    },
  },
});

export const WithCustomHtml = meta.story({
  args: {
    ...WithTooltip.input.args,
    id: 'pizza-chart-tooltip-custom-html',
    tooltip: {
      html: (d: { index: number }) =>
        `<div class="bg-white border-2 border-purple-700 p-2 rounded">
        ${metrics[d.index].key} was scored at ${`${
          // @ts-ignore
          data[metrics[d.index].key] || ''
        }`}.
        </div>`,
    },
  },
});

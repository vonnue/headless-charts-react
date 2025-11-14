import preview from '../../../../.storybook/preview';

import RingGauge from '.';
import metrics from './sample.json';

const meta = preview.meta({
  title: 'Gauge/RingGauge/Tooltips',
  component: RingGauge,
  tags: ['autodocs'],
});

/** Ring gauge with tooltip */
export const WithTooltip = meta.story({
  args: {
    data: metrics.map(({ className, ...metric }: any) => metric),
    id: 'ring-chart-tooltip',
    labelKey: 'name',
    dataKey: 'score',
    targetKey: 'target',
    tooltip: {
      className: `bg-gray-800 text-white px-4 py-2 rounded-md shadow-md`,
    },
  },
});

/** Ring gauge with custom tooltip */
export const WithCustomTooltip = meta.story({
  args: {
    ...WithTooltip.input.args,
    id: 'ring-chart-custom-tooltip',
    tooltip: {
      className: `bg-gray-800 text-white px-4 py-2 rounded-md shadow-md`,
      html: (data: any) => `<div class="flex flex-col">
              <div class="text-lg">${data.name}</div>
              <div class="text-xs">${data.score} out of ${data.target}</div>
            </div>`,
    },
  },
});

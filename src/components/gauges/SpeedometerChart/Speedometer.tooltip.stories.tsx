import preview from '../../../../.storybook/preview';

import SpeedometerChart from '.';

const meta = preview.meta({
  title: 'Gauge/Speedometer/Tooltips',
  component: SpeedometerChart,
  tags: ['autodocs'],
});

/** Speedometer with tooltip */
export const WithTooltip = meta.story({
  args: {
    data: 0.7,
    label: {
      text: 'Coverage',
    },
    id: 'speedometer-tooltip',
    regions: [
      {
        limit: 0.5,
        className: 'fill-red-500',
      },
      {
        limit: 0.8,
        className: 'fill-yellow-500',
      },
      {
        limit: 1,
        className: 'fill-green-500',
      },
    ],
    tooltip: {
      className: 'bg-gray-800 text-white px-4 py-2 rounded-md shadow-md',
    },
  },
});

/** Speedometer with custom tooltip */
export const WithCustomTooltip = meta.story({
  args: {
    ...WithTooltip.input.args,
    id: 'speedometer-custom-tooltip',
    tooltip: {
      className: 'bg-gray-800 text-white px-4 py-2 rounded-md shadow-md',
      html: (d: any) =>
        `<div class="flex flex-col">
          <div class="text-lg font-bold">Coverage</div>
          <div class="text-sm">${(d.value * 100).toFixed(1)}%</div>
        </div>`,
    },
  },
});

import preview from '../../../../.storybook/preview';

import SpeedometerChart from '.';

const meta = preview.meta({
  title: 'Gauge/Speedometer/customized',
  component: SpeedometerChart,
  tags: ['autodocs'],
});

export const WithRegions = meta.story({
  args: {
    data: 0.7,
    label: {
      text: 'Coverage',
    },
    id: 'speedometer-with-regions',
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
        limit: 0.9,
        className: 'fill-green-500',
      },
      {
        limit: 1,
        className: 'fill-blue-500',
      },
    ],
  },
});

import preview from '../../../../.storybook/preview';

import LinearGauge from '.';

const meta = preview.meta({
  title: 'Gauge/LinearGauge/Tooltips',
  component: LinearGauge,
  tags: ['autodocs'],
});

export const ToolTip = meta.story({
  args: {
    id: 'linear-gauge-with-tooltip',
    className: '',
    label: 'Linear Gauge Graph With Tooltip',
    data: 67,
    max: 100,
    drawing: { duration: 2000 },
    tooltip: {
      className: 'bg-gray-800 text-white p-2 rounded',
    },
  },
});

export const ToolTipWithCustomHtml = meta.story({
  args: {
    ...ToolTip.input.args,
    id: 'linear-gauge-with-tooltip-custom-html',
    error: { data: 2 },
    tooltip: {
      html: () =>
        `<div class='bg-gray-800 text-white p-2 rounded'>67% with 2% error</div>`,
    },
  },
});

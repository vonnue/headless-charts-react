import preview from '../../../../.storybook/preview';

import RingGauge from '.';
import metrics from './sample.json';

const meta = preview.meta({
  title: 'Gauge/RingGauge/Customized',
  component: RingGauge,
  tags: ['autodocs'],
});

export const WithCustomStartAndEndAngle = meta.story({
  args: {
    data: metrics.map(({ className, ...metric }: any) => metric),
    id: 'ring-chart-custom-start-end-angle',
    labelKey: 'name',
    dataKey: 'score',
    targetKey: 'target',
    startAngle: 45,
    endAngle: 180,
  },
});

/** labels at bottom position */
export const WithLabelsAtBottom = meta.story({
  args: {
    ...WithCustomStartAndEndAngle.input.args,
    id: 'ring-chart-labels-bottom',
    startAngle: -90,
    endAngle: 180,
    labels: {
      position: 'bottom',
    },
  },
});

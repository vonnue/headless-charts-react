import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'RingGauge',
  aliases: ['activity rings', 'radial progress chart', 'concentric gauge', 'donut gauge'],
  category: 'gauges',
  summary:
    'Concentric arcs, one per metric, each filled to its own target — the Apple Watch activity rings pattern.',
  intents: ['progress', 'profile'],
  data: {
    form: 'records',
    encodings: [
      { prop: 'labelKey', role: 'label', required: true, description: 'Key naming each metric.' },
      { prop: 'dataKey', role: 'value', required: true, description: 'Key holding the achieved value for each metric.' },
      { prop: 'targetKey', role: 'value', required: true, description: 'Key holding each metric’s own target; the ring fills to data ÷ target.' },
      { prop: 'errorKey', role: 'value', required: false, description: 'Key holding an error or shortfall value drawn on the ring.' },
    ],
    rowCount: { min: 1, ideal: [2, 5], max: 6, note: 'One ring per row; inner rings get short quickly past ~6.' },
  },
  useWhen: [
    'Several metrics each have their own target and should read as a single glanceable unit',
    'Completion against goal is the message rather than absolute values',
    'The set of metrics is stable and small, so ring order can be learned',
  ],
  avoidWhen: [
    'Metrics share one scale and their shape should be compared — use RadarChart',
    'There is only one metric — use BulletChart or LinearGauge',
    'Absolute values must be compared across metrics — arc lengths at different radii are not comparable; use ColumnChart',
    'Metrics have no target, only a raw value — use PizzaChart',
  ],
  alternatives: [
    { name: 'BulletChart', when: 'a single metric, with qualitative bands' },
    { name: 'RadarChart', when: 'metrics share one scale and profile shape matters' },
    { name: 'PizzaChart', when: 'metrics have a shared maximum rather than individual targets' },
  ],
  requiredProps: ['id', 'data', 'labelKey', 'dataKey', 'targetKey'],
  example: `<RingGauge
  id="activity-rings"
  className="w-full h-64"
  data={metrics}
  labelKey="name"
  dataKey="score"
  targetKey="target"
/>`,
  storybook: 'Gauge/RingGauge/Intro',
  variants: [
    { kind: 'option', name: 'Per-ring colours', how: 'Put a `className` field on each row of `data`.' },
    { kind: 'option', name: 'Label placement', how: 'Set `labels={{ position: "bottom" }}`.' },
    { kind: 'option', name: 'Arc geometry', how: 'Tune `startAngle`, `endAngle`, `cornerRadius`, `minRadius` and `padding.arc`.' },
  ],
};

export default meta;

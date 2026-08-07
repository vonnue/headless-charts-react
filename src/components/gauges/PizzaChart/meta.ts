import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'PizzaChart',
  aliases: ['radial bar chart', 'polar bar chart', 'sunburst-style profile'],
  category: 'gauges',
  summary:
    'Equal-angle radial slices, one per metric, each extending from the centre in proportion to its value.',
  intents: ['profile', 'progress'],
  data: {
    form: 'records',
    encodings: [
      {
        prop: 'data',
        role: 'value',
        required: true,
        description: 'A single record — one object, not an array — holding every metric as a field.',
      },
      {
        prop: 'metrics',
        role: 'series',
        required: true,
        description: 'Array of `{ key, className, classNameBackground }`, one slice per entry, in the order given.',
      },
    ],
    seriesCount: { min: 3, ideal: [5, 10], max: 12 },
  },
  useWhen: [
    'One entity is being profiled across several metrics that share a scale',
    'The overall silhouette matters more than reading individual values',
    'Slices have a natural order, so the shape is comparable between renders',
  ],
  avoidWhen: [
    'Several entities need comparing — a pizza shows one; use RadarChart, which overlays many',
    'The metrics are parts of one whole — use PieChart, where angle encodes share',
    'Precise values matter — radius is read poorly; use ColumnChart',
    'Each metric has its own target rather than a shared max — use RingGauge',
  ],
  alternatives: [
    { name: 'RadarChart', when: 'several entities must be compared across the same metrics' },
    { name: 'RingGauge', when: 'each metric has its own target' },
    { name: 'PieChart', when: 'the values are parts of one whole' },
  ],
  requiredProps: ['id', 'data', 'metrics'],
  example: `<PizzaChart
  id="quality-profile"
  className="w-full h-64"
  data={record}
  max={100}
  metrics={[
    { key: 'metric1', className: 'fill-purple-900' },
    { key: 'metric2', className: 'fill-purple-700' },
    { key: 'metric3', className: 'fill-purple-500' },
  ]}
/>`,
  storybook: 'Gauge/PizzaChart',
  variants: [
    { kind: 'option', name: 'Scale bounds', how: 'Set `min` and `max` so slice radius is comparable across renders.' },
    { kind: 'option', name: 'Slice shaping', how: 'Set `paddingAngle` and `cornerRadius` to separate and round slices.' },
    { kind: 'option', name: 'Backdrop', how: 'Use `classNameBackground` per metric to show the unfilled remainder.' },
  ],
};

export default meta;

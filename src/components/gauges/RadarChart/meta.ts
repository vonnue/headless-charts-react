import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'RadarChart',
  aliases: ['spider chart', 'web chart', 'star chart', 'polar chart', 'kiviat diagram'],
  category: 'gauges',
  summary:
    'Plots several metrics on spokes radiating from a centre and joins them into a polygon per entity, comparing profiles by shape.',
  intents: ['profile', 'comparison'],
  data: {
    form: 'records',
    encodings: [
      { prop: 'label', role: 'label', required: true, description: '`{ key }` naming the entity each polygon represents.' },
      {
        prop: 'metrics',
        role: 'series',
        required: true,
        description: 'Array of `{ key }`, one spoke per entry. All metrics must share the `min`–`max` scale.',
      },
      { prop: 'classNameMap', role: 'color', required: false, description: 'Maps each entity label to stroke and fill classes.' },
    ],
    seriesCount: { min: 3, ideal: [5, 8], max: 12, note: 'Spokes; fewer than 5 makes a shape too crude to compare.' },
    rowCount: { min: 1, ideal: [2, 4], max: 5, note: 'Overlapping polygons; past ~5 entities they obscure each other.' },
  },
  useWhen: [
    'Five or more metrics are compared across a few entities on one shared scale, such as 0–100',
    'The profile shape is the message — which entity is strong or weak where',
    'Metrics have a natural cyclical or grouped order that makes the shape meaningful',
  ],
  avoidWhen: [
    'Metrics use different units or ranges — one shared radial scale would misrepresent them; use ColumnChart grouped',
    'More than about five entities need overlaying — the polygons become unreadable',
    'Precise values must be compared — radial position is read poorly; use BarChart',
    'Only one entity is being shown — use PizzaChart',
  ],
  alternatives: [
    { name: 'PizzaChart', when: 'profiling a single entity' },
    { name: 'ColumnChart', when: 'metrics have different units, or values must be read precisely' },
    { name: 'RingGauge', when: 'each metric has its own target rather than a shared scale' },
  ],
  requiredProps: ['id', 'data', 'label', 'metrics'],
  example: `<RadarChart
  id="team-profile"
  className="w-full h-64"
  data={data}
  label={{ key: 'name' }}
  min={0}
  max={100}
  metrics={[
    { key: 'attack' },
    { key: 'defense' },
    { key: 'midfield' },
    { key: 'goalkeeper' },
    { key: 'overall' },
  ]}
/>`,
  storybook: 'Gauge/RadarChart/Intro',
  variants: [
    { kind: 'option', name: 'Per-entity colours', how: 'Pass `classNameMap={{ Arsenal: "stroke-red-500 fill-red-500" }}`.' },
    { kind: 'option', name: 'Fixed scale', how: 'Always set `min` and `max` so shapes stay comparable across renders.' },
  ],
};

export default meta;

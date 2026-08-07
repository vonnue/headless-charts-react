import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'CometPlot',
  aliases: ['comet chart', 'change plot', 'movement plot', 'slope chart'],
  category: 'ranges',
  summary:
    'A tapered mark per category running from one value to another, where the widening head shows the direction of movement.',
  intents: ['range', 'comparison'],
  data: {
    form: 'records',
    encodings: [
      {
        prop: 'y',
        role: 'category',
        required: true,
        description: 'Key holding the category label; one comet per row.',
      },
      {
        prop: 'x',
        role: 'value',
        required: true,
        description:
          'Config naming the endpoints: `fromKey` (tail) and `toKey` (head). The taper runs from tail to head.',
      },
    ],
    rowCount: { ideal: [3, 20], max: 30 },
  },
  useWhen: [
    'A value moved between two states and the direction of that move matters',
    'Comparing before-and-after across categories, e.g. score with and without a change',
    'The magnitude of change should read at a glance from the shape rather than from a computed delta',
  ],
  avoidWhen: [
    'The two values are an unordered interval with no direction — use RangePlot',
    'The interval is a quartile summary — use BoxPlotH',
    'More than two states are involved — use LineChart with one line per category',
  ],
  alternatives: [
    { name: 'RangePlot', when: 'the interval has no direction' },
    { name: 'LineChart', when: 'more than two points in the sequence' },
    { name: 'SpineChart', when: 'contrasting two independent measures rather than a movement' },
  ],
  requiredProps: ['id', 'data', 'x', 'y'],
  example: `<CometPlot
  id="score-change"
  className="w-full h-56"
  data={data}
  y={{ key: 'name' }}
  x={{ fromKey: 'before', toKey: 'after', className: 'fill-green-800 stroke-green-800' }}
/>`,
  storybook: 'Ranges/CometPlot',
  variants: [
    { kind: 'option', name: 'Custom head', how: 'Set `shape` to diamond, triangle, square, cross, star or wye, and `size` to scale it.' },
    { kind: 'option', name: 'Tail styling', how: 'Use `x.classNameTail` to style the tail separately from the head.' },
  ],
};

export default meta;

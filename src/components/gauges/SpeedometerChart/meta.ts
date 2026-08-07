import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'SpeedometerChart',
  aliases: ['gauge chart', 'dial chart', 'speedometer', 'needle gauge'],
  category: 'gauges',
  summary: 'A dial with a needle showing one value against a scale that can be split into coloured regions.',
  intents: ['progress'],
  data: {
    form: 'scalar',
    encodings: [
      {
        prop: 'data',
        role: 'value',
        required: true,
        description:
          'The value the needle points to. The scale runs 0 to the largest `regions` limit, or 0 to 1 when no regions are given.',
      },
      { prop: 'label', role: 'label', required: false, description: '`{ text, className }` naming the metric under the dial.' },
      {
        prop: 'regions',
        role: 'color',
        required: false,
        description: 'Bands of the arc as `{ limit, className }`; the largest limit also sets the top of the scale.',
      },
    ],
  },
  useWhen: [
    'The audience expects a dial metaphor, e.g. an operational or health readout',
    'The scale divides into qualitative bands — good, warning, critical — that should be visible at a glance',
    'One value stands alone on a card and the layout has room for a wide mark',
  ],
  avoidWhen: [
    'Space is tight or several gauges will be stacked — use LinearGauge or BulletChart, which pack far denser',
    'Precise reading matters — needle angle is read less accurately than a bar length',
    'Several metrics need comparing — use RingGauge or RadarChart',
    'The trend over time is the real question — use LineChart',
  ],
  alternatives: [
    { name: 'BulletChart', when: 'the same information is needed in a fraction of the space' },
    { name: 'LinearGauge', when: 'a plain value on a scale, no bands' },
    { name: 'RingGauge', when: 'several metrics each against their own target' },
  ],
  requiredProps: ['id', 'data'],
  example: `<SpeedometerChart
  id="coverage"
  className="w-full h-48"
  data={0.7}
  label={{ text: 'Coverage' }}
/>`,
  storybook: 'Gauge/Speedometer/Intro',
  variants: [
    {
      kind: 'option',
      name: 'Coloured regions',
      how: 'Pass `regions={[{ limit: 50, className: "fill-red-500" }, { limit: 100, className: "fill-green-500" }]}`; the largest limit becomes the scale maximum.',
    },
    { kind: 'option', name: 'Axis ticks', how: 'Set `axisTicks={10}` to print values around the arc.' },
    { kind: 'option', name: 'Needle length', how: 'Set `needleRadius` to change how far the needle reaches.' },
  ],
};

export default meta;

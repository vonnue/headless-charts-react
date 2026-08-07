import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'LinearGauge',
  aliases: ['progress bar chart', 'linear progress gauge', 'meter'],
  category: 'gauges',
  summary: 'A single value drawn as a filled bar on a linear scale, with an optional error band.',
  intents: ['progress'],
  data: {
    form: 'scalar',
    encodings: [
      {
        prop: 'data',
        role: 'value',
        required: true,
        description: 'The value to display. The scale runs 0 to `max`, which defaults to 1 — so pass a fraction unless `max` is set.',
      },
      { prop: 'label', role: 'label', required: true, description: 'Text naming the metric; also accepts a D3 value function.' },
      { prop: 'max', role: 'value', required: false, description: 'Top of the scale. Defaults to 1.' },
      { prop: 'error', role: 'value', required: false, description: '`{ data, className }` drawing an error or shortfall band at the top of the scale.' },
    ],
  },
  useWhen: [
    'A single value needs showing as a share of a total, with no target to compare against',
    'The gauge must fit in a table cell, list row or card — it is the most compact chart here',
    'An error or shortfall portion should be visible alongside the value',
  ],
  avoidWhen: [
    'There is a target, threshold or qualitative band to compare against — use BulletChart, which encodes all of them',
    'Several related metrics should read as one unit — use RingGauge',
    'History or trend matters — use LineChart',
  ],
  alternatives: [
    { name: 'BulletChart', when: 'there is a target and threshold to show' },
    { name: 'RingGauge', when: 'several metrics each with their own target' },
    { name: 'SpeedometerChart', when: 'a dial metaphor with coloured regions suits better' },
  ],
  requiredProps: ['id', 'data', 'label'],
  example: `<LinearGauge
  id="disk-usage"
  className="h-12"
  label="Disk usage"
  data={0.47}
/>`,
  storybook: 'Gauge/LinearGauge/Intro',
  variants: [
    { kind: 'option', name: 'Absolute scale', how: 'Set `max={100}` and pass the raw value instead of a fraction.' },
    { kind: 'option', name: 'Error band', how: 'Pass `error={{ data: 0.1, className: "fill-red-500" }}`.' },
    { kind: 'option', name: 'Styling', how: 'Use `classNameGauge` for the fill and `classNameGaugeBg` for the track.' },
  ],
};

export default meta;

import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'BulletChart',
  aliases: ['bullet graph', 'kpi bar', 'target vs actual chart'],
  category: 'gauges',
  summary:
    'A compact linear gauge showing one measure against a base, a target, a threshold and a maximum.',
  intents: ['progress'],
  data: {
    form: 'scalar',
    encodings: [
      { prop: 'data', role: 'value', required: true, description: 'The single measured value.' },
      { prop: 'base', role: 'value', required: true, description: 'Lower qualitative band, e.g. last period’s result.' },
      { prop: 'target', role: 'value', required: true, description: 'The goal, drawn as a marker.' },
      { prop: 'threshold', role: 'value', required: true, description: 'The point past which performance counts as good.' },
      { prop: 'max', role: 'value', required: true, description: 'Top of the scale.' },
      { prop: 'label', role: 'label', required: false, description: 'Text naming the metric.' },
    ],
  },
  useWhen: [
    'One KPI needs showing against a goal plus qualitative bands, in little vertical space',
    'Several KPIs will be stacked in a dashboard column and must align on a common layout',
    'A speedometer would waste space for the same information',
  ],
  avoidWhen: [
    'There is no target or threshold to compare against — use LinearGauge',
    'Several metrics each have their own target and should read as one unit — use RingGauge',
    'The value changes over time and the history matters — use LineChart',
    'The data is an array of records rather than a single number — gauges take one value',
  ],
  alternatives: [
    { name: 'LinearGauge', when: 'there is no target or threshold, just a value on a scale' },
    { name: 'RingGauge', when: 'several metrics each against their own target' },
    { name: 'SpeedometerChart', when: 'a dial metaphor suits the audience better' },
  ],
  requiredProps: ['id', 'data', 'base', 'target', 'threshold', 'max'],
  example: `<BulletChart
  id="sales-vs-target"
  className="w-full h-24"
  data={85}
  label="Sales"
  min={0}
  base={50}
  target={80}
  threshold={90}
  max={100}
/>`,
  storybook: 'Gauge/BulletChart/Intro',
  variants: [
    {
      kind: 'option',
      name: 'Styled bands',
      how: 'Style each element with `classNameData`, `classNameTarget`, `classNameThreshold`, `classNameBase` and `classNameMax`.',
    },
    { kind: 'option', name: 'Live updates', how: 'Change `data` on an interval; the bar animates when `drawing.duration` is set.' },
  ],
};

export default meta;

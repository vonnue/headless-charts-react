import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'FunnelChart',
  aliases: ['funnel', 'funnel chart', 'conversion funnel'],
  category: 'flow',
  summary:
    'Ordered stages drawn as centred bars or connected trapezoids whose length encodes each stage value, so drop-off between stages is the story.',
  intents: ['composition', 'comparison'],
  data: {
    form: 'records',
    encodings: [
      {
        prop: 'stage',
        role: 'category',
        required: true,
        description:
          'Key holding the stage label. Array order is stage order; the chart does not sort.',
      },
      {
        prop: 'value',
        role: 'quantitative',
        required: true,
        description:
          'Key holding the stage count; mark length grows from 0. `value.end` pins the upper domain.',
      },
      {
        prop: 'classNameMap',
        role: 'color',
        required: false,
        description:
          'Optional class per stage label. Colour names the stage; it must not encode magnitude.',
      },
    ],
    rowCount: {
      min: 1,
      ideal: [3, 8],
      max: 12,
      note: 'Past ~12 stages the bands get thin and labels collide.',
    },
  },
  useWhen: [
    'Counts move through ordered stages and the drop-off between stages is the message, e.g. visit → signup → paid',
    'Each stage should be read against the first stage or the previous one — set `labels.percent`',
  ],
  avoidWhen: [
    'The parts are an unordered split of one whole — use PieChart',
    'It is a ranked snapshot with no drop-off story — use BarChart',
    'The steps are additive bridge steps to a total — use ColumnChartStacked with `waterfall`',
  ],
  alternatives: [
    { name: 'BarChart', when: 'a ranked snapshot with no stage-to-stage drop-off' },
    { name: 'ColumnChartStacked', when: 'additive steps to a total (waterfall)' },
    { name: 'PieChart', when: 'an unordered part-to-whole split' },
  ],
  requiredProps: ['id', 'data', 'stage', 'value'],
  example: `<FunnelChart
  id="signup"
  className="w-full h-80"
  data={stages}
  stage={{ key: 'name' }}
  value={{ key: 'count', className: 'fill-slate-400' }}
  labels={{ stage: true, value: true, percent: 'ofFirst' }}
/>`,
  storybook: 'Flow/FunnelChart/Intro',
  variants: [
    { kind: 'option', name: 'Trapezoid', how: 'Set `shape="trapezoid"` to connect stages; the last stage tapers to a point.' },
    { kind: 'option', name: 'Horizontal', how: 'Set `orientation="horizontal"` to run stages left → right.' },
    {
      kind: 'option',
      name: 'Percent labels',
      how: 'Set `labels.percent` to `"ofFirst"`, `"ofPrevious"` or `"both"`; a zero or missing divisor prints `n/a`.',
    },
  ],
};

export default meta;

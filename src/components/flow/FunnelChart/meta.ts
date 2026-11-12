import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'FunnelChart',
  aliases: ['funnel', 'funnel chart', 'conversion funnel'],
  category: 'flow',
  summary:
    'Ordered conversion stages drawn as centred bars or connected trapezoids whose length encodes each stage value, so drop-off along the path is the story.',
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
          'Key holding the stage count; mark length grows from 0. `value.end` pins the upper domain; a finite `value.start` is ignored.',
      },
      {
        prop: 'classNameMap',
        role: 'color',
        required: false,
        description:
          'Optional class per stage label (overrides `value.className`). Colour names the stage; it must not encode magnitude — length does that.',
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
    'Counts move through a fixed ordered path and the drop-off between stages is the message, e.g. visit → signup → paid',
    'Each stage should be read as a share of the first stage or of the previous one — set `labels.percent` to `"ofFirst"`, `"ofPrevious"` or `"both"`',
    'Stages should stay in the given order rather than being sorted by value',
  ],
  avoidWhen: [
    'The parts are an unordered split of one whole — use PieChart',
    'It is a ranked snapshot with no stage-to-stage drop-off story — use BarChart',
    'The steps are additive bridge steps to a total — use ColumnChartStacked with `waterfall`',
    'Colour is used to encode magnitude (darker = larger) — length already encodes value; keep `classNameMap` / `value.className` as stage identity only',
    'The flow is volume between arbitrary nodes rather than one ordered path — Network only shows topology; a Sankey fits once available',
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
  data={data}
  stage={{ key: 'name' }}
  value={{ key: 'count', className: 'fill-slate-400' }}
  classNameMap={{ Visit: 'fill-slate-500', Signup: 'fill-slate-400', Paid: 'fill-slate-300' }}
  shape="trapezoid"
  labels={{ stage: true, value: true, percent: 'ofFirst' }}
  title="Signup conversion"
/>`,
  storybook: 'Flow/FunnelChart/Intro',
  variants: [
    {
      kind: 'option',
      name: 'Trapezoid',
      how: 'Set `shape="trapezoid"` to connect stages; the last stage tapers to a point.',
    },
    {
      kind: 'option',
      name: 'Horizontal',
      how: 'Set `orientation="horizontal"` to run stages left → right.',
    },
    {
      kind: 'option',
      name: 'Percent of first',
      how: 'Set `labels.percent: "ofFirst"` (or `{ of: "first" }`); a zero or missing first stage prints `n/a`.',
    },
    {
      kind: 'option',
      name: 'Percent of previous',
      how: 'Set `labels.percent: "ofPrevious"` (or `{ of: "previous" }` / `"both"`); the first stage prints `n/a`.',
    },
  ],
};

export default meta;

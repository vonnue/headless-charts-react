import { ChartMeta } from '@/catalog/types';

// Placeholder wording — Chart Catalog Editor refines.
const meta: ChartMeta = {
  name: 'ViolinChart',
  aliases: ['violin', 'violin plot', 'violin chart'],
  category: 'ranges',
  summary:
    "A mirrored kernel density per group, with an optional inner box and points, showing the full shape of a measure's distribution across categories.",
  intents: ['distribution', 'comparison'],
  data: {
    form: 'records',
    encodings: [
      {
        prop: 'category',
        role: 'category',
        required: true,
        description: 'Grouping key; one violin per distinct value, in first-appearance order (or `category.order`).',
      },
      {
        prop: 'value',
        role: 'quantitative',
        required: true,
        description: 'Raw sample key, one row per observation. Non-finite values are excluded.',
      },
      {
        prop: 'classNameMap',
        role: 'color',
        required: false,
        description: 'Optional class per group. Colour names the group; density is width only.',
      },
    ],
    rowCount: { ideal: [2, 8], max: 20, note: 'Groups. Each group needs roughly 20+ samples for a meaningful density.' },
  },
  useWhen: [
    'The shape of a distribution (multimodality, skew) matters across groups',
    'Each group has enough samples (about 20 or more) for a density',
  ],
  avoidWhen: [
    'Only the median and quartiles matter, or the audience will not read densities — use BoxPlotV or BoxPlotH',
    'Groups have very few samples — use ScatterPlot (or turn on `points`)',
    "Only one group's distribution is shown — use ColumnChart with `x.bin`",
    'Colour would encode magnitude — colour names the group; density is width only',
  ],
  alternatives: [
    { name: 'BoxPlotV', when: 'only the five-number summary matters' },
    { name: 'BoxPlotH', when: 'the five-number summary with long category labels' },
    { name: 'ColumnChart', when: "one group's distribution as a histogram" },
    { name: 'ScatterPlot', when: 'very small samples per group' },
  ],
  requiredProps: ['id', 'data', 'category', 'value'],
  example: `<ViolinChart
  id="salaries"
  className="w-full h-80"
  data={rows}
  category={{ key: 'dept' }}
  value={{ key: 'salary', className: 'fill-slate-300 stroke-slate-500' }}
/>`,
  storybook: 'Ranges/ViolinChart/Intro',
  variants: [
    {
      kind: 'chart-type',
      name: 'Raincloud plot',
      aliases: ['raincloud chart', 'half violin'],
      summary: 'A half violin with the raw samples jittered on the empty side, showing density and every observation together.',
      how: "Set `side: 'start'` and `points: true`.",
      useWhen: [
        'Readers should see both the density and the individual samples',
        'Sample sizes are modest, so the points do not overplot',
      ],
      avoidWhen: ['Samples number in the thousands — the points overplot; use a plain violin'],
      example: `<ViolinChart
  id="raincloud"
  className="w-full h-80"
  data={rows}
  category={{ key: 'dept' }}
  value={{ key: 'salary', className: 'fill-slate-300' }}
  side="start"
  points
/>`,
    },
    { kind: 'option', name: 'Horizontal', how: 'Set `orientation="horizontal"` to run groups top → bottom.' },
    { kind: 'option', name: 'Count scaling', how: "Set `density={{ scale: 'count' }}` so violin area is proportional to sample count." },
    { kind: 'option', name: 'Tails', how: "Set `density={{ extent: 'tails' }}` to extend each violin 3 bandwidths past its data." },
    { kind: 'option', name: 'Quartile lines', how: "Set `inner=\"quartiles\"` for dashed Q1/Q3 and a solid median line." },
    { kind: 'option', name: 'Points', how: 'Set `points` (or `{ radius, jitter, className }`) to overlay the raw samples.' },
  ],
};

export default meta;

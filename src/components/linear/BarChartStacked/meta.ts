import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'BarChartStacked',
  aliases: ['stacked bar chart', 'horizontal stacked bar chart'],
  category: 'linear',
  summary:
    'Horizontal bars where measures stack end to end, showing the total per category and its breakdown.',
  intents: ['composition', 'comparison'],
  data: {
    form: 'records',
    encodings: [
      {
        prop: 'y',
        role: 'category',
        required: true,
        description: 'Single key holding the category label for each row.',
      },
      {
        prop: 'x',
        role: 'series',
        required: true,
        description: 'Array of numeric keys, stacked left to right in the order given.',
      },
    ],
    seriesCount: { min: 2, ideal: [2, 6], max: 8 },
    rowCount: { ideal: [2, 25], max: 40 },
  },
  useWhen: [
    'Composition needs comparing across categories whose labels are long',
    'Both the total and the proportions within each bar matter',
    'Showing a waterfall of running gains and losses — set `waterfall`',
  ],
  avoidWhen: [
    'Segments need precise comparison across categories — only the first segment shares a baseline; use BarChart grouped',
    'Labels are short and few — ColumnChartStacked reads more conventionally',
    'There is one category only — use PieChart',
  ],
  alternatives: [
    { name: 'BarChart', when: 'segments must be compared precisely rather than summed' },
    { name: 'ColumnChartStacked', when: 'short labels and few categories' },
    { name: 'PieChart', when: 'a single whole at one point in time' },
  ],
  requiredProps: ['id', 'data', 'x', 'y'],
  example: `<BarChartStacked
  id="revenue-by-region"
  className="w-full h-64"
  data={data}
  y={{ key: 'year' }}
  x={[
    { key: 'macbook', className: 'fill-purple-800' },
    { key: 'iphone', className: 'fill-purple-600' },
  ]}
/>`,
  storybook: 'Linear/BarChartStacked/Intro',
  variants: [
    {
      kind: 'chart-type',
      name: 'Horizontal waterfall chart',
      aliases: ['horizontal bridge chart', 'horizontal cascade chart'],
      summary:
        'Floating horizontal bars where each segment continues from the previous total, showing how a figure is built up step by step.',
      how: 'Set `waterfall` on a BarChartStacked. Each `x` series becomes a step rather than a segment stacked from the baseline.',
      useWhen: [
        'Explaining a running total through successive gains and losses, where step labels are long',
        'The sequence reads better vertically down the page than across it',
      ],
      avoidWhen: [
        'The series are independent categories with no running total — use a plain BarChart',
        'Labels are short, in which case ColumnChartStacked in waterfall mode is the conventional read',
      ],
      example: `<BarChartStacked
  id="profit-walk"
  className="w-full h-64"
  data={data}
  waterfall
  y={{ key: 'year' }}
  x={[
    { key: 'macbook', className: 'fill-green-600' },
    { key: 'iphone', className: 'fill-red-500' },
  ]}
/>`,
    },
    { kind: 'option', name: 'Reference lines', how: 'Pass `referenceLines` to mark targets across the value axis.' },
    { kind: 'option', name: 'Data labels', how: 'Pass `dataLabel` to print segment values inside the bars.' },
  ],
};

export default meta;

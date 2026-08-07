import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'ColumnChartStacked',
  aliases: ['stacked column chart', 'stacked bar chart (vertical)'],
  category: 'linear',
  summary:
    'Vertical bars where each measure stacks on the previous one, showing both the total per category and its composition.',
  intents: ['composition', 'comparison'],
  data: {
    form: 'records',
    encodings: [
      {
        prop: 'x',
        role: 'category',
        required: true,
        description: 'Single key holding the category label for each row.',
      },
      {
        prop: 'y',
        role: 'series',
        required: true,
        description: 'Array of numeric keys, stacked bottom-up in the order given.',
      },
    ],
    seriesCount: { min: 2, ideal: [2, 6], max: 8 },
    rowCount: { ideal: [2, 12], max: 20 },
  },
  useWhen: [
    'The total per category matters as much as its breakdown',
    'Segments are genuinely parts of one whole, not independent measures',
    'Showing a waterfall of running gains and losses — set `waterfall`',
  ],
  avoidWhen: [
    'Individual segments need precise comparison across categories — only the bottom segment shares a baseline; use ColumnChart grouped',
    'Category labels are long or numerous — use BarChartStacked',
    'There is one category only — use PieChart',
    'The axis is continuous time — use AreaChart, which reads as a flow rather than discrete totals',
  ],
  alternatives: [
    { name: 'ColumnChart', when: 'segments must be compared precisely across categories' },
    { name: 'BarChartStacked', when: 'long category labels' },
    { name: 'AreaChart', when: 'the axis is continuous time' },
    { name: 'PieChart', when: 'a single whole at one point in time' },
  ],
  requiredProps: ['id', 'data', 'x', 'y'],
  example: `<ColumnChartStacked
  id="revenue-split"
  className="w-full h-64"
  data={data}
  x={{ key: 'year' }}
  y={[
    { key: 'macbook', className: 'fill-purple-800' },
    { key: 'iphone', className: 'fill-purple-600' },
    { key: 'ipad', className: 'fill-purple-400' },
  ]}
/>`,
  storybook: 'Linear/ColumnChartStacked',
  variants: [
    {
      kind: 'chart-type',
      name: 'Waterfall chart',
      aliases: ['waterfall', 'bridge chart', 'cascade chart', 'flying bricks chart'],
      summary:
        'Floating columns where each segment starts where the previous one ended, showing how a running total is built up from successive gains and losses.',
      how: 'Set `waterfall` on a ColumnChartStacked. Each `y` series becomes a step in the sequence rather than a segment stacked from the baseline.',
      useWhen: [
        'Explaining how a starting figure becomes an ending figure through a sequence of contributions',
        'Each step is a gain or a loss against a running total, e.g. revenue bridge or profit walk',
        'The order of the steps carries meaning and should be read left to right',
      ],
      avoidWhen: [
        'The series are independent categories with no running total — use a plain grouped ColumnChart',
        'The order of steps is arbitrary, which makes the bridge metaphor meaningless',
        'Category labels are long — use BarChartStacked in waterfall mode instead',
      ],
      example: `<ColumnChartStacked
  id="revenue-bridge"
  className="w-full h-64"
  data={data}
  waterfall
  x={{ key: 'year' }}
  y={[
    { key: 'macbook', className: 'fill-green-600' },
    { key: 'iphone', className: 'fill-green-500' },
    { key: 'ipad', className: 'fill-red-500' },
  ]}
/>`,
    },
    {
      kind: 'option',
      name: 'Reference lines',
      how: 'Pass `referenceLines={[{ y: 100, className: "stroke-red-500" }]}`.',
    },
  ],
};

export default meta;

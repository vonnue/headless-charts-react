import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'BarChart',
  aliases: ['horizontal bar chart', 'grouped bar chart', 'ranked bar chart'],
  category: 'linear',
  summary:
    'Horizontal bars comparing one or more measures across categories, with room for long category labels.',
  intents: ['comparison', 'distribution', 'ranking'],
  data: {
    form: 'records',
    encodings: [
      {
        prop: 'y',
        role: 'category',
        required: true,
        description: 'Single key holding the category label for each row; becomes the vertical axis.',
      },
      {
        prop: 'x',
        role: 'series',
        required: true,
        description:
          'Array of numeric keys; one bar per key per category. Each entry also takes `rx` for rounded ends.',
      },
    ],
    seriesCount: { min: 1, ideal: [1, 4], max: 6 },
    rowCount: { ideal: [2, 25], max: 40, note: 'Past ~40 rows the chart needs scrolling — bin the values instead.' },
  },
  useWhen: [
    'Category labels are long enough that vertical bars would truncate or rotate them',
    'There are more categories than vertical bars can hold (roughly 12 or more)',
    'Presenting a ranked list, sorted by value',
    'Showing a histogram horizontally — set `bin` on the first `x` entry and bar lengths become counts',
    'Bars should grow leftward from the right edge — set `direction: "left"`',
  ],
  avoidWhen: [
    'The x axis is time — a horizontal bar per period breaks the reading order; use LineChart or ColumnChart',
    'Measures are parts of a whole — use BarChartStacked so the total is readable',
    'Labels are short and there are few categories — ColumnChart is the more conventional read',
    'Two measures should read outward from a shared centre — use SpineChart',
  ],
  alternatives: [
    { name: 'ColumnChart', when: 'few categories with short labels' },
    { name: 'BarChartStacked', when: 'measures are parts of a whole' },
    { name: 'LollipopHChart', when: 'bars look heavy and the value point is the focus' },
    { name: 'SpineChart', when: 'two opposing measures per category' },
  ],
  requiredProps: ['id', 'data', 'x', 'y'],
  example: `<BarChart
  id="sales-by-region"
  className="w-full h-64"
  data={data}
  y={{ key: 'region' }}
  x={[{ key: 'revenue', className: 'fill-blue-500' }]}
/>`,
  storybook: 'Linear/BarChart/Intro',
  variants: [
    {
      kind: 'chart-type',
      name: 'Horizontal histogram',
      aliases: ['binned bar chart', 'horizontal frequency distribution'],
      summary:
        'Bins raw continuous values and draws the count per bin as horizontal bars, with bin ranges as labels down the y axis.',
      how: 'Set `bin` on the first `x` entry: `x={[{ key: "score", bin: { count: 8 } }]}`. Bin labels move to the y axis automatically.',
      useWhen: [
        'A distribution has many bins, which fit better stacked vertically than squeezed across',
        'Bin range labels are long, e.g. "10,000–20,000"',
      ],
      avoidWhen: [
        'The conventional histogram orientation is expected — use ColumnChart with `x.bin`',
        'The x values are already categorical rather than continuous',
      ],
      example: `<BarChart
  id="score-histogram"
  className="w-full h-64"
  data={rawRows}
  x={[{ key: 'score', bin: { count: 8 }, className: 'fill-blue-500' }]}
  y={{ key: 'count' }}
/>`,
    },
    {
      kind: 'chart-type',
      name: 'Diverging bar chart',
      aliases: ['tornado chart', 'bidirectional bar chart', 'deviation chart'],
      summary:
        'Bars growing left and right of a zero baseline, with negative values styled separately to show direction of change.',
      how: 'Supply negative values in the data, set `start`/`end` on the series to pin a symmetric axis, and style with `className` plus `classNameNegative`.',
      useWhen: [
        'Values are changes against a baseline and the sign is the message, e.g. year-on-year delta',
        'Gains and losses should be distinguishable at a glance by colour and direction',
      ],
      avoidWhen: [
        'All values share a sign — nothing diverges, so use a plain BarChart',
        'The two directions are separate measures rather than one signed measure — use SpineChart',
      ],
      example: `<BarChart
  id="yoy-change"
  className="w-full h-64"
  data={data}
  x={[{
    key: 'delta',
    className: 'text-green-500',
    classNameNegative: 'text-red-500',
    start: -10,
    end: 10,
    axis: { location: 'top' },
  }]}
  y={{ key: 'year', padding: 10 }}
/>`,
    },
    { kind: 'option', name: 'Data labels', how: 'Pass `dataLabel={{ className: "fill-white text-xs" }}` to print values on the bars.' },
    { kind: 'option', name: 'Right-to-left', how: 'Set `direction="left"` to anchor bars at the right edge.' },
  ],
};

export default meta;

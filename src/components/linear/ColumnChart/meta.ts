import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'ColumnChart',
  aliases: ['vertical bar chart', 'grouped column chart', 'clustered column chart'],
  category: 'linear',
  summary:
    'Vertical bars comparing one or more measures across categories; grouped side by side when several measures are passed.',
  intents: ['comparison', 'distribution'],
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
        description:
          'Array of numeric keys; one bar per key per category, drawn as a group.',
      },
    ],
    seriesCount: { min: 1, ideal: [1, 4], max: 6, note: 'Groups wider than ~4 bars get hard to scan.' },
    rowCount: { ideal: [2, 12], max: 20, note: 'Past ~20 categories the labels collide — switch to BarChart.' },
  },
  useWhen: [
    'Comparing a numeric measure across a modest number of categories with short labels',
    'Several measures need comparing within each category, side by side',
    'The categories are periods (years, quarters) and individual values matter more than the trend line',
    'Showing a histogram of raw continuous values — set `x.bin` and pass `y={[{ key: "count" }]}`',
  ],
  avoidWhen: [
    'Category labels are long or there are more than ~20 categories — use BarChart, where horizontal bars give labels room',
    'The measures are parts of one whole — use ColumnChartStacked so the total is readable',
    'The x axis is continuous time with many points — use LineChart',
    'The bars would be nearly equal in height, making differences invisible — use LollipopVChart or a dot-based chart',
  ],
  alternatives: [
    { name: 'BarChart', when: 'long labels or many categories' },
    { name: 'ColumnChartStacked', when: 'measures are parts of a whole' },
    { name: 'LollipopVChart', when: 'bars look heavy and values are the focus' },
    { name: 'LineChart', when: 'the axis is continuous time with many points' },
  ],
  requiredProps: ['id', 'data', 'x', 'y'],
  example: `<ColumnChart
  id="sales-by-year"
  className="w-full h-64"
  data={data}
  x={{ key: 'year' }}
  y={[
    { key: 'macbook', className: 'fill-purple-800' },
    { key: 'iphone', className: 'fill-purple-600' },
  ]}
/>`,
  storybook: 'Linear/ColumnChartGrouped',
  variants: [
    {
      kind: 'chart-type',
      name: 'Histogram',
      aliases: ['frequency distribution', 'binned column chart', 'frequency chart'],
      summary:
        'Bins raw continuous values into ranges and plots how many records fall into each, showing the shape of a distribution.',
      how: 'Set `x={{ key: "score", bin: { count: 8 } }}` and `y={[{ key: "count" }]}`. Pass the raw rows as `data` — binning and counting happen internally. Use `bin.thresholds` for explicit edges.',
      useWhen: [
        'The data is raw measurements and the question is how they are spread, not what each one is',
        'Skew, spread, gaps or multiple peaks need to be visible',
        'Bin width should be tuned to reveal structure — adjust `bin.count`',
      ],
      avoidWhen: [
        'The x values are already categories — a histogram bins continuous data; use a plain ColumnChart',
        'Groups need comparing by their summary statistics rather than their full shape — use BoxPlotV',
        'There are too few records for bin heights to mean anything',
      ],
      example: `<ColumnChart
  id="score-histogram"
  className="w-full h-64"
  data={rawRows}
  x={{ key: 'score', bin: { count: 8 }, axis: { label: 'Score' } }}
  y={[{ key: 'count', className: 'text-blue-500' }]}
/>`,
    },
    { kind: 'option', name: 'Reference lines', how: 'Pass `referenceLines={[{ y: 50, className: "stroke-red-500" }]}`.' },
    { kind: 'option', name: 'Whole numbers', how: 'Set `wholeNumbers` to force integer ticks on the value axis.' },
    {
      kind: 'chart-type',
      name: 'Time-scaled column chart',
      aliases: ['time series column chart'],
      summary:
        'A grouped column chart whose x axis parses real dates and spaces bars proportionally to elapsed time, rather than treating each category as an equal-width slot.',
      how: 'Set `x.scalingFunction: "time"` with `x.time.format`, or `x.time.isISO` for ISO strings. Bar width comes from the median gap between dates (one slot per step); `x.time.barWidth` (positive pixels) overrides it but is capped at one slot, so it can narrow bars but never widen them past their slot. Set `x.time.utc: true` when dates are UTC instants or calendar days — otherwise they are parsed, placed and labelled in the viewer\'s local time zone.',
      useWhen: [
        'The x values are real dates and spacing between bars should be proportional to elapsed time, not category index',
        'Some periods are missing and the gap should read as whitespace rather than being silently collapsed',
        'Axis ticks should fall on real date boundaries',
      ],
      avoidWhen: [
        'Cadence is highly irregular (e.g. mixed daily and monthly points) — width comes from the median gap, so dates closer together than that get overlapping bars; set a smaller `x.time.barWidth` (capped at one slot, so it can only narrow bars) or use LineChart instead',
        'The categories are ordinal labels rather than true dates, e.g. "Q1"/"Q2" — use a plain ColumnChart',
      ],
      example: `<ColumnChart
  id="daily-signups"
  className="w-full h-64"
  data={data}
  x={{ key: 'date', scalingFunction: 'time', time: { isISO: true, utc: true } }}
  y={[{ key: 'signups', className: 'fill-purple-600' }]}
/>`,
    },
  ],
};

export default meta;

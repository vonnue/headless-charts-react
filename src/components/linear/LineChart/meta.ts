import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'LineChart',
  aliases: ['line graph', 'multi-line chart', 'trend line chart'],
  category: 'linear',
  summary:
    'Plots one or more numeric series against a shared ordered or time axis to show how values move.',
  intents: ['trend', 'ranking'],
  data: {
    form: 'records',
    encodings: [
      {
        prop: 'x',
        role: 'temporal',
        required: true,
        description:
          'Single key for the shared axis. Set `scalingFunction: "time"` with `time.format` for dates; otherwise treated as linear.',
      },
      {
        prop: 'y',
        role: 'series',
        required: true,
        description:
          'Array of series configs, one per line. Each takes `className`, `curve`, `symbol` and an optional `axis.location: "right"` for a second scale.',
      },
    ],
    seriesCount: { min: 1, ideal: [1, 5], max: 8, note: 'Beyond ~8 lines the chart becomes a hairball; facet instead.' },
    rowCount: { min: 2, ideal: [5, 200], max: 1000 },
  },
  useWhen: [
    'The x axis is time or another continuous ordered dimension and the shape of the movement is the point',
    'Several series must be compared against each other over the same axis',
    'Two measures on different scales need separate left and right axes (set `axis.location: "right"` on the second series)',
    'Gaps in the data should break the line — missing keys are skipped rather than zeroed',
  ],
  avoidWhen: [
    'The x axis is categorical with no inherent order — use ColumnChart or BarChart, since a line implies continuity that is not there',
    'The split of a total matters as much as the trend — use AreaChart',
    'There are only two or three points per series — use ColumnChart, where individual values are easier to read',
    'The data is discrete events or durations rather than a measured value — use TimeLineChart',
  ],
  alternatives: [
    { name: 'AreaChart', when: 'volume under the curve or composition of a total matters' },
    { name: 'ColumnChart', when: 'few discrete periods, individual values matter more than the trend' },
    { name: 'TimeLineChart', when: 'plotting events and durations rather than a continuous measure' },
    { name: 'ScatterPlot', when: 'the x axis is a measure rather than time, and points should not be joined' },
  ],
  requiredProps: ['id', 'data', 'x', 'y'],
  example: `<LineChart
  id="revenue-trend"
  className="w-full h-64"
  data={data}
  x={{ key: 'month' }}
  y={[
    { key: 'revenue', className: 'text-blue-500' },
    { key: 'forecast', className: 'text-gray-400', curve: 'step' },
  ]}
/>`,
  storybook: 'Linear/LineChart/Intro',
  variants: [
    {
      kind: 'chart-type',
      name: 'Bump chart',
      aliases: ['rank chart', 'ranking chart', 'bump plot', 'rank over time'],
      summary:
        'Plots rank rather than value over time, so lines cross when entities overtake one another.',
      how: 'Convert values to ranks with `utils.convertToRanks(data, y, x)` — it takes the same `y` array and `x` object you pass to the chart — then set `curve: "bumpX"` and `label: { show: true }` on each series, and `reverse` so rank 1 sits at the top.',
      useWhen: [
        'Changes in ordering are the story, not the size of the underlying values',
        'Entities are closely bunched, so a value chart would be an unreadable tangle',
        'Overtaking events should be visible as line crossings',
      ],
      avoidWhen: [
        'The size of the gap between entities matters — ranking discards magnitude entirely; use a plain LineChart',
        'There are too many entities for the crossings to be followable',
      ],
      example: `import { utils } from '@headless-charts/react';

const x = { key: 'year' };
const y = [
  { key: 'macbook', curve: 'bumpX', label: { show: true } },
  { key: 'iphone', curve: 'bumpX', label: { show: true } },
];

<LineChart
  id="rank-over-time"
  className="w-full h-64"
  data={utils.convertToRanks(data, y, x)}
  x={x}
  y={y}
  reverse
  yLeftLabel="rank"
/>`,
    },
    {
      kind: 'chart-type',
      name: 'Step chart',
      aliases: ['step line chart', 'staircase chart'],
      summary:
        'Joins points with horizontal and vertical segments rather than diagonals, showing a value that holds constant then jumps.',
      how: 'Set `curve: "step"` on each series.',
      useWhen: [
        'The value genuinely holds constant between readings, e.g. a price or a rate that changes at discrete moments',
        'Interpolating between points would imply change that did not happen',
      ],
      avoidWhen: [
        'The underlying quantity varies continuously — a step then misrepresents it; use the default line',
      ],
      example: `<LineChart
  id="rate-changes"
  className="w-full h-64"
  data={data}
  x={{ key: 'date' }}
  y={[{ key: 'rate', curve: 'step', className: 'text-blue-500' }]}
/>`,
    },
    {
      kind: 'chart-type',
      name: 'Dual-axis line chart',
      aliases: ['two axis chart', 'secondary axis chart', 'combo chart'],
      summary:
        'Plots two series against independent left and right scales so measures in different units can share one plot.',
      how: 'Give the second series `axis: { location: "right" }` and widen `margin.right`. Label the scales with `yLeftLabel` and `yRightLabel`.',
      useWhen: [
        'Two related measures use different units or magnitudes, e.g. revenue and conversion rate',
        'The correlation in shape between the two is the point',
      ],
      avoidWhen: [
        'The two scales could be made comparable — independent axes let any two series be made to look correlated by choosing scales',
        'More than two measures are involved; a third scale is unreadable',
      ],
      example: `<LineChart
  id="revenue-vs-rate"
  className="w-full h-64"
  data={data}
  margin={{ right: 40 }}
  yLeftLabel="Revenue"
  yRightLabel="Conversion"
  x={{ key: 'month' }}
  y={[
    { key: 'revenue', className: 'text-green-500' },
    { key: 'conversion', className: 'text-blue-500', axis: { location: 'right' } },
  ]}
/>`,
    },
    {
      kind: 'chart-type',
      name: 'Time-scaled line chart',
      aliases: ['time series chart', 'time series line chart'],
      summary: 'A line chart whose x axis parses real dates rather than treating the key as a plain number.',
      how: 'Set `x.scalingFunction: "time"` and `x.time.format` (or `x.time.isISO`) to parse date strings.',
      useWhen: [
        'The x values are dates and the gaps between them are uneven',
        'Ticks should land on real date boundaries rather than arbitrary numbers',
      ],
      example: `<LineChart
  id="daily-signups"
  className="w-full h-64"
  data={data}
  x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
  y={[{ key: 'signups', className: 'text-blue-500' }]}
/>`,
    },
    {
      kind: 'option',
      name: 'Curved lines',
      how: 'Set `curve: "rounded"` for Catmull-Rom smoothing, or `"line"` for plain straight segments.',
    },
    {
      kind: 'option',
      name: 'Reference lines',
      how: 'Pass `referenceLines={[{ yLeft: 100, className: "stroke-red-500" }]}`.',
    },
  ],
};

export default meta;

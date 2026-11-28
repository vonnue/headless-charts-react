import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'SparklineChart',
  aliases: [
    'sparkline',
    'sparklines',
    'sparkline chart',
    'tufte sparkline',
    'word-sized line chart',
  ],
  category: 'linear',
  summary:
    'One small axis-free line per series, stacked as equal-height rows on one shared y scale, so trends and relative levels compare across many series.',
  intents: ['trend', 'comparison'],
  data: {
    form: 'records',
    encodings: [
      {
        prop: 'x',
        role: 'temporal',
        required: true,
        description:
          'Single key for the shared ordered axis (temporal or ordinal). Set `scalingFunction: "time"` with `time.isISO` or `time.format` for dates; numbers use a linear scale, anything else a point scale in data order.',
      },
      {
        prop: 'y',
        role: 'series',
        required: true,
        description:
          'Array of quantitative series, one row each, top to bottom. All rows share one y domain (min..max, not niced, zero not forced); pin it with the top-level `domain`.',
      },
      {
        prop: 'y[].className',
        role: 'color',
        required: false,
        description:
          'Row class for the line and its dots (`text-*` / `stroke-*`). Nothing is coloured by default.',
      },
    ],
    seriesCount: {
      min: 1,
      ideal: [3, 20],
      max: 50,
      note: 'Rows shrink as series are added; past ~30 they may be under 10px tall.',
    },
    rowCount: { ideal: [10, 200], max: 1000 },
  },
  useWhen: [
    'Many series (beyond ~8) whose trends should be compared without overplotting',
    'A compact trend summary per series, where shape and relative level matter more than exact values',
    'Dashboard rows of KPIs on a common scale',
  ],
  avoidWhen: [
    'Exact values or axis reading matter — use LineChart',
    'Series are on different units or scales, so a shared y would flatten some — use separate SparklineCharts or LineChart',
    'There are only one or two series — use LineChart',
  ],
  alternatives: [
    { name: 'LineChart', when: 'axes and exact reading matter, with few series' },
    { name: 'AreaChart', when: 'cumulative magnitude under the line matters' },
  ],
  requiredProps: ['id', 'data', 'x', 'y'],
  example: `<SparklineChart
  id="kpis"
  className="w-64 h-48"
  data={data}
  x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
  y={[
    { key: 'revenue', label: 'Revenue', className: 'text-blue-500' },
    { key: 'users', label: 'Users', className: 'text-emerald-500' },
  ]}
  margin={{ left: 64, right: 40, top: 4, bottom: 4 }}
  markers={{ last: true, min: { className: 'text-red-500' }, max: { className: 'text-blue-700' } }}
  labels={{ name: true, last: true }}
/>`,
  storybook: 'Linear/SparklineChart/Intro',
  variants: [
    {
      kind: 'option',
      name: 'End, min and max markers',
      how: 'Set `markers.last`, `markers.min` and/or `markers.max` to `true` or `{ className }`; min/max mark the first occurrence.',
    },
    {
      kind: 'option',
      name: 'Name and last-value labels',
      how: 'Set `labels.name` and/or `labels.last` (with an optional `format`), and widen `margin.left` / `margin.right` to fit them; the chart does not measure text.',
    },
    {
      kind: 'option',
      name: 'Time x',
      how: 'Set `x.scalingFunction: "time"` with `x.time.isISO` or `x.time.format`; ISO dates are read in UTC unless `x.time.utc: false`.',
    },
    {
      kind: 'option',
      name: 'Pinned domain',
      how: 'Set `domain.start` / `domain.end` to pin the shared y domain; values outside are clipped to their row.',
    },
  ],
};

export default meta;

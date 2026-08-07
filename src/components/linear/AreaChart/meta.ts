import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'AreaChart',
  aliases: ['area graph', 'stacked area chart', 'mountain chart'],
  category: 'linear',
  summary:
    'Plots series as filled bands over a shared axis, showing a trend and the composition of a total at the same time.',
  intents: ['trend', 'composition'],
  data: {
    form: 'records',
    encodings: [
      {
        prop: 'x',
        role: 'temporal',
        required: true,
        description: 'Single key for the shared axis, typically time or period.',
      },
      {
        prop: 'y',
        role: 'series',
        required: true,
        description:
          'Array of series configs, one per band, drawn bottom-up in the order given.',
      },
    ],
    seriesCount: { min: 1, ideal: [2, 6], max: 10 },
    rowCount: { min: 2, ideal: [4, 100] },
  },
  useWhen: [
    'Both the overall trend and each series’ share of it need to be visible at once',
    'Series are stacked parts of a meaningful total, e.g. revenue by product line',
    'Relative share matters more than absolute values — set `stacking.type: "100%"`',
    'A single series should read as volume or magnitude rather than a bare line',
  ],
  avoidWhen: [
    'Series need to be compared precisely against each other — stacked bands make all but the bottom one hard to read; use LineChart',
    'Series can be negative and would overlap confusingly — use LineChart, or `stacking.type: "diverging"`',
    'The x axis is categorical rather than continuous — use ColumnChartStacked',
    'There is a single series and no notion of a total — use LineChart',
  ],
  alternatives: [
    { name: 'LineChart', when: 'series must be compared precisely, or there is no meaningful total' },
    { name: 'ColumnChartStacked', when: 'the x axis is categorical rather than continuous' },
    { name: 'PieChart', when: 'showing composition at one point in time only' },
  ],
  requiredProps: ['id', 'data', 'x', 'y'],
  example: `<AreaChart
  id="revenue-by-product"
  className="w-full h-64"
  data={data}
  x={{ key: 'year' }}
  y={[
    { key: 'iphone', className: 'text-purple-900' },
    { key: 'macbook', className: 'text-purple-700' },
    { key: 'ipad', className: 'text-purple-500' },
  ]}
/>`,
  storybook: 'Linear/AreaChart/Intro',
  variants: [
    {
      kind: 'chart-type',
      name: 'Streamgraph',
      aliases: ['stream graph', 'theme river', 'stream chart'],
      summary:
        'A stacked area chart with a centred, flowing baseline instead of a flat one, emphasising the shape of each band over its exact value.',
      how: 'Set `stacking={{ type: "streamgraph" }}`. Bands are ordered inside-out and offset by wiggle.',
      useWhen: [
        'Many series need showing over a long span and the rise and fall of each is the story',
        'Relative movement matters more than reading any single value',
        'The total is large and volatile, so a flat baseline would waste vertical space',
      ],
      avoidWhen: [
        'Any value must be read off the chart — no band sits on a fixed baseline; use a plain stacked AreaChart',
        'There are only two or three series — the organic shape adds nothing over a normal stack',
        'The audience needs the total, which a wiggle baseline obscures',
      ],
      example: `<AreaChart
  id="genre-streamgraph"
  className="w-full h-64"
  data={data}
  x={{ key: 'year' }}
  y={[
    { key: 'iphone', className: 'text-purple-900' },
    { key: 'macbook', className: 'text-purple-700' },
    { key: 'ipad', className: 'text-purple-500' },
  ]}
  stacking={{ type: 'streamgraph' }}
/>`,
    },
    {
      kind: 'chart-type',
      name: '100% stacked area chart',
      aliases: ['percentage area chart', 'normalised area chart', 'share of total area chart'],
      summary:
        'A stacked area chart normalised so every period fills the full height, showing share rather than absolute value.',
      how: 'Set `stacking={{ type: "100%" }}`. The y axis becomes 0–100% of the period total.',
      useWhen: [
        'The mix matters and the absolute total does not',
        'Totals differ so much between periods that a plain stack would hide the smaller ones',
        'Showing how composition shifted over time, e.g. market share',
      ],
      avoidWhen: [
        'The total is part of the story — normalising deletes it; use a plain stacked AreaChart',
        'A shrinking absolute value could be mistaken for a growing one because its share rose',
      ],
      example: `<AreaChart
  id="market-share"
  className="w-full h-64"
  data={data}
  x={{ key: 'year' }}
  y={[
    { key: 'iphone', className: 'text-purple-900' },
    { key: 'macbook', className: 'text-purple-700' },
  ]}
  stacking={{ type: '100%' }}
/>`,
    },
    {
      kind: 'chart-type',
      name: 'Diverging area chart',
      aliases: ['diverging stacked area chart', 'bidirectional area chart'],
      summary:
        'A stacked area chart that splits around a zero baseline, stacking positive series upward and negative ones downward.',
      how: 'Set `stacking={{ type: "diverging" }}`. Series order is reversed so positive and negative stacks mirror each other.',
      useWhen: [
        'Series contain both gains and losses that should stack away from zero',
        'Net position against zero is the message, e.g. inflows against outflows',
      ],
      avoidWhen: [
        'All values share a sign — the diverging offset then behaves as a plain stack with confusing ordering',
      ],
      example: `<AreaChart
  id="flows"
  className="w-full h-64"
  data={data}
  x={{ key: 'year' }}
  y={[
    { key: 'inflow', className: 'text-green-700' },
    { key: 'outflow', className: 'text-red-700' },
  ]}
  stacking={{ type: 'diverging' }}
/>`,
    },
    {
      kind: 'chart-type',
      name: 'Time-scaled area chart',
      aliases: ['time series area chart'],
      summary: 'An area chart whose x axis parses real dates rather than treating the key as a plain number.',
      how: 'Set `x.scalingFunction: "time"` with `x.time.format`, or `x.time.isISO` for ISO strings.',
      useWhen: [
        'The x values are dates and the spacing between them is uneven',
        'Axis ticks should fall on real date boundaries',
      ],
      example: `<AreaChart
  id="daily-volume"
  className="w-full h-64"
  data={data}
  x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
  y={[{ key: 'volume', className: 'text-blue-500' }]}
/>`,
    },
  ],
};

export default meta;

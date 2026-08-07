import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'PieChart',
  aliases: ['circle chart', 'part-to-whole chart'],
  category: 'distribution',
  summary:
    'Divides a circle into slices sized by value, showing how much each category contributes to one whole.',
  intents: ['composition'],
  data: {
    form: 'records',
    encodings: [
      {
        prop: 'nameKey',
        role: 'category',
        required: true,
        description: 'Key holding the slice label.',
      },
      {
        prop: 'valueKey',
        role: 'quantitative',
        required: true,
        description: 'Key holding the slice size. Values are summed to form the whole.',
      },
      {
        prop: 'classNameMap',
        role: 'color',
        required: false,
        description: 'Maps each name value to a fill class; nothing is coloured by default.',
      },
    ],
    rowCount: { ideal: [2, 6], max: 8, note: 'Beyond ~8 slices, angles stop being distinguishable.' },
  },
  useWhen: [
    'The values are parts of a single whole and sum to something meaningful',
    'There are roughly six or fewer categories',
    'The rough share of one or two dominant slices is the message, not precise comparison',
    'A seating or parliament metaphor fits — set `startAngle`/`endAngle` for a semicircle',
  ],
  avoidWhen: [
    'Slices need precise comparison — angles are read far less accurately than lengths; use BarChart or ColumnChart',
    'The values do not sum to a meaningful whole, e.g. independent metrics or averages',
    'Composition must be compared across categories or over time — use ColumnChartStacked or AreaChart',
    'Any value is negative — a slice cannot represent it',
  ],
  alternatives: [
    { name: 'ColumnChartStacked', when: 'composition compared across several categories or periods' },
    { name: 'BarChart', when: 'slices need precise comparison' },
    { name: 'WaffleChart', when: 'part-to-whole shown as countable cells rather than angles' },
  ],
  requiredProps: ['id', 'data', 'nameKey', 'valueKey'],
  example: `<PieChart
  id="revenue-share"
  className="w-full h-64"
  data={data}
  nameKey="product"
  valueKey="revenue"
  classNameMap={{ macbook: 'fill-purple-300', iphone: 'fill-purple-800' }}
/>`,
  storybook: 'Distribution/PieChart/Intro',
  variants: [
    {
      kind: 'chart-type',
      name: 'Donut chart',
      aliases: ['doughnut chart', 'ring chart'],
      summary:
        'A pie chart with a hollow centre, which reads share by arc length rather than by wedge area and frees the middle for a total.',
      how: 'Set `innerRadius` above 0. Values are a fraction of `outerRadius`, so `innerRadius={0.5}` hollows half the radius.',
      useWhen: [
        'The same part-to-whole story as a pie, but the centre should carry a headline figure or label',
        'Slices are thin and the reduced centre clutter helps',
      ],
      avoidWhen: [
        'Precise comparison is needed — a donut is no more accurate than a pie; use BarChart',
        'There are many slices, which a donut makes harder to read rather than easier',
      ],
      example: `<PieChart
  id="revenue-donut"
  className="w-full h-64"
  data={data}
  nameKey="product"
  valueKey="revenue"
  innerRadius={0.5}
  cornerRadius={4}
  paddingAngle={2}
/>`,
    },
    {
      kind: 'chart-type',
      name: 'Semicircle chart',
      aliases: ['half donut chart', 'parliament chart', 'hemicycle chart', 'seat chart', 'gauge donut'],
      summary:
        'A pie swept through 180° rather than 360°, echoing a parliamentary seating plan.',
      how: 'Set `startAngle={-90}` and `endAngle={90}`. Combine with `innerRadius` for a half donut.',
      useWhen: [
        'Showing seat shares, poll results or any split with a parliamentary metaphor',
        'The chart must sit in a wide, short space where a full circle would not fit',
      ],
      avoidWhen: [
        'There is no seating or directional metaphor — the half circle then just halves the resolution for no reason',
      ],
      example: `<PieChart
  id="seat-share"
  className="w-full h-64"
  data={data}
  nameKey="party"
  valueKey="seats"
  startAngle={-90}
  endAngle={90}
/>`,
    },
    { kind: 'option', name: 'Rounded slices', how: 'Set `cornerRadius` and `paddingAngle` to separate and round the slices.' },
    { kind: 'option', name: 'Unsorted', how: 'Set `sort={false}` to keep data order instead of sorting by value descending.' },
  ],
};

export default meta;

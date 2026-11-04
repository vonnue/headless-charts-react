import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'LollipopVChart',
  aliases: ['vertical lollipop chart', 'stem and dot chart'],
  category: 'linear',
  summary:
    'Vertical stems ending in a symbol, marking one value per category with far less ink than a column.',
  intents: ['comparison', 'ranking'],
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
        role: 'quantitative',
        required: true,
        description: 'Single numeric key. Set `start: 0` to anchor stems at zero.',
      },
      {
        prop: 'shape',
        role: 'shape',
        required: true,
        description:
          'Symbol at the end of each stem: circle, diamond, triangle, square, cross, star or wye. Unlike LollipopHChart this prop has no default.',
      },
    ],
    seriesCount: { min: 1, max: 1 },
    rowCount: { ideal: [5, 20], max: 30 },
  },
  useWhen: [
    'A column chart would look heavy but the vertical orientation should be kept',
    'The value point matters more than magnitude-as-area',
    'Category labels are short enough to sit under vertical stems',
  ],
  avoidWhen: [
    'Several measures need comparing per category — use ColumnChart',
    'Category labels are long — use LollipopHChart',
    'The axis is dense continuous time and the trend matters more than individual values — use LineChart; for a modest number of dated values use the time-scaled variant (`x.scalingFunction: "time"`)',
  ],
  alternatives: [
    { name: 'ColumnChart', when: 'multiple measures per category, or magnitude should read as area' },
    { name: 'LollipopHChart', when: 'category labels are long' },
    { name: 'ScatterPlot', when: 'both axes are numeric rather than one being categorical' },
  ],
  requiredProps: ['id', 'data', 'x', 'y', 'shape'],
  example: `<LollipopVChart
  id="readings-by-name"
  className="w-full h-64"
  data={data}
  shape="circle"
  x={{ key: 'name', axis: { location: 'bottom' } }}
  y={{ key: 'reading', start: 0, axis: { location: 'left' } }}
/>`,
  storybook: 'Linear/LollipopVChart',
  variants: [
    { kind: 'option', name: 'Custom symbol', how: 'Pass `shape="star"` (or diamond, triangle, square, cross, wye).' },
    { kind: 'option', name: 'Styling', how: 'Use `classNames.classNameLines` and `classNames.classNameSymbols` to style stems and heads separately.' },
    { kind: 'option', name: 'Fixed value range', how: 'Set `y.start` and `y.end` to pin the value axis (0 counts, and a range narrower than the data is honoured).' },
    {
      kind: 'chart-type',
      name: 'Time-scaled lollipop chart',
      aliases: ['time series lollipop chart'],
      summary:
        'A vertical lollipop chart whose x axis parses real dates and positions each stem proportionally to elapsed time, rather than as an equal-width slot.',
      how: 'Set `x.scalingFunction: "time"` with `x.time.format`, or `x.time.isISO` for ISO strings. There is no bar width to derive — `x.time.barWidth` is not used by this chart. Set `x.time.utc: true` when dates are UTC instants or calendar days — otherwise they are parsed, placed and labelled in the viewer\'s local time zone.',
      useWhen: [
        'Values are one-per-date and spacing between stems should be proportional to elapsed time',
        'Category labels are dates rather than names',
      ],
      avoidWhen: [
        'Multiple rows can share the exact same date — their stems are drawn at the same x and overlap; aggregate to one row per date first (a time-scaled ColumnChart overlaps the same way)',
        'The axis is continuous time with many points and the trend matters more than individual values — use LineChart',
      ],
      example: `<LollipopVChart
  id="weekly-readings"
  className="w-full h-64"
  data={data}
  shape="circle"
  x={{ key: 'date', scalingFunction: 'time', time: { isISO: true, utc: true } }}
  y={{ key: 'reading', start: 0 }}
/>`,
    },
  ],
};

export default meta;

import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'LollipopChart',
  aliases: [
    'lollipop chart',
    'lollipop',
    'lollipop plot',
    'stem plot',
    'stem and dot chart',
    'vertical lollipop chart',
  ],
  category: 'linear',
  summary:
    'Vertical stems ending in a symbol, marking one value per category with far less ink than a bar or column. Set `orientation="horizontal"` for long category labels.',
  intents: ['comparison', 'ranking'],
  data: {
    form: 'records',
    encodings: [
      {
        prop: 'x',
        role: 'category',
        required: true,
        description:
          'Vertical (default): the category axis — key holding the category label, or dates when `scalingFunction: "time"`. Horizontal: the value axis — a single numeric key; set `start`/`end` to pin the domain.',
      },
      {
        prop: 'y',
        role: 'value',
        required: true,
        description:
          'Vertical (default): the value axis — a single numeric key; set `start`/`end` to pin the domain. Horizontal: the category axis (see `x`).',
      },
      {
        prop: 'orientation',
        role: 'shape',
        required: false,
        description:
          '`"vertical"` (default: categories on `x`, values on `y`) or `"horizontal"` (categories on `y`, values on `x`). When omitted the chart is always vertical; the configs never show an orientation.',
      },
      {
        prop: 'shape',
        role: 'shape',
        required: false,
        description:
          'Symbol at the end of each stem: circle (default), diamond, triangle, square, cross, star or wye.',
      },
    ],
    seriesCount: {
      min: 1,
      max: 1,
      note: 'One value per category; use BarChart for multiple measures.',
    },
    rowCount: {
      ideal: [5, 20],
      max: 30,
      note: 'Horizontal (orientation="horizontal") holds ~30 ideal, 50 max, with long labels.',
    },
  },
  useWhen: [
    'A bar or column chart would look heavy but the value point should stay visible',
    'The exact value point matters more than the magnitude-as-area a bar implies',
    'Category labels are long or there are many categories — set `orientation="horizontal"`',
  ],
  avoidWhen: [
    'Several measures need comparing per category — a lollipop carries one value; use BarChart',
    'The magnitude should read as accumulated quantity — bars encode that better',
    'The axis is dense continuous time and the trend matters more than individual values — use LineChart; for a modest number of dated values use the time-scaled variant (`x.scalingFunction: "time"`)',
    'Values cluster far from zero and only their differences matter — a zero-based stem hides them; use RangePlot/ScatterPlot or pin `start`',
  ],
  alternatives: [
    { name: 'BarChart', when: 'multiple measures per category, or magnitude should read as area' },
    { name: 'RangePlot', when: 'each category has an interval rather than a single value' },
    { name: 'ScatterPlot', when: 'both axes are numeric rather than one being categorical' },
    { name: 'LineChart', when: 'the axis is dense continuous time and the trend matters more than individual values' },
  ],
  requiredProps: ['id', 'data', 'x', 'y'],
  example: `<LollipopChart
  id="readings-by-name"
  className="w-full h-64"
  data={data}
  x={{ key: 'name', axis: { location: 'bottom' } }}
  y={{ key: 'reading', start: 0, axis: { location: 'left' } }}
/>`,
  storybook: 'Linear/LollipopChart/Intro',
  wrappers: [
    {
      name: 'LollipopHChart',
      pins: 'orientation="horizontal"',
      variant: 'Horizontal lollipop chart',
      note: 'Accepts the props it always has, and draws in over 1 s unless `drawing` is given.',
      deprecated: 'Use `<LollipopChart orientation="horizontal">`',
    },
    {
      name: 'LollipopVChart',
      pins: 'orientation="vertical"',
      note: 'Accepts the props it always has, and draws in over 1 s unless `drawing` is given.',
      deprecated: 'Use `<LollipopChart orientation="vertical">`',
    },
  ],
  variants: [
    {
      kind: 'chart-type',
      name: 'Horizontal lollipop chart',
      aliases: [
        'lollipop chart (horizontal)',
        'horizontal stem plot',
        'ranked lollipop chart',
      ],
      summary:
        'The same lollipop chart with categories running down the y axis and values along x, so long category labels fit.',
      how: 'Set `orientation="horizontal"`; categories go on `y` and values on `x`. `LollipopHChart` is a deprecated alias for this form.',
      useWhen: [
        'Category labels are long',
        'There are many categories',
        'A ranked list is being shown',
      ],
      avoidWhen: [
        'The axis is time — time scaling is vertical only; use LineChart or the vertical time-scaled variant',
      ],
      example: `<LollipopChart
  id="scores-by-team"
  className="w-full h-64"
  orientation="horizontal"
  data={data}
  y={{ key: 'name' }}
  x={{ key: 'value', start: 0 }}
/>`,
    },
    {
      kind: 'chart-type',
      name: 'Time-scaled lollipop chart',
      aliases: ['time series lollipop chart'],
      summary:
        'A vertical lollipop chart whose x axis parses real dates and positions each stem proportionally to elapsed time, rather than as an equal-width slot.',
      how: 'Set `x.scalingFunction: "time"` with `x.time.format`, or `x.time.isISO` for ISO strings. There is no bar width to derive — `x.time.barWidth` is not used by this chart. ISO dates are read, placed and labelled in UTC by default, so calendar days (`2025-01-31`) land on the right day in every time zone; set `x.time.utc: false` for the viewer\'s local time, or `x.time.utc: true` to read `x.time.format` strings in UTC.',
      useWhen: [
        'Values are one-per-date and spacing between stems should be proportional to elapsed time',
        'Category labels are dates rather than names',
      ],
      avoidWhen: [
        'Multiple rows can share the exact same date — their stems are drawn at the same x and overlap; aggregate to one row per date first (a time-scaled BarChart overlaps the same way)',
        'The axis is continuous time with many points and the trend matters more than individual values — use LineChart',
      ],
      example: `<LollipopChart
  id="weekly-readings"
  className="w-full h-64"
  data={data}
  x={{ key: 'date', scalingFunction: 'time', time: { isISO: true, utc: true } }}
  y={{ key: 'reading', start: 0 }}
/>`,
    },
    {
      kind: 'option',
      name: 'Custom symbol',
      how: 'Pass `shape="diamond"` (or star, triangle, square, cross, wye). The default is `circle`.',
    },
    {
      kind: 'option',
      name: 'Styling',
      how: 'Use `classNames.points` for stems and symbols together, `classNames.lines` for stems only, and `classNames.symbols` for symbols only.',
    },
    {
      kind: 'option',
      name: 'Fixed value range',
      how: 'Set `start` and `end` on the value config (`y` when vertical, `x` when horizontal) to pin the domain. Pin `start` to leave zero out deliberately.',
    },
  ],
};

export default meta;

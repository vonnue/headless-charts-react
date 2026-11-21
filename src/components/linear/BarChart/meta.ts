import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'BarChart',
  aliases: [
    'bar chart',
    'bar graph',
    'column chart',
    'column graph',
    'vertical bar chart',
    'grouped bar chart',
    'grouped column chart',
    'clustered column chart',
    'clustered bar chart',
  ],
  category: 'linear',
  summary:
    'Vertical or horizontal bars comparing one or more measures across categories, grouped side by side when several measures are passed. Set `orientation="horizontal"` for long category labels.',
  intents: ['comparison', 'composition', 'distribution', 'ranking'],
  data: {
    form: 'records',
    encodings: [
      {
        prop: 'x',
        role: 'category',
        required: true,
        description:
          'Vertical (default): the category axis — key holding the category label, one group per row; set `bin` here for a histogram, or `scalingFunction: "time"` for dates. Horizontal: the series array — one bar per key per category. Each series entry also takes `rx` for rounded corners.',
      },
      {
        prop: 'y',
        role: 'value',
        required: true,
        description:
          'Vertical (default): the series array (see `x` in horizontal). Horizontal: the category axis — key holding the category label; set `bin` here for a horizontal histogram (`x[0].bin` is still read, and `y.bin` wins).',
      },
      {
        prop: 'orientation',
        role: 'shape',
        required: false,
        description:
          '`"vertical"` (default: categories on `x`, series on `y`) or `"horizontal"` (categories on `y`, series on `x`). When omitted it is inferred from which of `x` or `y` is the series array, so existing `<BarChart x={[…]} y={{…}}>` still renders horizontally.',
      },
    ],
    seriesCount: { min: 1, ideal: [1, 4], max: 6, note: 'Stacked layouts take 2–8.' },
    rowCount: {
      ideal: [2, 12],
      max: 20,
      note: 'Horizontal (orientation="horizontal") holds ~25 ideal, 40 max, with long labels.',
    },
  },
  useWhen: [
    'Comparing a numeric measure across a modest number of categories with short labels',
    'Several measures need comparing within each category, side by side',
    'The categories are periods (years, quarters) and individual values matter more than the trend line',
    'Category labels are long or there are more than ~12 categories — set `orientation="horizontal"`',
    'Presenting a ranked list, sorted by value — set `orientation="horizontal"`',
    'Showing a histogram of raw continuous values — set `bin` on the category config (`x.bin` in vertical, `y.bin` in horizontal)',
    'Bars should grow leftward from the right edge — set `orientation="horizontal"` and `direction: "left"`',
  ],
  avoidWhen: [
    'The measures are parts of one whole and the grouped default is used — set `stacking` so the total is readable',
    'The x axis is continuous time with many points — use LineChart',
    'The bars would be nearly equal in height, making differences invisible — use LollipopChart or a dot-based chart',
    'Two measures should read outward from a shared centre — use SpineChart',
  ],
  alternatives: [
    { name: 'LollipopChart', when: 'bars look heavy and the value point is the focus' },
    { name: 'SpineChart', when: 'two opposing measures per category' },
    { name: 'LineChart', when: 'the axis is continuous time with many points' },
  ],
  requiredProps: ['id', 'data', 'x', 'y'],
  example: `<BarChart
  id="sales-by-year"
  className="w-full h-64"
  data={data}
  x={{ key: 'year' }}
  y={[
    { key: 'macbook', className: 'fill-purple-800' },
    { key: 'iphone', className: 'fill-purple-600' },
  ]}
/>`,
  storybook: 'Linear/BarChart/Intro',
  wrappers: [
    {
      name: 'ColumnChart',
      pins: 'orientation="vertical"',
      deprecated: 'Use `<BarChart orientation="vertical">`',
    },
    { name: 'BarChartStacked', pins: 'orientation="horizontal" stacking={{ type: "normal" }}', variant: 'Horizontal stacked bar chart' },
    { name: 'ColumnChartStacked', pins: 'orientation="vertical" stacking={{ type: "normal" }}', variant: 'Stacked bar chart' },
  ],
  variants: [
    {
      kind: 'chart-type',
      name: 'Horizontal bar chart',
      aliases: [
        'bar chart (horizontal)',
        'ranked bar chart',
        'horizontal grouped bar chart',
      ],
      summary:
        'The same bar chart with categories running down the y axis and values along x, so long category labels fit.',
      how: 'Set `orientation="horizontal"`; categories go on `y` and the series array on `x`.',
      useWhen: [
        'Category labels are long enough that vertical bars would truncate or rotate them',
        'There are more categories than vertical bars can hold (roughly 12 or more)',
        'Presenting a ranked list, sorted by value',
      ],
      avoidWhen: [
        'The x axis is time — a horizontal bar per period breaks the reading order; keep the default orientation or use LineChart',
        'Labels are short and there are few categories — the vertical default is the more conventional read',
      ],
      example: `<BarChart
  id="sales-by-region"
  className="w-full h-64"
  orientation="horizontal"
  data={data}
  y={{ key: 'region' }}
  x={[{ key: 'revenue', className: 'fill-blue-500' }]}
/>`,
    },
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
        'The x values are already categories — a histogram bins continuous data; use a plain BarChart',
        'Groups need comparing by their summary statistics rather than their full shape — use BoxPlot',
        'There are too few records for bin heights to mean anything',
      ],
      example: `<BarChart
  id="score-histogram"
  className="w-full h-64"
  data={rawRows}
  x={{ key: 'score', bin: { count: 8 }, axis: { label: 'Score' } }}
  y={[{ key: 'count', className: 'text-blue-500' }]}
/>`,
    },
    {
      kind: 'chart-type',
      name: 'Horizontal histogram',
      aliases: ['binned bar chart', 'horizontal frequency distribution'],
      summary:
        'Bins raw continuous values and draws the count per bin as horizontal bars, with bin ranges as labels down the y axis.',
      how: 'Set `orientation="horizontal"`, `y={{ key, bin }}` and `x={[{ key: "count" }]}`. Legacy `x[0].bin` is still read; if both are set, `y.bin` wins.',
      useWhen: [
        'A distribution has many bins, which fit better stacked vertically than squeezed across',
        'Bin range labels are long, e.g. "10,000–20,000"',
      ],
      avoidWhen: [
        'The conventional histogram orientation is expected — use `x.bin` on the vertical default',
        'The x values are already categorical rather than continuous',
      ],
      example: `<BarChart
  id="score-histogram"
  className="w-full h-64"
  orientation="horizontal"
  data={rawRows}
  y={{ key: 'score', bin: { count: 8 } }}
  x={[{ key: 'count', className: 'fill-blue-500' }]}
/>`,
    },
    {
      kind: 'chart-type',
      name: 'Diverging bar chart',
      aliases: ['tornado chart', 'bidirectional bar chart', 'deviation chart'],
      summary:
        'Bars growing left and right of a zero baseline, with negative values styled separately to show direction of change.',
      how: 'Supply negative values in the data, set `start`/`end` on the series to pin a symmetric axis, and style with `className` plus `classNameNegative`. The example is horizontal.',
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
  orientation="horizontal"
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
    {
      kind: 'chart-type',
      name: 'Time-scaled column chart',
      aliases: ['time series column chart', 'time-scaled bar chart'],
      summary:
        'A grouped column chart whose x axis parses real dates and spaces bars proportionally to elapsed time, rather than treating each category as an equal-width slot.',
      how: 'Vertical only. Set `x.scalingFunction: "time"` with `x.time.format`, or `x.time.isISO` for ISO strings. Bar width comes from the median gap between dates (one slot per step); `x.time.barWidth` (positive pixels) overrides it but is capped at one slot, so it can narrow bars but never widen them past their slot. ISO dates are read, placed and labelled in UTC by default, so calendar days (`2025-01-31`) land on the right day in every time zone; set `x.time.utc: false` for the viewer\'s local time, or `x.time.utc: true` to read `x.time.format` strings in UTC. Pinned `x.start`/`x.end` (epoch ms) get no edge padding, so a bar dated exactly on a pinned end is centred on the plot edge and overhangs it by half a bar; to keep edge marks inside, pin half a step outside the data (e.g. `start: Date.UTC(2025, 0, 1) - 12 * 3600_000` for daily data starting 1 Jan 2025).',
      useWhen: [
        'The x values are real dates and spacing between bars should be proportional to elapsed time, not category index',
        'Some periods are missing and the gap should read as whitespace rather than being silently collapsed',
        'Axis ticks should fall on real date boundaries',
      ],
      avoidWhen: [
        'Cadence is highly irregular (e.g. mixed daily and monthly points) — width comes from the median gap, so dates closer together than that get overlapping bars; set a smaller `x.time.barWidth` (capped at one slot, so it can only narrow bars) or use LineChart instead',
        'The categories are ordinal labels rather than true dates, e.g. "Q1"/"Q2" — use a plain BarChart',
        'A horizontal time axis — `y.scalingFunction: "time"` is ignored; time scaling is vertical only',
      ],
      example: `<BarChart
  id="daily-signups"
  className="w-full h-64"
  data={data}
  x={{ key: 'date', scalingFunction: 'time', time: { isISO: true, utc: true } }}
  y={[{ key: 'signups', className: 'fill-purple-600' }]}
/>`,
    },
    {
      kind: 'chart-type',
      name: 'Stacked bar chart',
      aliases: ['stacked column chart', 'stacked bar chart (vertical)'],
      summary:
        'Vertical bars where each measure stacks on the previous one, showing the total per category and its composition.',
      how: 'Set `stacking={{ type: \'normal\' }}`. Segments stack from 0 in series order; negative values stack below 0. `ColumnChartStacked` is this form as a wrapper.',
      useWhen: ['The total per category matters as much as its breakdown', 'Segments are genuinely parts of one whole, not independent measures'],
      avoidWhen: ['Individual segments need precise comparison across categories — only the first segment shares a baseline; use the grouped default'],
      example: `<BarChart
  id="revenue-split"
  className="w-full h-64"
  data={data}
  stacking={{ type: 'normal' }}
  x={{ key: 'year' }}
  y={[
    { key: 'macbook', className: 'fill-purple-800' },
    { key: 'iphone', className: 'fill-purple-600' },
  ]}
/>`,
    },
    {
      kind: 'chart-type',
      name: 'Horizontal stacked bar chart',
      aliases: ['stacked bar chart (horizontal)'],
      summary:
        'Horizontal bars where measures stack end to end, for long category labels.',
      how: 'Set `orientation="horizontal"` and `stacking={{ type: \'normal\' }}`; categories go on `y`, the series array on `x`. `BarChartStacked` is this form as a wrapper.',
      useWhen: ['Composition needs comparing across categories whose labels are long'],
      example: `<BarChart
  id="revenue-by-region"
  className="w-full h-64"
  data={data}
  orientation="horizontal"
  stacking={{ type: 'normal' }}
  y={{ key: 'year' }}
  x={[
    { key: 'macbook', className: 'fill-purple-800' },
    { key: 'iphone', className: 'fill-purple-600' },
  ]}
/>`,
    },
    {
      kind: 'chart-type',
      name: '100% stacked bar chart',
      aliases: ['percentage bar chart', 'percentage column chart', '100% stacked column chart'],
      summary:
        'Every bar fills the axis and each segment shows its share of the row total.',
      how: 'Set `stacking={{ type: \'100%\' }}`. The axis is [0, 1] with `.0%` ticks (`tickFormat` overrides it); negative values count as 0; pinned `start`/`end` are ignored. Tooltips and labels show the share.',
      useWhen: ['Composition (shares) is compared across categories and totals do not matter'],
      avoidWhen: ['Absolute totals matter — use `stacking={{ type: \'normal\' }}` or show the total separately'],
      example: `<BarChart
  id="share-split"
  className="w-full h-64"
  data={data}
  stacking={{ type: '100%' }}
  x={{ key: 'year' }}
  y={[
    { key: 'macbook', className: 'fill-purple-800' },
    { key: 'iphone', className: 'fill-purple-600' },
  ]}
/>`,
    },
    {
      kind: 'chart-type',
      name: 'Diverging stacked bar chart',
      aliases: ['likert chart', 'likert scale chart', 'diverging stacked column chart'],
      summary:
        'Survey or sentiment responses split around 0: the negative answers extend one way and the positive answers the other.',
      how: 'Set `stacking={{ type: \'diverging\', negative: [\'strongly_disagree\', \'disagree\'], neutral: \'neutral\' }}`. List series in scale order; the last `negative` key and the first positive key touch 0; `neutral` is split across 0; `percent: true` normalises each row to 100%. The example is horizontal. Use a diverging palette (RdBu, BrBG) with grey for neutral.',
      useWhen: ['Showing agreement scales (Likert) or positive versus negative sentiment per category'],
      example: `<BarChart
  id="survey"
  className="w-full h-64"
  data={data}
  orientation="horizontal"
  stacking={{ type: 'diverging', negative: ['disagree'], neutral: 'neutral', percent: true }}
  y={{ key: 'question' }}
  x={[
    { key: 'disagree', className: 'fill-red-600' },
    { key: 'neutral', className: 'fill-gray-400' },
    { key: 'agree', className: 'fill-blue-600' },
  ]}
/>`,
    },
    {
      kind: 'chart-type',
      name: 'Waterfall chart',
      aliases: ['waterfall', 'bridge chart', 'cascade chart', 'flying bricks chart'],
      summary:
        'Each series is a step of a running total, so gains and losses read as floating bars.',
      how: 'Set `waterfall` (or `waterfall={{ padding: 4 }}` to narrow the steps). Each series becomes its own step within the category, starting where the previous one ended. `waterfall` wins over `stacking`.',
      useWhen: ['Showing a walk of running gains and losses to a total'],
      example: `<BarChart
  id="revenue-bridge"
  className="w-full h-64"
  data={data}
  waterfall
  x={{ key: 'year' }}
  y={[
    { key: 'macbook', className: 'fill-purple-800' },
    { key: 'iphone', className: 'fill-purple-600' },
  ]}
/>`,
    },
    {
      kind: 'chart-type',
      name: 'Horizontal waterfall chart',
      aliases: ['horizontal bridge chart', 'horizontal cascade chart'],
      summary:
        'A waterfall with the steps running left to right, for long category labels.',
      how: 'Set `orientation="horizontal"` and `waterfall`; categories go on `y`, the series array on `x`.',
      useWhen: ['A waterfall whose category labels are long'],
      example: `<BarChart
  id="profit-walk"
  className="w-full h-64"
  data={data}
  orientation="horizontal"
  waterfall
  y={{ key: 'year' }}
  x={[
    { key: 'macbook', className: 'fill-purple-800' },
    { key: 'iphone', className: 'fill-purple-600' },
  ]}
/>`,
    },
    {
      kind: 'chart-type',
      name: 'Time-scaled stacked column chart',
      aliases: ['time series stacked column chart'],
      summary:
        'Stacked columns on a real date axis, spaced by elapsed time.',
      how: 'Vertical only. Set `stacking={{ type: \'normal\' }}` and `x.scalingFunction: "time"` with `x.time.format` or `x.time.isISO`; bar width follows the median gap between dates, as for the time-scaled column chart.',
      useWhen: ['Composition per dated period, where gaps between periods should show'],
      example: `<BarChart
  id="daily-revenue-split"
  className="w-full h-64"
  data={data}
  stacking={{ type: 'normal' }}
  x={{ key: 'date', scalingFunction: 'time', time: { isISO: true, utc: true } }}
  y={[
    { key: 'macbook', className: 'fill-purple-800' },
    { key: 'iphone', className: 'fill-purple-600' },
  ]}
/>`,
    },
    { kind: 'option', name: 'Data labels', how: 'Pass `dataLabel={{ className: "fill-white text-xs" }}` to print values on the bars, or `dataLabel.text` to override the text.' },
    { kind: 'option', name: 'Right-to-left', how: 'Set `orientation="horizontal"` and `direction="left"` to anchor bars at the right edge.' },
    { kind: 'option', name: 'Reference lines', how: 'Pass `referenceLines={[{ y: 50, className: "stroke-red-500" }]}` in vertical, or `{ x: 50 }` in horizontal. A line at 0 is drawn.' },
    { kind: 'option', name: 'Whole numbers', how: 'Set `wholeNumbers` to force integer ticks on the value axis.' },
    { kind: 'option', name: 'Rounded corners', how: 'Set `rx` on a series, e.g. `y={[{ key: "revenue", rx: 3 }]}`.' },
    { kind: 'option', name: 'Tick format', how: 'Pass `tickFormat` as a d3-format specifier for value-axis ticks.' },
  ],
};

export default meta;

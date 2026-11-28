import { ChartMeta } from '@/catalog/types';

const statKeysExample = `{
    minKey: 'min',
    maxKey: 'max',
    midKey: 'mid',
    boxStart: 'firstQuartile',
    boxEnd: 'lastQuartile',
    start: 0,
  }`;

const meta: ChartMeta = {
  name: 'BoxPlot',
  aliases: [
    'box plot',
    // 'boxplot' is not listed: it is the component name, which already
    // resolves case-insensitively (and the integrity test rejects duplicates).
    'box and whisker plot',
    'box and whisker chart',
    'box chart',
    'quartile plot',
    'vertical box plot',
  ],
  category: 'ranges',
  summary:
    'Box-and-whisker marks summarising the spread of a measure per group — min, quartiles, median and max — drawn vertically by default or horizontally with `orientation="horizontal"`.',
  intents: ['distribution', 'range'],
  data: {
    form: 'records',
    encodings: [
      {
        prop: 'x',
        role: 'category',
        required: true,
        description:
          'Vertical (default): the category axis — key holding the group label, one box per group; set `bin` here to group a continuous field into bands, or `scalingFunction: "time"` for dates. Horizontal: the value axis — config naming the statistic keys (see `y`).',
      },
      {
        prop: 'y',
        role: 'value',
        required: true,
        description:
          'Vertical (default): the value axis — config naming the statistic keys `minKey`, `maxKey`, `midKey`, `boxStart` and `boxEnd`; no `key` is needed. `start`/`end` pin the domain (`min`/`max` are deprecated aliases). When the category axis has `bin` and `valueKey` is set the statistics are computed and these keys can be omitted. Horizontal: the category axis (see `x`).',
      },
      {
        prop: 'orientation',
        role: 'shape',
        required: false,
        description:
          '`"vertical"` (default: groups on `x`, statistics on `y`) or `"horizontal"` (groups on `y`, statistics on `x`). When omitted it is inferred from where the statistic keys or `bin` sit.',
      },
      {
        prop: 'valueKey',
        role: 'quantitative',
        required: false,
        description:
          'Names the raw continuous field the box statistics are computed from. Required for binned mode — without it `bin` on the category axis is ignored.',
      },
    ],
    rowCount: {
      ideal: [2, 15],
      max: 25,
      note: 'Horizontal (orientation="horizontal") holds up to ~30 groups with long labels.',
    },
  },
  useWhen: [
    'The spread of a measure needs comparing across groups, not just its average',
    'Median and quartiles matter — skew and outliers would make a mean alone mislead',
    'Groups are ordered periods and the change in spread over them is the message',
    'Group labels are long or there are many groups — set `orientation="horizontal"`',
    'Statistics should be derived from raw rows — set `bin` on the category axis with `valueKey`',
  ],
  avoidWhen: [
    'Every underlying point should be visible — use ScatterPlot',
    'The interval is a plain min–max rather than a statistical summary — use RangePlot',
    'The audience will not read quartiles; a histogram via BarChart with `x.bin` is more intuitive',
    'Only the central value matters — use BarChart',
  ],
  alternatives: [
    { name: 'RangePlot', when: 'showing a plain min–max interval rather than quartiles' },
    { name: 'ScatterPlot', when: 'individual records should stay visible' },
    { name: 'BarChart', when: 'a histogram of one group is enough — set `x.bin`' },
    { name: 'ViolinChart', when: 'the full density, not just the five-number summary, matters' },
  ],
  requiredProps: ['id', 'data', 'x', 'y'],
  example: `<BoxPlot
  id="salary-by-band"
  className="w-full h-64"
  data={data}
  x={{ key: 'name' }}
  y={${statKeysExample}}
/>`,
  storybook: 'Ranges/BoxPlot/Intro',
  wrappers: [
    {
      name: 'BoxPlotH',
      pins: 'orientation="horizontal"',
      variant: 'Horizontal box plot',
      note: 'Accepts the props it always has, and draws in over 1 s unless `drawing` is given.',
      deprecated: 'Use `<BoxPlot orientation="horizontal">`',
    },
    {
      name: 'BoxPlotV',
      pins: 'orientation="vertical"',
      note: 'Accepts the props it always has, and draws in over 1 s unless `drawing` is given.',
      deprecated: 'Use `<BoxPlot orientation="vertical">`',
    },
  ],
  variants: [
    {
      kind: 'chart-type',
      name: 'Horizontal box plot',
      aliases: ['box plot (horizontal)', 'horizontal box and whisker plot'],
      summary:
        'The same box plot with groups running down the y axis and statistics along x, so long group labels fit.',
      how: 'Set `orientation="horizontal"`; groups go on `y` and statistics on `x`. `BoxPlotH` is a deprecated alias for this form.',
      useWhen: [
        'Group labels are long',
        'There are more than ~15 groups',
      ],
      avoidWhen: [
        'Groups are dates — time scaling is vertical only; keep the default orientation',
      ],
      example: `<BoxPlot
  id="scores-by-team"
  className="w-full h-64"
  orientation="horizontal"
  data={data}
  y={{ key: 'name' }}
  x={${statKeysExample}}
/>`,
    },
    {
      kind: 'chart-type',
      name: 'Binned box plot',
      aliases: [
        'box plot from raw data',
        'grouped distribution plot',
        'binned box plot (vertical)',
        'vertical box plot from raw data',
        'distribution by band',
      ],
      summary:
        'Bins a continuous field into groups and computes each group’s min, quartiles and median from the raw rows, rather than taking pre-aggregated statistics.',
      how: 'Set `bin` on the category-axis config (`x` in vertical, `y` in horizontal) and pass `valueKey` naming the field to summarise. Both are needed: the statistic keys on the value axis are then computed internally and can be omitted (any given are ignored). `bin` without `valueKey` is ignored, and the value axis still needs `minKey`, `maxKey`, `boxStart`, `boxEnd` and `midKey`. Use `bin.thresholds` for explicit band edges.',
      useWhen: [
        'The data is raw observations and the statistics have not been computed upstream',
        'The grouping field is continuous, e.g. distribution of salary by age band',
        'Bin boundaries need tuning to see how the distribution shifts across groups',
      ],
      avoidWhen: [
        'Groups are already categorical — pass them directly with a plain category key instead of binning',
        'The statistics are already computed, in which case name the keys directly',
      ],
      example: `<BoxPlot
  id="salary-by-age"
  className="w-full h-64"
  data={rawRows}
  valueKey="salary"
  x={{ key: 'age', bin: { count: 5 }, axis: { label: 'Age Group' } }}
  y={{ start: 0, axis: { label: 'Salary' } }}
/>`,
    },
    {
      kind: 'chart-type',
      name: 'Time-scaled box plot',
      aliases: ['time series box plot', 'time-scaled box plot (vertical)'],
      summary:
        'A vertical box plot whose x axis parses real dates and spaces boxes proportionally to elapsed time.',
      how: 'Vertical only. Set `x.scalingFunction: "time"` with `x.time.format`, or `x.time.isISO` for ISO strings. Box width comes from the median gap between dates (one slot per step); `x.time.barWidth` (positive pixels) overrides it but is capped at one slot, so it can narrow boxes but never widen them past their slot. ISO dates are read, placed and labelled in UTC by default, so calendar days (`2025-01-31`) land on the right day in every time zone; set `x.time.utc: false` for the viewer\'s local time, or `x.time.utc: true` to read `x.time.format` strings in UTC. Pinned `x.start`/`x.end` (epoch ms) get no edge padding, so a box dated exactly on a pinned end is centred on the plot edge and overhangs it by half a box; to keep edge marks inside, pin half a step outside the data (e.g. `start: Date.UTC(2025, 0, 1) - 12 * 3600_000` for daily data starting 1 Jan 2025). With `orientation="horizontal"`, `y.scalingFunction: "time"` is ignored with a dev warning.',
      useWhen: [
        'Groups are periods (weeks, months) with real dates and spacing should reflect elapsed time',
        'Some periods have no data and that gap should be visible rather than silently skipped',
      ],
      avoidWhen: [
        'Cadence is highly irregular — width comes from the median gap, so dates closer together than that get overlapping boxes; set a smaller `x.time.barWidth` (capped at one slot, so it can only narrow boxes)',
        'Raw rows need binning — `x.bin` and `valueKey` are ignored on a time axis (with a dev warning) and summary mode is used, so `y` must name all five stat keys; pre-compute per-period statistics or drop `scalingFunction: "time"`',
      ],
      example: `<BoxPlot
  id="weekly-latency-spread"
  className="w-full h-64"
  data={data}
  x={{ key: 'weekStart', scalingFunction: 'time', time: { isISO: true, utc: true } }}
  y={${statKeysExample}}
/>`,
    },
    {
      kind: 'option',
      name: 'Per-row colours',
      how: 'Put a `className` field on each row to colour its box.',
    },
    {
      kind: 'option',
      name: 'Per-group colours',
      how: 'Set `classNameMap` on the value-axis config, keyed by category, to colour every mark of that group (through `currentColor`).',
    },
  ],
};

export default meta;

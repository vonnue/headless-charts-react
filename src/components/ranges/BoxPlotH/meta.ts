import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'BoxPlotH',
  aliases: ['horizontal box plot', 'box and whisker plot', 'quartile plot'],
  category: 'ranges',
  summary:
    'Horizontal box-and-whisker marks summarising the spread of a measure per group: min, quartiles, median and max.',
  intents: ['distribution', 'range'],
  data: {
    form: 'records',
    encodings: [
      {
        prop: 'y',
        role: 'category',
        required: true,
        description:
          'Key holding the group label; one box per group. Set `bin` here to group a continuous field into bands instead.',
      },
      {
        prop: 'x',
        role: 'value',
        required: true,
        description:
          'Config naming the statistic keys: `minKey`, `maxKey`, `midKey`, `boxStart` and `boxEnd`. When `y.bin` is set these are computed internally and can be omitted.',
      },
      {
        prop: 'valueKey',
        role: 'quantitative',
        required: false,
        description: 'With `y.bin` set, names the raw continuous field the box statistics are computed from.',
      },
    ],
    rowCount: { ideal: [2, 20], max: 30 },
  },
  useWhen: [
    'The spread of a measure needs comparing across groups, not just its average',
    'Median and quartiles matter — an average alone would hide skew',
    'Group labels are long enough to need horizontal orientation',
    'Statistics should be derived from raw rows — set `y.bin` with `valueKey` and they are computed automatically',
  ],
  avoidWhen: [
    'Every underlying point should be visible — use ScatterPlot',
    'The interval is a plain min–max rather than a statistical summary — use RangePlot',
    'The audience will not read quartiles; a histogram via ColumnChart with `x.bin` is more intuitive',
    'A vertical layout fits better — use BoxPlotV',
  ],
  alternatives: [
    { name: 'BoxPlotV', when: 'a vertical layout fits the space better' },
    { name: 'RangePlot', when: 'showing a plain min–max interval rather than quartiles' },
    { name: 'ColumnChart', when: 'a histogram of one group is enough — set `x.bin`' },
  ],
  requiredProps: ['id', 'data', 'x', 'y'],
  example: `<BoxPlotH
  id="scores-by-team"
  className="w-full h-64"
  data={data}
  y={{ key: 'name' }}
  x={{
    minKey: 'min',
    maxKey: 'max',
    midKey: 'mid',
    boxStart: 'firstQuartile',
    boxEnd: 'lastQuartile',
    min: 0,
  }}
/>`,
  storybook: 'Ranges/BoxPlotH',
  variants: [
    {
      kind: 'chart-type',
      name: 'Binned box plot',
      aliases: ['box plot from raw data', 'grouped distribution plot'],
      summary:
        'Bins a continuous field into groups and computes each group’s min, quartiles and median from the raw rows, rather than taking pre-aggregated statistics.',
      how: 'Set `bin` on the `y` (category) config and pass `valueKey` naming the field to summarise. The statistic keys on `x` are then computed internally and can be omitted.',
      useWhen: [
        'The data is raw observations and the statistics have not been computed upstream',
        'The grouping field is continuous, e.g. distribution of salary by age band',
        'Bin boundaries need tuning to see how the distribution shifts across groups',
      ],
      avoidWhen: [
        'Groups are already categorical — pass them directly with a plain `y` key instead of binning',
        'The statistics are already computed, in which case name the keys directly',
      ],
      example: `<BoxPlotH
  id="salary-by-age"
  className="w-full h-64"
  data={rawRows}
  valueKey="salary"
  y={{ key: 'age', bin: { count: 5 } }}
  x={{ min: 0 }}
/>`,
    },
    { kind: 'option', name: 'Per-row colours', how: 'Put a `className` field on each row to colour boxes individually.' },
  ],
};

export default meta;

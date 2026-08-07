import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'BoxPlotV',
  aliases: ['vertical box plot', 'box and whisker chart', 'box chart'],
  category: 'ranges',
  summary:
    'Vertical box-and-whisker marks summarising the spread of a measure per group: min, quartiles, median and max.',
  intents: ['distribution', 'range'],
  data: {
    form: 'records',
    encodings: [
      {
        prop: 'x',
        role: 'category',
        required: true,
        description:
          'Key holding the group label; one box per group. Set `bin` here to group a continuous field into bands instead.',
      },
      {
        prop: 'y',
        role: 'value',
        required: true,
        description:
          'Config naming the statistic keys: `minKey`, `maxKey`, `midKey`, `boxStart` and `boxEnd`. When `x.bin` is set these are computed internally and can be omitted.',
      },
      {
        prop: 'valueKey',
        role: 'quantitative',
        required: false,
        description: 'With `x.bin` set, names the raw continuous field the box statistics are computed from.',
      },
    ],
    rowCount: { ideal: [2, 15], max: 25 },
  },
  useWhen: [
    'The spread of a measure needs comparing across a few groups with short labels',
    'Skew and outliers matter, so a mean alone would mislead',
    'Groups are ordered periods and the change in spread over them is the message',
    'Statistics should be derived from raw rows — set `x.bin` with `valueKey`',
  ],
  avoidWhen: [
    'Every underlying point should be visible — use ScatterPlot',
    'The interval is a plain min–max — use RangePlot',
    'Group labels are long — use BoxPlotH',
    'Only the central value matters — use ColumnChart',
  ],
  alternatives: [
    { name: 'BoxPlotH', when: 'group labels are long' },
    { name: 'RangePlot', when: 'showing a plain min–max interval rather than quartiles' },
    { name: 'ScatterPlot', when: 'individual records should stay visible' },
  ],
  requiredProps: ['id', 'data', 'x', 'y'],
  example: `<BoxPlotV
  id="salary-by-band"
  className="w-full h-64"
  data={data}
  x={{ key: 'name' }}
  y={{
    minKey: 'min',
    maxKey: 'max',
    midKey: 'mid',
    boxStart: 'firstQuartile',
    boxEnd: 'lastQuartile',
    min: 0,
  }}
/>`,
  storybook: 'Ranges/BoxPlotV',
  variants: [
    {
      kind: 'chart-type',
      name: 'Binned box plot (vertical)',
      aliases: ['vertical box plot from raw data', 'distribution by band'],
      summary:
        'Bins a continuous field into groups along the x axis and computes each group’s quartiles from the raw rows.',
      how: 'Set `bin` on the `x` (category) config and pass `valueKey` naming the field to summarise. The statistic keys on `y` are then computed internally and can be omitted. Use `bin.thresholds` for explicit band edges.',
      useWhen: [
        'The data is raw observations and no statistics have been computed upstream',
        'The grouping field is continuous, e.g. salary distribution by age band',
      ],
      avoidWhen: [
        'Groups are already categorical — pass them directly rather than binning',
        'The statistics are already computed, in which case name the keys directly',
      ],
      example: `<BoxPlotV
  id="salary-by-age"
  className="w-full h-64"
  data={rawRows}
  valueKey="salary"
  x={{ key: 'age', bin: { count: 5 }, axis: { label: 'Age Group' } }}
  y={{ min: 0, axis: { label: 'Salary' } }}
/>`,
    },
    { kind: 'option', name: 'Per-row colours', how: 'Put a `className` field on each row to colour boxes individually.' },
  ],
};

export default meta;

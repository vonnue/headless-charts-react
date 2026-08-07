import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'WaffleChart',
  aliases: ['heatmap', 'categorical heatmap', 'matrix chart', 'grid chart', 'tile chart'],
  category: 'distribution',
  summary:
    'A grid of cells indexed by two categorical axes, with a third value encoded as cell colour — a heatmap.',
  intents: ['correlation', 'distribution', 'composition'],
  data: {
    form: 'records',
    encodings: [
      {
        prop: 'x',
        role: 'category',
        required: true,
        description: 'Key whose unique values become columns. Set `bin` to group a continuous field instead.',
      },
      {
        prop: 'y',
        role: 'category',
        required: true,
        description: 'Key whose unique values become rows. Set `bin` to group a continuous field instead.',
      },
      {
        prop: 'color',
        role: 'color',
        required: true,
        description:
          'Key holding the cell value, plus a D3 sequential `scale` (e.g. `interpolateBlues`) or a `classNameMap` for discrete colours.',
      },
    ],
    rowCount: { ideal: [20, 500], max: 2000, note: 'One record per (x, y) cell.' },
  },
  useWhen: [
    'Two categorical dimensions cross and a magnitude sits at each intersection, e.g. month by year',
    'The pattern across the whole grid matters more than any single value',
    'Cyclical structure should be visible, such as seasonality down rows and drift across columns',
    'Raw continuous data needs binning on one or both axes — set `x.bin`/`y.bin` and cells show counts',
  ],
  avoidWhen: [
    'Precise values must be read off — colour is the least precise encoding; use a table or BarChart',
    'One axis is continuous and unbinned — use ScatterPlot',
    'There are only a few categories, where a grid is overkill — use ColumnChart',
    'The grid would be mostly empty — sparse heatmaps read as noise',
  ],
  alternatives: [
    { name: 'ScatterPlot', when: 'axes are continuous measures rather than categories' },
    { name: 'ColumnChart', when: 'only one categorical dimension is involved' },
    { name: 'PieChart', when: 'showing part-to-whole for a single set of categories' },
  ],
  requiredProps: ['id', 'data', 'x', 'y', 'color'],
  example: `<WaffleChart
  id="temps-by-month"
  className="w-full h-64"
  data={data}
  x={{ key: 'year', axis: { location: 'bottom', label: 'Year' } }}
  y={{ key: 'month', axis: { location: 'left', label: 'Month' } }}
  color={{ key: 'temperature', scale: interpolateRdYlGn }}
/>`,
  storybook: 'Distribution/WaffleChart/Intro',
  variants: [
    {
      kind: 'chart-type',
      name: 'Calendar heatmap',
      aliases: ['month-year heatmap', 'seasonality chart', 'activity heatmap'],
      summary:
        'A heatmap with time units on both axes — months down, years across — so seasonal cycles and long-run drift are visible at once.',
      how: 'Map the finer time unit to `y` and the coarser to `x`, then colour by the measure. Use a diverging scale such as `interpolateRdYlGn` for values with a meaningful middle.',
      useWhen: [
        'The data is one value per period over several cycles, e.g. monthly temperature across years',
        'Both the within-year pattern and the across-year trend need to be readable in one view',
      ],
      avoidWhen: [
        'Only the trend matters, with no cyclical structure — use LineChart',
        'Periods are missing, which leaves holes that read as data rather than absence',
      ],
      example: `<WaffleChart
  id="temps-calendar"
  className="w-full h-64"
  data={data}
  x={{ key: 'year', axis: { location: 'bottom', label: 'Year' } }}
  y={{ key: 'month', axis: { location: 'left', label: 'Month' } }}
  color={{ key: 'temperature', scale: interpolateRdYlGn }}
/>`,
    },
    {
      kind: 'chart-type',
      name: 'Binned 2D histogram',
      aliases: ['binned heatmap', 'two-dimensional histogram'],
      summary:
        'Groups raw continuous values into ranges on both axes and colours each cell by how many records fall in it.',
      how: 'Set `bin` on `x` and/or `y`; each cell then shows the count for that (xBin, yBin) pair rather than a value from the data.',
      useWhen: [
        'Both axes are continuous and the joint distribution is the question',
        'Point-level detail is unnecessary or would overplot',
      ],
      avoidWhen: [
        'Individual records must stay identifiable — use ScatterPlot',
        'One axis is already categorical, in which case bin only the other',
      ],
      example: `<WaffleChart
  id="joint-distribution"
  className="w-full h-64"
  data={rawRows}
  x={{ key: 'height', bin: { count: 8 } }}
  y={{ key: 'weight', bin: { count: 8 } }}
  color={{ key: 'count', scale: interpolateBlues }}
/>`,
    },
    { kind: 'option', name: 'Discrete colours', how: 'Use `color.classNameMap` instead of `color.scale` to map values to CSS classes.' },
    { kind: 'option', name: 'Rounded cells', how: 'Set `rx` for rounded corners and `gap` for spacing between cells.' },
  ],
};

export default meta;

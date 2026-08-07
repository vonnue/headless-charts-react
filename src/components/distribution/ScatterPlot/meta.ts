import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'ScatterPlot',
  aliases: ['scatter chart', 'scatter graph', 'xy plot', 'correlation plot'],
  category: 'distribution',
  summary:
    'One point per record positioned by two measures, revealing correlation, clusters and outliers.',
  intents: ['correlation', 'distribution'],
  data: {
    form: 'records',
    encodings: [
      { prop: 'x', role: 'quantitative', required: true, description: 'Numeric key for the horizontal position.' },
      { prop: 'y', role: 'quantitative', required: true, description: 'Numeric key for the vertical position.' },
      {
        prop: 'color',
        role: 'color',
        required: false,
        description: 'Categorical key plus a `classNameMap` to colour points by group.',
      },
      {
        prop: 'size',
        role: 'size',
        required: false,
        description: 'Numeric key plus `min`/`max` radius to encode a third measure as bubble size.',
      },
      {
        prop: 'shape',
        role: 'shape',
        required: false,
        description: 'Second categorical key plus a `shapeMap`, useful for accessibility alongside colour.',
      },
    ],
    rowCount: { ideal: [20, 2000], max: 10000, note: 'Past a few thousand points, bin into a heatmap.' },
  },
  useWhen: [
    'The question is whether and how two measures move together',
    'Outliers or clusters need to be visible as individual records',
    'Up to five dimensions must share one plot — x, y, size, colour and shape',
    'Points should be joined in data order to show a path over time — set `connect.enabled`',
    'Point density matters more than individual records — set `x.bin` or `y.bin` for a binned heatmap',
  ],
  avoidWhen: [
    'One axis is categorical rather than numeric — use ColumnChart or a lollipop chart',
    'There are only a handful of records — a table or bar chart communicates more directly',
    'Overplotting hides the pattern — switch to the binned heatmap mode or use WaffleChart',
    'The x axis is time and the sequence is the point — use LineChart',
  ],
  alternatives: [
    { name: 'WaffleChart', when: 'both axes are categorical or binned and density is the message' },
    { name: 'LineChart', when: 'x is time and the sequence matters' },
    { name: 'BoxPlotV', when: 'comparing the spread of a measure across groups rather than two measures' },
  ],
  requiredProps: ['id', 'data', 'x', 'y'],
  example: `<ScatterPlot
  id="gdp-vs-power"
  className="w-full h-64"
  data={data}
  x={{ key: 'gdp' }}
  y={{ key: 'purchasing_power' }}
  color={{ key: 'continent', classNameMap: { Asia: 'fill-red-600', Europe: 'fill-blue-600' } }}
/>`,
  storybook: 'Distribution/ScatterPlot/Intro',
  variants: [
    {
      kind: 'chart-type',
      name: 'Bubble chart',
      aliases: ['bubble plot', 'proportional symbol chart'],
      summary:
        'A scatter plot whose point radius encodes a third measure, showing three quantities at once.',
      how: 'Add `size={{ key: "population", min: 2, max: 20 }}`. Radius is scaled between `min` and `max` pixels.',
      useWhen: [
        'A third numeric dimension matters — classically GDP against life expectancy sized by population',
        'The relative weight of each point should temper how the x/y pattern is read',
      ],
      avoidWhen: [
        'The third measure needs reading precisely — area is judged poorly; use colour or a second chart',
        'Points are dense enough that large bubbles would occlude each other',
      ],
      example: `<ScatterPlot
  id="gdp-bubbles"
  className="w-full h-64"
  data={data}
  x={{ key: 'gdp' }}
  y={{ key: 'life_expectancy' }}
  size={{ key: 'population', min: 3, max: 24 }}
  color={{ key: 'continent', classNameMap: { Asia: 'fill-red-600' } }}
/>`,
    },
    {
      kind: 'chart-type',
      name: 'Connected scatterplot',
      aliases: ['connected scatter', 'path plot', 'trajectory plot'],
      summary:
        'A scatter plot whose points are joined in data order, tracing the path two measures took together.',
      how: 'Set `connect={{ enabled: true, className: "stroke-gray-400" }}`. Points join in the order the data is given, so sort it first.',
      useWhen: [
        'Two measures evolve together over time and the trajectory is the story',
        'Loops or reversals in the relationship should be visible, which a plain scatter hides',
      ],
      avoidWhen: [
        'The data has no meaningful order — the connecting line invents a sequence that does not exist',
        'Only one measure changes over time; use LineChart',
      ],
      example: `<ScatterPlot
  id="phillips-curve"
  className="w-full h-64"
  data={sortedByYear}
  x={{ key: 'unemployment' }}
  y={{ key: 'inflation' }}
  connect={{ enabled: true, className: 'stroke-gray-400' }}
/>`,
    },
    {
      kind: 'chart-type',
      name: 'Density heatmap',
      aliases: ['2d histogram', 'binned scatter plot', 'density plot'],
      summary:
        'Bins points into a grid and colours each cell by how many fell into it, revealing density where individual points would overplot.',
      how: 'Set `x.bin` and/or `y.bin`. Cells show counts, coloured via `binColor.scale` with an optional `binColor.domain`.',
      useWhen: [
        'There are too many points to plot individually without them merging into a solid mass',
        'Where the data concentrates matters more than any individual record',
      ],
      avoidWhen: [
        'Outliers are the point — binning buries a single distant record in a pale cell; use a plain ScatterPlot',
        'There are few enough points to show individually',
      ],
      example: `<ScatterPlot
  id="density"
  className="w-full h-64"
  data={data}
  x={{ key: 'gdp', bin: { count: 12 } }}
  y={{ key: 'purchasing_power', bin: { count: 12 } }}
  binColor={{ scale: interpolateBlues }}
/>`,
    },
    { kind: 'option', name: 'Zooming', how: 'Set `zooming={{ enabled: true, min: 1, max: 8 }}` for scroll-to-zoom.' },
    { kind: 'option', name: 'Click handling', how: 'Pass `onClick={(event, d) => …}` to react to point selection.' },
  ],
};

export default meta;

import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'SpineChart',
  aliases: ['population pyramid', 'age-sex pyramid', 'butterfly chart', 'back-to-back bar chart'],
  category: 'linear',
  summary:
    'Bars growing outward in both directions from a shared centre axis, comparing opposing measures per category.',
  intents: ['comparison', 'composition'],
  data: {
    form: 'records',
    encodings: [
      {
        prop: 'y',
        role: 'category',
        required: true,
        description:
          'Single key for the category label. Set `axis.location: "middle"` to put labels on the spine itself, or "left"/"right" to move them aside.',
      },
      {
        prop: 'x',
        role: 'series',
        required: true,
        description:
          'Array of numeric keys, each with `direction: "left" | "right"` deciding which side of the spine it grows toward.',
      },
    ],
    seriesCount: { min: 2, ideal: [2, 4], max: 6 },
    rowCount: { ideal: [3, 20], max: 30 },
  },
  useWhen: [
    'Two groups are being contrasted on the same measure, e.g. a population pyramid by sex or this year against last',
    'The symmetry of the split is itself the message',
    'Categories share a scale and both sides should be read against the same axis',
  ],
  avoidWhen: [
    'There is no natural opposition between the measures — the mirrored layout implies one; use BarChart',
    'More than a few measures per side are needed — the spine gets crowded; use BarChart grouped',
    'The measures are parts of one whole rather than two sides — use BarChartStacked',
  ],
  alternatives: [
    { name: 'BarChart', when: 'the measures are not naturally opposed' },
    { name: 'BarChartStacked', when: 'the measures are parts of one whole' },
    { name: 'CometPlot', when: 'showing movement between two states rather than two independent measures' },
  ],
  requiredProps: ['id', 'data', 'x', 'y'],
  example: `<SpineChart
  id="population-pyramid"
  className="w-full h-64"
  data={data}
  y={{ key: 'ageGroup', axis: { location: 'middle' } }}
  x={[
    { key: 'male', direction: 'left', className: 'fill-blue-700' },
    { key: 'female', direction: 'right', className: 'fill-pink-500' },
  ]}
/>`,
  storybook: 'Linear/SpineChart',
  variants: [
    { kind: 'option', name: 'Labels aside', how: 'Set `y.axis.location` to "left" or "right" to move category labels off the spine.' },
    { kind: 'option', name: 'Centre gap', how: 'Use `margin.middle` to widen the gap between the two sides.' },
    { kind: 'option', name: 'Axis on top', how: 'Set `xAxis="top"` to move the value axis above the plot.' },
  ],
};

export default meta;

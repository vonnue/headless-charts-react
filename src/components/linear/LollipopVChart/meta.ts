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
    'The axis is continuous time — use LineChart',
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
    { kind: 'option', name: 'Fixed value range', how: 'Pass `valueMin` and `valueMax` to pin the value axis.' },
  ],
};

export default meta;

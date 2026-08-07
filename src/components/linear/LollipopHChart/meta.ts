import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'LollipopHChart',
  aliases: ['horizontal lollipop chart', 'lollipop chart', 'stem plot'],
  category: 'linear',
  summary:
    'Horizontal stems ending in a symbol, marking one value per category with far less ink than a bar.',
  intents: ['comparison', 'ranking'],
  data: {
    form: 'records',
    encodings: [
      {
        prop: 'y',
        role: 'category',
        required: true,
        description: 'Single key holding the category label for each row.',
      },
      {
        prop: 'x',
        role: 'quantitative',
        required: true,
        description: 'Single numeric key. Set `start: 0` to anchor stems at zero.',
      },
      {
        prop: 'shape',
        role: 'shape',
        required: false,
        description:
          'Symbol at the end of each stem: circle (default), diamond, triangle, square, cross, star or wye.',
      },
    ],
    seriesCount: { min: 1, max: 1, note: 'One value per category; use BarChart for multiple measures.' },
    rowCount: { ideal: [5, 30], max: 50, note: 'Lollipops stay legible where bars would look like a solid block.' },
  },
  useWhen: [
    'There are many categories and a wall of bars would look heavy',
    'The exact value point matters more than the magnitude-as-area a bar implies',
    'Category labels are long enough to need horizontal orientation',
    'Values are clustered in a narrow band where bar lengths would look nearly identical',
  ],
  avoidWhen: [
    'Several measures need comparing per category — a lollipop carries one value; use BarChart',
    'The magnitude should read as accumulated quantity — bars encode that better',
    'The axis is time — use LineChart',
    'A vertical layout is wanted — use LollipopVChart',
  ],
  alternatives: [
    { name: 'BarChart', when: 'multiple measures per category, or magnitude should read as area' },
    { name: 'LollipopVChart', when: 'a vertical layout fits the space better' },
    { name: 'RangePlot', when: 'each category has an interval rather than a single value' },
  ],
  requiredProps: ['id', 'data', 'x', 'y'],
  example: `<LollipopHChart
  id="scores-by-team"
  className="w-full h-64"
  data={data}
  y={{ key: 'name' }}
  x={{ key: 'value', start: 0 }}
/>`,
  storybook: 'Linear/LollipopHChart',
  variants: [
    { kind: 'option', name: 'Custom symbol', how: 'Pass `shape="diamond"` (or star, triangle, square, cross, wye).' },
    { kind: 'option', name: 'Axis labels', how: 'Set `x.axis.label` and `y.axis.label` to title each axis.' },
    { kind: 'option', name: 'Styling', how: 'Use `classNames.classNameLines` and `classNames.classNameSymbols` to style stems and heads separately.' },
  ],
};

export default meta;

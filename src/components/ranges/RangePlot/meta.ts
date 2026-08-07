import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'RangePlot',
  aliases: ['dumbbell chart', 'dumbbell plot', 'barbell chart', 'dot plot', 'DNA chart', 'range chart'],
  category: 'ranges',
  summary:
    'A dumbbell per category: two endpoints joined by a bar, showing the interval between a low and a high value.',
  intents: ['range', 'comparison'],
  data: {
    form: 'records',
    encodings: [
      {
        prop: 'y',
        role: 'category',
        required: true,
        description: 'Key holding the category label; one range per row.',
      },
      {
        prop: 'x',
        role: 'value',
        required: true,
        description:
          'Config naming the interval endpoints: `minKey` and `maxKey`. Pin the axis with `start` and `end`.',
      },
    ],
    rowCount: { ideal: [3, 25], max: 40 },
  },
  useWhen: [
    'Each category has a low and a high value and the gap between them is the message',
    'Comparing spans across categories, e.g. min and max temperature per city',
    'Showing a before-and-after pair where direction does not need emphasis',
    'A box plot would overstate the statistical rigour of the data',
  ],
  avoidWhen: [
    'Direction of movement matters — use CometPlot, whose tapered tail shows which way the value moved',
    'The interval is a statistical summary with quartiles — use BoxPlotH',
    'Only one value per category exists — use LollipopHChart',
    'The endpoints are times rather than numbers — use TimeLineChart',
  ],
  alternatives: [
    { name: 'CometPlot', when: 'the direction of movement between the two values matters' },
    { name: 'BoxPlotH', when: 'the interval is a quartile summary' },
    { name: 'LollipopHChart', when: 'there is a single value per category' },
  ],
  requiredProps: ['id', 'data', 'x', 'y', 'shape'],
  example: `<RangePlot
  id="temp-range"
  className="w-full h-64"
  data={data}
  shape="circle"
  y={{ key: 'label', axis: { location: 'left' } }}
  x={{ minKey: 'minTemp', maxKey: 'maxTemp', start: 0, end: 100 }}
/>`,
  storybook: 'Ranges/RangePlot',
  variants: [
    { kind: 'option', name: 'Styling', how: 'Use `classNameData` to style the connecting bar and endpoints.' },
    { kind: 'option', name: 'Fixed axis', how: 'Set `x.start` and `x.end` to keep the scale stable across renders.' },
  ],
};

export default meta;

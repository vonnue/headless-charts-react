import { ChartMeta } from '@/catalog/types';

// Placeholder wording — Chart Catalog Editor refines.
const meta: ChartMeta = {
  name: 'TreemapChart',
  aliases: ['treemap', 'squarified treemap', 'rectangular tree map'],
  category: 'distribution',
  summary:
    'Nested rectangles whose area encodes value, showing a hierarchical part-to-whole with groups as labelled blocks.',
  intents: ['composition'],
  data: {
    form: 'hierarchy',
    encodings: [
      {
        prop: 'data',
        role: 'link',
        required: true,
        description:
          'One nested root object or a forest (array of roots); children under `children.key` (default `"children"`).',
      },
      {
        prop: 'value',
        role: 'quantitative',
        required: true,
        description: 'Leaf size key. Internal nodes are the sum of their leaves; their own values are ignored.',
      },
      {
        prop: 'name',
        role: 'label',
        required: false,
        description: 'Display-name key. Default `"name"`.',
      },
      {
        prop: 'classNameMap',
        role: 'color',
        required: false,
        description:
          'Optional class per top-level group (see `colorBy`). Colour names the group; area encodes magnitude.',
      },
    ],
    rowCount: { ideal: [4, 30], max: 50, note: 'Leaves. Past ~50 cells labels drop out and areas get hard to compare.' },
  },
  useWhen: [
    'A whole splits into nested groups and both the group totals and their parts matter',
    'There are too many parts for a pie, and the hierarchy explains them',
  ],
  avoidWhen: [
    'A flat whole with about 6 or fewer parts — use PieChart',
    'Individual units should be countable — use WaffleChart',
    'Composition changes over time — use AreaChart or ColumnChartStacked',
  ],
  alternatives: [
    { name: 'PieChart', when: 'a flat part-to-whole with few slices' },
    { name: 'WaffleChart', when: 'cells should be countable units' },
  ],
  requiredProps: ['id', 'data', 'value'],
  example: `<TreemapChart
  id="budget"
  className="w-full h-96"
  data={tree}
  value={{ key: 'amount', className: 'fill-slate-300 stroke-white' }}
  classNameMap={{ Ops: 'fill-slate-500', Growth: 'fill-slate-400' }}
  labels={{ name: true, value: true }}
/>`,
  storybook: 'Distribution/TreemapChart/Intro',
  variants: [
    { kind: 'option', name: 'Leaves only', how: 'Set `leavesOnly` to drop the group headers and paint leaf cells only.' },
    { kind: 'option', name: 'Tiling', how: 'Set `tile.type` to `squarify` (default), `binary`, `slice`, `dice`, `sliceDice` or `resquarify`.' },
    { kind: 'option', name: 'Percent labels', how: 'Set `labels.percent` to `"ofParent"`, `"ofRoot"` or `"both"`.' },
  ],
};

export default meta;

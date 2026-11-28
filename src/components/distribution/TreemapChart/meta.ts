import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'TreemapChart',
  aliases: ['treemap', 'squarified treemap', 'rectangular tree map'],
  category: 'distribution',
  summary:
    'Nested rectangles whose area encodes value, showing a hierarchical part-to-whole with groups as labelled blocks.',
  intents: ['composition'],
  data: {
    form: ['hierarchy', 'records'],
    encodings: [
      {
        prop: 'data',
        role: 'link',
        required: true,
        description:
          'Either one nested root object or a forest (children under `children.key`, default `"children"`), or flat rows grouped by `levels` (category keys, outer to inner) with `value.key` summed per group.',
      },
      {
        prop: 'children',
        role: 'link',
        required: false,
        description: 'Optional override for the nested-children key. Default `{ key: "children" }`. Ignored when `levels` is set.',
      },
      {
        prop: 'levels',
        role: 'category',
        required: false,
        description:
          'Flat mode: outer-to-inner category keys. Rows sharing a path are summed; rows with a missing category are grouped under `(missing)`.',
      },
      {
        prop: 'value',
        role: 'quantitative',
        required: true,
        description:
          'Leaf size key. Internal nodes are the sum of their descendant leaves; a value on an internal node is ignored.',
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
          'Optional class per group (see `colorBy`, default top-level). Colour names the group; area encodes magnitude — do not map colour to size.',
      },
    ],
    rowCount: {
      ideal: [4, 30],
      max: 50,
      note: 'Leaves. Past ~50 cells labels drop out and areas get hard to compare.',
    },
  },
  useWhen: [
    'A whole splits into nested groups and both the group totals and their parts matter',
    'There are too many parts for a pie, and the hierarchy is what explains them',
    'Leaf areas should be comparable at a glance — set `leavesOnly` if group headers are noise',
    'The data is a flat table with category columns and one measure',
  ],
  avoidWhen: [
    'A flat whole with about 6 or fewer parts — use PieChart',
    'Individual units should be countable cells — use WaffleChart',
    'A flat ranked comparison of leaves with no nesting — use BarChart',
    'Composition changes over time — use AreaChart or BarChart with `stacking`',
    'Colour is used to encode magnitude — area already encodes value; keep `classNameMap` as group identity only',
    'Volume moves between categories rather than a static nested split — use SankeyChart',
    'A radial hierarchy is preferred — use SunburstChart; do not stretch PizzaChart (`sunburst-style profile`) into that role',
  ],
  alternatives: [
    { name: 'PieChart', when: 'a flat part-to-whole with few slices' },
    { name: 'WaffleChart', when: 'cells should be countable units' },
    { name: 'BarChart', when: 'a flat ranked comparison of the leaves with no nesting' },
    { name: 'SankeyChart', when: 'volume moves between categories rather than a static nested split' },
    { name: 'AreaChart', when: 'composition changes over time' },
    { name: 'SunburstChart', when: 'a radial hierarchy is preferred' },
    { name: 'PizzaChart', when: 'a single-entity radial profile, not a hierarchy' },
  ],
  requiredProps: ['id', 'data', 'value'],
  example: `<TreemapChart
  id="budget"
  className="w-full h-96"
  data={data}
  value={{ key: 'amount', className: 'fill-slate-300 stroke-white stroke-1' }}
  classNameMap={{ Ops: 'fill-slate-500', Growth: 'fill-slate-400' }}
  labels={{ name: true, value: true, percent: 'ofParent' }}
  title="Budget by group"
/>`,
  storybook: 'Distribution/TreemapChart/Intro',
  variants: [
    {
      kind: 'option',
      name: 'Leaves only',
      how: 'Set `leavesOnly` to drop the group headers and paint leaf cells only (`paddingTop` then defaults to 0).',
    },
    {
      kind: 'option',
      name: 'Tiling',
      how: 'Set `tile.type` to `squarify` (default), `binary`, `slice`, `dice`, `sliceDice` or `resquarify`; `tile.ratio` applies to squarify/resquarify.',
    },
    {
      kind: 'option',
      name: 'Percent labels',
      how: 'Set `labels.percent` to `"ofParent"`, `"ofRoot"` or `"both"`; a zero or missing divisor prints `n/a`.',
    },
    {
      kind: 'option',
      name: 'Flat rows (`levels`)',
      how: 'Set `levels` to the category keys, outer to inner (e.g. `["region", "country", "city"]`), and pass an array of rows; `value.key` is summed per path.',
    },
  ],
};

export default meta;

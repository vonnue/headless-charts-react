import { ChartMeta } from '@/catalog/types';

// Placeholder wording — Chart Catalog Editor refines.
const meta: ChartMeta = {
  name: 'SunburstChart',
  aliases: ['sunburst', 'sunburst chart', 'sunburst diagram', 'radial treemap', 'multi-level pie chart'],
  category: 'distribution',
  summary:
    'Concentric rings for a hierarchical part-to-whole: each depth is a ring and each node’s angle encodes its value, from the root at the centre to the leaves.',
  intents: ['composition'],
  data: {
    form: 'hierarchy',
    encodings: [
      {
        prop: 'value',
        role: 'quantitative',
        required: true,
        description: 'Leaf size key. Internal nodes are the sum of their leaves; their own values are ignored.',
      },
      { prop: 'name', role: 'label', required: false, description: 'Display-name key. Default `"name"`.' },
      {
        prop: 'children',
        role: 'link',
        required: false,
        description: 'Nested children key (default `"children"`). `data` is one root object or a forest.',
      },
      {
        prop: 'classNameMap',
        role: 'color',
        required: false,
        description: 'Optional class per top-level group (see `colorBy`). Colour names the group; angle encodes magnitude.',
      },
    ],
    rowCount: { ideal: [4, 40], max: 100, note: 'Leaves. Deep or wide trees need `rings` or click-to-zoom.' },
  },
  useWhen: [
    'A hierarchical part-to-whole with 2–4 levels, where the path from the centre outward is the story',
    'Readers should drill down into deeper levels — set `zoom`',
  ],
  avoidWhen: [
    'Sizes of many leaves must be compared precisely — use TreemapChart; area reads better than angle',
    'A flat whole with about 6 or fewer parts — use PieChart',
    "One entity's metrics on a radial profile — use PizzaChart",
    'Composition changes over time — use AreaChart',
  ],
  alternatives: [{ name: 'PieChart', when: 'a flat part-to-whole with few slices' }],
  requiredProps: ['id', 'data', 'value'],
  example: `<SunburstChart
  id="files"
  className="w-full h-96"
  data={tree}
  value={{ key: 'size', className: 'fill-slate-300 stroke-white' }}
  classNameMap={{ src: 'fill-sky-400', docs: 'fill-amber-300' }}
  labels={{ name: true }}
/>`,
  storybook: 'Distribution/SunburstChart/Intro',
  variants: [
    { kind: 'option', name: 'Donut hole', how: 'Set `innerRadius` (a fraction, e.g. `0.3`) to drop the centre disc.' },
    { kind: 'option', name: 'Partial angle', how: 'Set `startAngle` / `endAngle` in radians, e.g. `-Math.PI / 2` to `Math.PI / 2` for a half sunburst.' },
    { kind: 'option', name: 'Click-to-zoom', how: 'Set `zoom` (or `zoom={{ onChange }}`) to drill into an arc; click the centre or press Escape to zoom out.' },
    { kind: 'option', name: 'Visible rings', how: 'Set `rings` to show that many levels below the focus; deeper levels appear when zoomed.' },
    { kind: 'option', name: 'Percent labels', how: 'Set `labels.percent` to `"ofParent"`, `"ofRoot"` or `"both"`.' },
  ],
};

export default meta;

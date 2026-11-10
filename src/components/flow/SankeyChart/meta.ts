import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'SankeyChart',
  aliases: ['sankey', 'sankey diagram', 'sankey chart', 'flow diagram', 'alluvial diagram'],
  category: 'flow',
  summary:
    'Weighted flows between nodes arranged in layered columns; node size and link width share one scale, so how much moves from where to where is the story.',
  intents: ['connection', 'composition'],
  data: {
    form: 'graph',
    encodings: [
      {
        prop: 'links',
        role: 'link',
        required: true,
        description:
          'Array of flow records with source, target and value (keys set by `linkDef`). Duplicate source/target pairs are summed; the graph must be acyclic.',
      },
      {
        prop: 'linkDef.valueKey',
        role: 'quantitative',
        required: false,
        description:
          'Field holding the flow volume (default `value`). Link width and node size encode it on one shared scale; zero flows are skipped, negative ones dropped.',
      },
      {
        prop: 'nodes',
        role: 'category',
        required: false,
        description:
          'Optional node records for labels and tooltip data. When omitted, nodes are inferred from link endpoints; when given, links to unknown ids are dropped.',
      },
      {
        prop: 'nodeDef.idKey',
        role: 'label',
        required: false,
        description: 'Field on each node holding its id (default `id`); links reference this value.',
      },
      {
        prop: 'classNameMap',
        role: 'color',
        required: false,
        description:
          '`nodeDef.classNameMap` (fill) and `linkDef.classNameMap` (stroke), keyed by node id. Colour names the node; it never encodes the flow value.',
      },
    ],
    rowCount: {
      ideal: [4, 20],
      max: 30,
      note: 'Nodes. Past ~30 nodes columns get crowded and labels collide; aggregate first.',
    },
  },
  useWhen: [
    'Volume moves between stages or categories and both the totals and the splits matter, e.g. energy, budget or user-journey flows',
    'Flows pass through intermediate nodes in layered steps (source → conversion → use)',
    'Imbalance at a node (in ≠ out) should stay visible',
  ],
  avoidWhen: [
    'It is one ordered path with drop-off — use FunnelChart',
    'The relationships matter but there are no volumes — use Network',
    'Flows loop back (cycles) — use Network, or aggregate the data into an acyclic graph first',
    'There are more than ~30 nodes — aggregate first',
    'The parts are one whole with no flow between them — use TreemapChart or PieChart',
  ],
  alternatives: [
    { name: 'Network', when: 'topology without volumes, or flows with cycles' },
    { name: 'PieChart', when: 'parts of one whole with no flow between them' },
  ],
  requiredProps: ['id', 'links'],
  example: `<SankeyChart
  id="energy"
  className="w-full h-96"
  links={flows}
  nodes={sectors}
  nodeDef={{ idKey: 'id', labelKey: 'name', className: 'fill-slate-500',
             classNameMap: { Coal: 'fill-stone-600', Solar: 'fill-amber-400' } }}
  linkDef={{ valueKey: 'twh', className: 'stroke-slate-300 [stroke-opacity:0.5]',
             classNameMap: { Coal: 'stroke-stone-400', Solar: 'stroke-amber-300' } }}
  labels={{ name: true, value: true }}
  tooltip={{ className: 'bg-white text-xs p-2 shadow' }}
  title="Energy flows, 2025 (TWh)"
/>`,
  storybook: 'Flow/SankeyChart/Intro',
  variants: [
    {
      kind: 'option',
      name: 'Vertical',
      how: 'Set `orientation="vertical"` to run columns top → bottom.',
    },
    {
      kind: 'option',
      name: 'Alignment',
      how: 'Set `align` to `"justify"` (default, sinks in the last column), `"left"`, `"right"` or `"center"`.',
    },
    {
      kind: 'option',
      name: 'Input order',
      how: 'Set `nodeSort="input"` to keep node input order in each column instead of relaxing the layout.',
    },
    {
      kind: 'option',
      name: 'Path highlighting',
      how: 'Set `highlight="path"` to mark every upstream and downstream node and link on hover through `data-highlighted` / `data-dimmed`; `false` turns highlighting off.',
    },
    {
      kind: 'option',
      name: 'Value labels',
      how: 'Set `labels.value: true` to append each node value; `format` sets the number format.',
    },
  ],
};

export default meta;

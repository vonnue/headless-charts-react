import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'Network',
  aliases: ['network graph', 'node-link diagram', 'force-directed graph', 'graph chart', 'relationship map'],
  category: 'flow',
  summary:
    'Draws nodes and the edges between them, laid out by force simulation or pinned to x/y scales.',
  intents: ['connection'],
  data: {
    form: 'graph',
    encodings: [
      {
        prop: 'nodes',
        role: 'category',
        required: true,
        description: 'Array of node records. Passed separately from `data`.',
      },
      {
        prop: 'edges',
        role: 'link',
        required: true,
        description: 'Array of edge records referencing nodes by id.',
      },
      {
        prop: 'nodeDef.idKey',
        role: 'label',
        required: true,
        description: 'Field on each node holding its unique id; edges reference this value.',
      },
      {
        prop: 'edgeDef.sourceKey',
        role: 'link',
        required: true,
        description: 'Field on each edge holding the source node id.',
      },
      {
        prop: 'edgeDef.targetKey',
        role: 'link',
        required: true,
        description: 'Field on each edge holding the target node id.',
      },
    ],
    rowCount: { ideal: [10, 300], max: 1000, note: 'Nodes. Large graphs need filtering or aggregation first.' },
  },
  useWhen: [
    'The relationships between entities are the subject, not the entities’ values',
    'Clusters, hubs or isolated nodes should emerge from the layout',
    'Nodes should be positioned by real measures rather than the simulation — set `nodeDef.x` and `nodeDef.y`',
    'The graph is small enough to be explored interactively — enable `dragging` and `zooming`',
  ],
  avoidWhen: [
    'The relationships are strictly hierarchical — a tree layout communicates depth better than a force graph',
    'The data has no explicit edges; a network cannot be inferred from records alone',
    'Node values are the real question — use BarChart or ScatterPlot',
    'The graph is dense enough to become a hairball — aggregate or filter first',
  ],
  alternatives: [
    { name: 'ScatterPlot', when: 'entities have two measures and no meaningful links' },
    { name: 'WaffleChart', when: 'the relationships form a matrix better read as a heatmap' },
  ],
  requiredProps: ['id', 'nodes', 'edges', 'nodeDef', 'edgeDef'],
  example: `<Network
  id="team-graph"
  className="w-full h-96"
  nodes={nodes}
  edges={edges}
  nodeDef={{ idKey: 'name' }}
  edgeDef={{ sourceKey: 'from', targetKey: 'to' }}
/>`,
  storybook: 'Flow/Network/Intro',
  variants: [
    { kind: 'option', name: 'Fixed positions', how: 'Set `nodeDef.x` and `nodeDef.y` to place nodes on real scales instead of by simulation.' },
    { kind: 'option', name: 'Dragging', how: 'Set `dragging={{ enabled: true, snapToNewPosition: true }}` to let nodes be repositioned and pinned.' },
    { kind: 'option', name: 'Encoding', how: 'Use `nodeDef.size`, `nodeDef.shape` and `nodeDef.classNameKey` with `classNameMap` to encode node attributes.' },
    { kind: 'option', name: 'Curved edges', how: 'Set `edgeDef.curve` and size edges with `edgeDef.size`.' },
  ],
};

export default meta;

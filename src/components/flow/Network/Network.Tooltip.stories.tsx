import preview from '../../../../.storybook/preview';

import Network from '.';
import edges from './edges.json';
import nodes from './nodes.json';

const meta = preview.meta({
  title: 'Flow/Network/Tooltip',
  tags: ['autodocs'],
  component: Network,
  args: {
    nodes,
    edges,
  },
});

export const NodeTooltip = meta.story({
  args: {
    id: 'tooltip-only-for-nodes',
    nodeDef: {
      idKey: 'name',
      classNameKey: 'gender',
      classNameMap: {
        male: 'fill-blue-800',
        female: 'fill-pink-400',
      },
      tooltip: {},
    },
  },
});

export const StyleNodeTooltip = meta.story({
  args: {
    ...NodeTooltip.input.args,
    id: `style-node-tooltip-with-classname-prop`,
    nodeDef: {
      idKey: 'id',
      tooltip: {
        className: 'bg-gray-100 text-gray-900 p-2 rounded',
      },
    },
  },
});

export const NodeTooltipCustomKeys = meta.story({
  args: {
    id: 'node-tooltip-custom-keys',
    nodeDef: {
      idKey: 'id',
      tooltip: {
        className: 'bg-gray-100 text-gray-900 p-2 rounded',
        keys: ['name', 'age', 'gender'],
      },
    },
  },
});

export const NodeTooltipCustomHTML = meta.story({
  args: {
    id: `node-tooltip-custom-html`,
    nodeDef: {
      idKey: 'id',
      tooltip: {
        html: (node) => `
          <div class="bg-gray-100 text-gray-900 p-2 rounded">
            <div class="font-bold ${
              node.gender === 'male' ? 'text-blue-300' : 'text-pink-300'
            }">${node.name}</div>
            <div>${node.age} years old</div>
            `,
      },
    },
  },
});

export const EdgeTooltip = meta.story({
  args: {
    id: 'edge-tooltip',
    nodeDef: {
      idKey: 'id',
      tooltip: {},
    },
    edgeDef: {
      sourceKey: 'from',
      targetKey: 'to',
      tooltip: {},
    },
  },
});

export const EdgeTooltipStyleWithClassName = meta.story({
  args: {
    id: 'edge-tooltip-style-with-classname',
    nodeDef: {
      idKey: 'id',
      tooltip: {},
    },
    edgeDef: {
      sourceKey: 'from',
      targetKey: 'to',
      tooltip: {
        className: 'bg-gray-100 text-gray-900 p-2 rounded',
      },
    },
  },
});

export const EdgeTooltipCustomKeys = meta.story({
  args: {
    id: 'edge-tooltip-custom-keys',
    nodeDef: {
      idKey: 'id',
      tooltip: {},
    },
    edgeDef: {
      sourceKey: 'from',
      targetKey: 'to',
      tooltip: {
        keys: ['source.name', 'target.name', 'value'],
      },
    },
  },
});

export const EdgeTooltipCustomHTML = meta.story({
  args: {
    ...NodeTooltipCustomHTML.input,
    nodes,
    edges,
    id: 'edge-tooltip-custom-html',
    edgeDef: {
      sourceKey: 'from',
      targetKey: 'to',
      size: {
        key: 'value',
        min: 1,
        max: 4,
        default: 1,
      },
      tooltip: {
        html: (edge) => `
          <div class="bg-gray-100 text-gray-900 p-2 rounded">
            <div class="font-bold">${edge.source.name} to ${edge.target.name}</div>
            <div>${edge.value}</div>
            `,
      },
    },
  },
});

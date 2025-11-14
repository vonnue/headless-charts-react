import preview from '../../../../.storybook/preview';

import Network from '.';
import edges from './edges.json';
import nodes from './nodes.json';

const meta = preview.meta({
  title: 'Flow/Network/Intro',
  tags: ['autodocs'],
  component: Network,
  argTypes: {},
  args: {
    nodes,
    edges,
  },
});

export const Default = meta.story({
  args: {
    id: 'simple-network',
    nodeDef: {
      idKey: 'name',
    },
    edgeDef: {
      sourceKey: 'from',
      targetKey: 'to',
    },
  },
});

export const Styling = meta.story({
  args: {
    id: 'styled-network',
    className: 'bg-gray-100 rounded-lg',
    nodeDef: {
      idKey: 'name',
      classNameKey: 'gender',
      classNameMap: {
        male: 'fill-blue-800',
        female: 'fill-pink-400',
      },
    },
    edgeDef: {
      sourceKey: 'from',
      targetKey: 'to',
      classNameKey: 'type',
      classNameMap: {
        friend: 'stroke-gray-700',
        acquaintance: 'stroke-gray-300',
      },
    },
  },
});

export const NodeSize = meta.story({
  args: {
    ...Styling.input.args,
    id: 'node-size-network',
    nodeDef: {
      ...Styling.input?.args?.nodeDef,
      idKey: 'name',
      size: {
        key: 'age',
        min: 40,
        max: 100,
      },
    },
  },
});

export const EdgeSize = meta.story({
  args: {
    ...NodeSize.input.args,
    id: 'edge-size-network',
    edgeDef: {
      sourceKey: 'from',
      targetKey: 'to',
      size: {
        key: 'value',
        min: 1,
        max: 3,
        default: 1,
      },
    },
  },
});

export const WithZooming = meta.story({
  args: {
    ...EdgeSize.input.args,
    id: 'zoom-network',
    zooming: {
      enabled: true,
      min: 0.5,
      max: 2,
    },
  },
});

export const WithShapeMap = meta.story({
  args: {
    ...EdgeSize.input.args,
    id: 'shape-map-network',
    nodeDef: {
      ...EdgeSize.input.args?.nodeDef,
      idKey: 'name',
      shape: {
        key: 'isMarried',
        map: {
          yes: 'square',
          no: 'star',
        },
      },
    },
  },
});

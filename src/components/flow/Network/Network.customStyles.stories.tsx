import preview from '../../../../.storybook/preview';
import './style.css';

import Network from '.';
import edges from './edges.json';
import nodes from './nodes.json';

const meta = preview.meta({
  title: 'Flow/Network/CustomStyles',
  component: Network,
  tags: ['autodocs'],
  args: {
    nodes,
    edges,
  },
});

export const Default = meta.story({
  args: {
    id: 'custom-styles-network',
    nodeDef: {
      idKey: 'name',
    },
    edgeDef: {
      sourceKey: 'from',
      targetKey: 'to',
      className: 'running',
    },
  },
});

export const CurvedEdges = meta.story({
  args: {
    id: 'curved-network',
    nodeDef: {
      idKey: 'name',
    },
    edgeDef: {
      sourceKey: 'from',
      targetKey: 'to',
      className: 'fill-none stroke-green-500',
      curve: 1,
    },
  },
});

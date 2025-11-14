import preview from '../../../../.storybook/preview';

import Network from '.';
import edges from './edges.json';
import nodes from './nodes.json';

const meta = preview.meta({
  title: 'Flow/Network/Draggable',
  tags: ['autodocs'],
  component: Network,
  args: {
    nodes,
    edges,
    nodeDef: {
      idKey: 'name',
    },
    edgeDef: {
      sourceKey: 'from',
      targetKey: 'to',
    },
  },
});

export const Draggable = meta.story({
  args: {
    id: 'draggable-network',
    dragging: {
      enabled: true,
      snapToNewPosition: false,
    },
  },
});

export const DraggableSnapsToNewPosition = meta.story({
  args: {
    ...Draggable.input.args,
    id: 'draggable-snap-network',
    dragging: {
      enabled: true,
      snapToNewPosition: true,
    },
  },
});

import preview from '../../../../.storybook/preview';

import Network from '.';
import edges from './edges.json';
import nodes from './nodes.json';

const meta = preview.meta({
  title: 'Flow/Network/Fixed',
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

export const FixingPosition = meta.story({
  args: {
    id: 'fixed-network',
    nodeDef: {
      idKey: 'name',
      x: {
        key: 'xValue',
      },
      y: {
        key: 'yValue',
      },
    },
    edgeDef: {
      sourceKey: 'from',
      targetKey: 'to',
    },
  },
});

export const FixingOnlyXPosition = meta.story({
  args: {
    id: 'fixed-x-network',
    nodeDef: {
      idKey: 'name',
      x: {
        key: 'xValue',
      },
    },
    edgeDef: {
      sourceKey: 'from',
      targetKey: 'to',
    },
  },
});

export const FixingOnlyYPosition = meta.story({
  args: {
    id: 'fixed-y-network',
    nodeDef: {
      idKey: 'name',
      y: {
        key: 'yValue',
      },
    },
    edgeDef: {
      sourceKey: 'from',
      targetKey: 'to',
    },
  },
});

export const ShowAxis = meta.story({
  args: {
    id: 'fixed-network-show-axis',
    nodeDef: {
      idKey: 'name',
      x: {
        key: 'xValue',
        axis: 'bottom',
      },
      y: {
        key: 'yValue',
        axis: 'left',
      },
    },
    edgeDef: {
      sourceKey: 'from',
      targetKey: 'to',
    },
  },
});

export const ShowXAxisTop = meta.story({
  args: {
    id: 'fixed-network-show-axis-top',
    nodeDef: {
      idKey: 'name',
      x: {
        key: 'xValue',

        axis: 'top',
      },
      y: {
        key: 'yValue',
        axis: 'left',
      },
    },
    edgeDef: {
      sourceKey: 'from',
      targetKey: 'to',
    },
  },
});

export const ShowYAxisRight = meta.story({
  args: {
    id: 'fixed-network-show-axis-right',
    nodeDef: {
      idKey: 'name',
      x: {
        key: 'xValue',
        axis: 'bottom',
      },
      y: {
        key: 'yValue',
        axis: 'right',
      },
    },
    edgeDef: {
      sourceKey: 'from',
      targetKey: 'to',
    },
  },
});

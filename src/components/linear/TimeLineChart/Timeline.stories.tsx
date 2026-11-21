import preview from '../../../../.storybook/preview';
import { ResizableBox } from '../../../../.storybook/ResizableContainer';

import TimeLineChart from '.';
import data from './sample.json';

const meta = preview.meta({
  title: 'Linear/TimeLineChart/Intro',
  component: TimeLineChart,
  tags: ['autodocs'],
});

export const Default = meta.story({
  args: {
    id: 'timeline-chart',
    data,
    y: {
      key: 'exophoneNumber',
      className: 'fill-gray-100',
    },
    events: {
      startKey: 'callStartTime',
      endKey: 'callEndTime',
      isTime: true,
    },
  },
});

/**
 * Charts follow the size of their container, not only `style.width`/`style.height`.
 * Drag the bottom-right corner of the box to resize it: the chart is sized with
 * `width: 100%; height: 100%` and redraws at the new size, once per animation frame.
 */
export const ResizableContainer = meta.story({
  args: {
    ...Default.input.args,
    id: 'timeline-chart-resizable',
    style: { width: '100%', height: '100%' },
  },
  render: (args) => (
    <ResizableBox>
      <TimeLineChart {...args} />
    </ResizableBox>
  ),
});

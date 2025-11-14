import preview from '../../../../.storybook/preview';

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

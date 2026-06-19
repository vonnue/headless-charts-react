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
    className: 'w-full h-96',
    data,
    y: {
      key: 'exophoneNumber',
      className: 'fill-gray-100 dark:fill-gray-700',
    },
    events: {
      startKey: 'callStartTime',
      endKey: 'callEndTime',
      isTime: true,
    },
    margin: { top: 20, right: 20, bottom: 30, left: 110 },
  },
});

// Colour events by their completion status.
export const ColouredByStatus = meta.story({
  args: {
    id: 'timeline-chart-coloured',
    className: 'w-full h-96',
    data,
    y: {
      key: 'exophoneNumber',
      className: 'fill-gray-100 dark:fill-gray-700',
    },
    events: {
      startKey: 'callStartTime',
      endKey: 'callEndTime',
      isTime: true,
      classNameKey: 'callCompletionStatus',
      classNameMapping: {
        completed: 'fill-green-500 stroke-green-500',
        missed: 'fill-red-500 stroke-red-500',
      },
    },
    tooltip: {},
    margin: { top: 20, right: 20, bottom: 30, left: 110 },
  },
});

// Different shapes per completion status (rect for completed, circle for missed).
export const ShapesByStatus = meta.story({
  args: {
    id: 'timeline-chart-shapes',
    className: 'w-full h-96',
    data,
    y: {
      key: 'exophoneNumber',
      className: 'fill-gray-100 dark:fill-gray-700',
    },
    events: {
      startKey: 'callStartTime',
      endKey: 'callEndTime',
      isTime: true,
      shapeKey: 'callCompletionStatus',
      shapeMapping: {
        completed: 'rect',
        missed: 'circle',
      },
      classNameKey: 'callCompletionStatus',
      classNameMapping: {
        completed: 'fill-green-500 stroke-green-500',
        missed: 'fill-red-500 stroke-red-500',
      },
    },
    tooltip: {},
    margin: { top: 20, right: 20, bottom: 30, left: 110 },
  },
});

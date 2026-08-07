import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'TimeLineChart',
  aliases: ['timeline', 'event plot', 'activity timeline'],
  category: 'linear',
  summary:
    'Places discrete events and durations on a shared time axis, one lane per category.',
  intents: ['schedule', 'trend'],
  data: {
    form: 'records',
    encodings: [
      {
        prop: 'y',
        role: 'category',
        required: false,
        description: 'Key whose values become the lanes (rows) of the timeline.',
      },
      {
        prop: 'events.startKey',
        role: 'temporal',
        required: true,
        description: 'Key holding the event start. Set `events.isTime` when the values are dates.',
      },
      {
        prop: 'events.endKey',
        role: 'temporal',
        required: false,
        description: 'Key holding the event end. Omit for point events rather than spans.',
      },
      {
        prop: 'events.shapeKey',
        role: 'shape',
        required: false,
        description: 'Key selecting the mark per event via `shapeMapping` — circle, rect or line.',
      },
    ],
    rowCount: { ideal: [1, 30], max: 60, note: 'One lane per distinct y value.' },
  },
  useWhen: [
    'The data is events with timestamps rather than a measured value sampled over time',
    'Durations need to be visible as spans — pass both `startKey` and `endKey`',
    'Activity should be compared across lanes, e.g. calls per line, jobs per worker',
    'Building a Gantt-style view of overlapping work',
  ],
  avoidWhen: [
    'A continuous quantity is being tracked over time — use LineChart or AreaChart',
    'Only counts per period matter, not individual events — aggregate and use ColumnChart',
    'There is no time dimension at all — this chart has no meaning without one',
  ],
  alternatives: [
    { name: 'LineChart', when: 'tracking a measured value over time rather than discrete events' },
    { name: 'ColumnChart', when: 'event counts per period are enough' },
    { name: 'RangePlot', when: 'intervals are numeric ranges rather than moments in time' },
  ],
  requiredProps: ['id', 'data', 'events'],
  example: `<TimeLineChart
  id="call-timeline"
  className="w-full h-64"
  data={data}
  y={{ key: 'agent' }}
  events={{
    startKey: 'callStartTime',
    endKey: 'callEndTime',
    isTime: true,
  }}
/>`,
  storybook: 'Linear/TimeLineChart/Intro',
  variants: [
    {
      kind: 'chart-type',
      name: 'Gantt chart',
      aliases: ['gantt', 'schedule chart', 'project timeline', 'swimlane chart'],
      summary:
        'Draws each row’s work as a horizontal bar spanning its start and end dates, one lane per resource or task.',
      how: 'Pass both `events.startKey` and `events.endKey` with `events.isTime: true`, and set `y` to the lane key. Spans render as rects; overlapping work in a lane is visible as stacked bars.',
      useWhen: [
        'Work has a start and an end and the overlap between items is the question',
        'Scheduling, capacity or utilisation needs to be read per lane',
        'Durations differ enough that their relative length carries meaning',
      ],
      avoidWhen: [
        'Items are instants rather than spans — omit `endKey` for a point-event timeline instead',
        'Dependencies between tasks are the real subject; this chart draws no links between bars',
      ],
      example: `<TimeLineChart
  id="project-gantt"
  className="w-full h-64"
  data={tasks}
  y={{ key: 'owner' }}
  events={{
    startKey: 'start',
    endKey: 'end',
    isTime: true,
    classNameKey: 'status',
    classNameMapping: { done: 'fill-green-500', active: 'fill-blue-500' },
  }}
/>`,
    },
    { kind: 'option', name: 'Point events', how: 'Omit `events.endKey` and set `events.sizeKey` to size circular markers.' },
    { kind: 'option', name: 'Mixed marks', how: 'Set `events.shapeKey` with `events.shapeMapping` to draw circle, rect or line per event type.' },
    { kind: 'option', name: 'Colour by type', how: 'Set `events.classNameKey` with `events.classNameMapping`.' },
  ],
};

export default meta;

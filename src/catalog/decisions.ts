import { DecisionBranch } from './types';

/**
 * The routing layer: maps the question being asked to a shortlist of charts.
 *
 * Read this top-down. Find the branch whose `question` matches what the data is
 * being used to say, then pick among its `options` using each option's `when`.
 * Only consult a chart's full `meta` once the branch has narrowed the field.
 */
export const decisionTree: DecisionBranch[] = [
  {
    question: 'How does a measure compare across named categories?',
    intent: 'comparison',
    options: [
      {
        name: 'ColumnChart',
        when: 'Up to ~12 categories with short labels — vertical bars, grouped when several measures are passed',
      },
      {
        name: 'BarChart',
        when: 'Long category labels, or more than ~12 categories — horizontal bars give labels room',
      },
      {
        name: 'LollipopVChart',
        when: 'Values matter more than magnitude-as-area, and bars would look heavy; vertical orientation',
      },
      {
        name: 'LollipopHChart',
        when: 'Same as LollipopVChart but with long category labels',
      },
      {
        name: 'SpineChart',
        when: 'Two opposing measures per category read outward from a shared centre axis, e.g. male/female',
      },
      {
        name: 'RadarChart',
        when: 'Five or more metrics compared across a handful of entities on one shared 0–max scale',
      },
    ],
  },
  {
    question: 'What is this made of — how do parts add to a whole?',
    intent: 'composition',
    options: [
      {
        name: 'PieChart',
        when: 'One whole split into ~6 or fewer slices at a single point in time',
      },
      {
        name: 'ColumnChartStacked',
        when: 'Composition compared across several categories or periods, vertical',
      },
      {
        name: 'BarChartStacked',
        when: 'Same as ColumnChartStacked but with long category labels; also does waterfall',
      },
      {
        name: 'AreaChart',
        when: 'Composition changing over a continuous axis; supports 100% and streamgraph stacking',
      },
      {
        name: 'PizzaChart',
        when: 'Several metrics as radial segments of one entity, each against its own max',
      },
    ],
  },
  {
    question: 'How does a measure change over time or an ordered axis?',
    intent: 'trend',
    options: [
      {
        name: 'LineChart',
        when: 'Trend of one or more series; the default choice for time on x',
      },
      {
        name: 'AreaChart',
        when: 'Trend where the volume under the line or the split of a total matters',
      },
      {
        name: 'ColumnChart',
        when: 'Few discrete periods where individual values matter more than the trend line',
      },
      {
        name: 'TimeLineChart',
        when: 'Discrete events or durations on a date axis rather than a continuous measure',
      },
    ],
  },
  {
    question: 'How do two measures relate to each other?',
    intent: 'correlation',
    options: [
      {
        name: 'ScatterPlot',
        when: 'One point per record; encodes up to two more categorical and one more numeric dimension via color, shape and size',
      },
      {
        name: 'WaffleChart',
        when: 'Both axes are categorical (or binned) and a third value is encoded as cell colour — a heatmap',
      },
    ],
  },
  {
    question: 'How are the values of one measure spread out?',
    intent: 'distribution',
    options: [
      {
        name: 'ColumnChart',
        when: 'Histogram of raw continuous values — set `x.bin` and bar heights become counts',
      },
      {
        name: 'BarChart',
        when: 'Same histogram horizontally — set `x[0].bin`; better for many bins',
      },
      {
        name: 'BoxPlotV',
        when: 'Compare the spread, median and quartiles of several groups, vertically',
      },
      {
        name: 'BoxPlotH',
        when: 'Same as BoxPlotV with long group labels',
      },
      {
        name: 'ScatterPlot',
        when: 'Two-dimensional density — set `x.bin` or `y.bin` for a binned heatmap',
      },
    ],
  },
  {
    question: 'What is the interval, or the movement between two states?',
    intent: 'range',
    options: [
      {
        name: 'RangePlot',
        when: 'A static min–max interval per category, drawn as a dumbbell',
      },
      {
        name: 'CometPlot',
        when: 'Movement from one value to another per category, with direction shown by a tapered tail',
      },
      {
        name: 'BoxPlotH',
        when: 'The interval is a statistical summary (quartiles and median), not a plain min–max',
      },
    ],
  },
  {
    question: 'How does a single value stand against its target?',
    intent: 'progress',
    options: [
      {
        name: 'BulletChart',
        when: 'One metric against base, target, threshold and max — the most information-dense option',
      },
      {
        name: 'LinearGauge',
        when: 'One value on a plain linear scale, optionally with an error value; compact enough for a table cell',
      },
      {
        name: 'RingGauge',
        when: 'Several metrics each against their own target, as concentric rings',
      },
      {
        name: 'SpeedometerChart',
        when: 'One value where a dial metaphor and coloured regions aid reading',
      },
      {
        name: 'PizzaChart',
        when: 'Several metrics of one entity against a shared max, as radial slices',
      },
    ],
  },
  {
    question: 'How do entities compare across many metrics at once?',
    intent: 'profile',
    options: [
      {
        name: 'RadarChart',
        when: 'Five or more metrics on a shared scale, comparing a few entities by shape',
      },
      {
        name: 'PizzaChart',
        when: 'A single entity profiled across metrics, no entity-to-entity comparison',
      },
      {
        name: 'RingGauge',
        when: 'Metrics have individual targets rather than one shared scale',
      },
    ],
  },
  {
    question: 'How has ordering changed?',
    intent: 'ranking',
    options: [
      {
        name: 'LineChart',
        when: 'Rank over time as a bump chart — convert values with `utils.convertToRanks` and use `curve: "bumpX"`',
      },
      {
        name: 'BarChart',
        when: 'A single ranked snapshot, sorted by value',
      },
    ],
  },
  {
    question: 'When did events happen, and for how long?',
    intent: 'schedule',
    options: [
      {
        name: 'TimeLineChart',
        when: 'Events or durations per row on a shared time axis, e.g. call logs or Gantt-style spans',
      },
    ],
  },
  {
    question: 'What is connected to what?',
    intent: 'connection',
    options: [
      {
        name: 'Network',
        when: 'Nodes and edges, force-directed by default and optionally pinned to x/y scales',
      },
    ],
  },
];

/**
 * Rules that hold for every chart in the library. An agent that gets these
 * wrong produces a component that renders nothing, which is the most common
 * failure mode with this library.
 */
export const globalRules: string[] = [
  '`id` is required on every chart and must be unique in the document — it is the DOM id D3 selects on. Two charts sharing an id will render into the same node.',
  'Charts read their size from the rendered element. Size them with `className` or `style` (e.g. `className="w-full h-64"`); there are no `width` or `height` props. A container with no height renders an empty chart.',
  'Styling is headless: pass Tailwind (or any CSS) classes via `className` on the chart and via `className` on each series config. Nothing is coloured by default.',
  'Use `margin` for space outside the plot area (axis labels live here) and `padding` for space inside it.',
  'Tooltips are opt-in: pass `tooltip={{}}` for defaults, `tooltip={{ keys: [...] }}` to choose fields, or `tooltip={{ html: (d) => string }}` to take over rendering.',
  'Animation is opt-in via `drawing={{ duration, delay }}`; charts render instantly by default.',
  'Axis keys support dot paths into nested objects (e.g. `{ key: "user.score" }`).',
];

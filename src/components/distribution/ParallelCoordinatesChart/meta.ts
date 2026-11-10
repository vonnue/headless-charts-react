import { ChartMeta } from '@/catalog/types';

const meta: ChartMeta = {
  name: 'ParallelCoordinatesChart',
  aliases: [
    'parallel coordinates',
    'parallel coordinates plot',
    'parallel coordinates chart',
    'parallel plot',
  ],
  category: 'distribution',
  summary:
    'One axis per measure, each with its own scale, and one line per record across them, showing clusters, trade-offs and outliers across many measures.',
  intents: ['profile', 'correlation', 'distribution'],
  data: {
    form: 'records',
    encodings: [
      {
        prop: 'dimensions',
        role: 'quantitative',
        required: true,
        description:
          'Ordered list of keys (or per-axis configs) — at least 2. Each gets its own axis and independent scale; numeric by default, categorical when values are strings.',
      },
      {
        prop: 'label',
        role: 'label',
        required: false,
        description: 'Record identity shown first in the tooltip, e.g. `{ key: "model" }`.',
      },
      {
        prop: 'color.key',
        role: 'color',
        required: false,
        description:
          'Categorical field mapped to line classes via `color.classNameMap`. Colour names a category, never a magnitude.',
      },
    ],
    seriesCount: {
      ideal: [3, 8],
      max: 12,
      note: 'Dimensions (axes). Past ~12 axes the spacing gets too tight to read crossings.',
    },
    rowCount: {
      ideal: [10, 500],
      max: 5000,
      note: 'Records (lines). Stroke opacity drops automatically past 50 lines, floored at 0.1.',
    },
  },
  useWhen: [
    'Many records across 3–12 measures with different units',
    'Finding clusters or trade-offs (crossing lines between adjacent axes) across measures',
    'Filtering records interactively by ranges on several measures (`brushing`)',
  ],
  avoidWhen: [
    'A few entities on one shared scale — use RadarChart',
    'Only two measures — use ScatterPlot',
    "One measure's distribution per group — use BoxPlotV (or ViolinChart once exported)",
    'Colour is wanted to encode a value — the axes already encode values; colour names categories only',
    'The audience needs exact values — use a table',
  ],
  alternatives: [
    { name: 'RadarChart', when: 'a few entities compared on one shared scale' },
    { name: 'ScatterPlot', when: 'only two measures are being related' },
    { name: 'BoxPlotV', when: "one measure's distribution per group" },
  ],
  requiredProps: ['id', 'data', 'dimensions'],
  example: `<ParallelCoordinatesChart
  id="cars"
  className="w-full h-96"
  data={cars}
  label={{ key: 'model' }}
  dimensions={[
    'mpg',
    { key: 'hp', label: 'Horsepower' },
    { key: 'weight', format: (v) => \`\${v} kg\` },
    { key: 'origin', type: 'point', order: ['US', 'EU', 'JP'] },
  ]}
  color={{ key: 'origin', classNameMap: { US: 'stroke-slate-600', EU: 'stroke-sky-600', JP: 'stroke-amber-600' } }}
  line={{ className: 'stroke-slate-400' }}
  brushing={{ onChange: (s) => setSelected(s.indices) }}
  tooltip={{ className: 'bg-white text-xs p-2 shadow' }}
  title="Cars by economy, power and weight"
/>`,
  storybook: 'Distribution/ParallelCoordinatesChart/Intro',
  variants: [
    {
      kind: 'option',
      name: 'Brushing',
      how: 'Set `brushing` (or `{ onChange, className }`) for a 1-D brush per axis; filtering is AND across axes, unselected lines get `data-filtered="true"`, and `onChange` fires on brush end and clear.',
    },
    {
      kind: 'option',
      name: 'Colour by category',
      how: 'Set `color={{ key, classNameMap }}`; a lookup miss falls back to `line.className`.',
    },
    {
      kind: 'option',
      name: 'Gaps vs dropping missing values',
      how: '`missing: "gap"` (default) breaks a line around a missing value and draws an isolated value as a dot; `missing: "drop"` removes any record with a missing value.',
    },
    {
      kind: 'option',
      name: 'Horizontal orientation',
      how: 'Set `orientation: "horizontal"` for horizontal axes stacked top to bottom.',
    },
    {
      kind: 'option',
      name: 'Bump curve',
      how: 'Set `line.curve: "bump"` for smooth lines that still cross each axis at its value.',
    },
    {
      kind: 'option',
      name: 'Reversed axis',
      how: 'Set `reverse: true` on a dimension to put high values at the bottom (or left).',
    },
    {
      kind: 'option',
      name: 'Categorical (point) axes',
      how: 'String values are inferred as a point axis; set `type: "point"` and `order` to fix the category order.',
    },
  ],
};

export default meta;

# headless-charts

A headless React + D3 charting library. Charts render into an SVG you size with
CSS; nothing is styled by default.

## Picking a chart

**Read [AGENTS.md](./AGENTS.md) before choosing a chart component.** It maps the
question being asked ("compare across categories", "part of a whole", "change
over time", "one value against a target") to the right component, and lists for
each chart the conditions under which it is the *wrong* choice. Guessing from
component names alone will pick a plausible-but-wrong chart.

**If a chart type was named, look it up first.** Many recognised types are a base
component plus a prop, not a component of their own — a streamgraph is an
`AreaChart` with `stacking.type`, a waterfall is a `ColumnChartStacked` with
`waterfall`, a histogram is a `ColumnChart` with `x.bin`, a donut is a `PieChart`
with `innerRadius`. Searching the exports for `Waterfall` finds nothing; the
"If a chart type was named" table in AGENTS.md resolves it.

The same data is available programmatically:

```ts
import {
  chartCatalog,
  decisionTree,
  getChartsByIntent,
  resolveChartRequest,
} from '@headless-charts/react';

resolveChartRequest('waterfall');
// → { chart: ColumnChartStacked meta, variant: Waterfall chart meta }
```

## Repo layout

- `src/components/<category>/<Chart>/index.tsx` — implementation
- `src/components/<category>/<Chart>/meta.ts` — selection metadata (source of truth)
- `src/components/<category>/<Chart>/*.stories.tsx` — Storybook examples
- `src/catalog/` — catalog types, decision tree, and the AGENTS.md generator
- `src/types.tsx` — shared `AxisConfig`, `ChartProps`, `TooltipConfig`, `GaugeProps`

## Editing charts

When adding a chart, or changing what a chart is for:

1. Update or add its `meta.ts`. Give it `aliases` — the names people ask for it
   by, not just the component name.
2. If a new prop produces a recognised chart type, add it to that chart's
   `variants` as `kind: 'chart-type'` with its own aliases, `useWhen` and
   example. Cosmetic settings are `kind: 'option'` and need only a `how`.
3. If it answers a new kind of question, add it to `decisionTree` in
   `src/catalog/decisions.ts`.
4. Run `yarn docs` to regenerate `AGENTS.md`, `catalog.json` and the JSDoc block
   above each component.

`yarn docs:check` fails if any of those are stale, and the catalog tests fail if
a chart is exported without metadata, or recommends an alternative that does not
exist.

Do not hand-edit `AGENTS.md`, `catalog.json`, or anything between the
`/* catalog:start */` and `/* catalog:end */` markers in a component — those are
generated.

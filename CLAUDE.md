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

## Agent workflow (mandatory)

Every code change in this repo — new chart, prop change, bug fix, anything —
goes through this agent graph, in order. Do not hand-write or hand-edit code
directly; do not skip or reorder stages.

```
dataviz-spec-architect
  ├─> vitest-test-writer ─┐
  └─> general-purpose ────┤
                           v
              general-purpose (merge tests + impl, iterate til green)
                           v
              storybook-render-auditor (real-browser render check, loop til clean)
                           v
              d3-react-code-reviewer <-> general-purpose (loop til clean)
                           v
              chart-catalog-editor
```

1. `dataviz-spec-architect` first, always — locks the prop/type signature and
   behavior spec before anything forks. Test-writer and implementation must
   work off the same signature or the merge step fails.
2. Fork in parallel: `vitest-test-writer` writes tests from the spec;
   `general-purpose` writes the implementation from the same spec.
3. `general-purpose` merges tests + implementation, runs them, iterates until
   green.
4. `storybook-render-auditor` renders the affected stories in a real browser
   (Playwright) and checks structural invariants plus visual regression
   against committed baselines — jsdom-based unit tests can pass while the
   real rendered chart is broken, since jsdom has no layout engine. Iterates
   with `general-purpose` until clean; anything unrelated to the current
   change goes to `issue-writer` instead of blocking this stage.
5. `d3-react-code-reviewer` reviews; back-and-forth with `general-purpose`
   until the review is clean.
6. `chart-catalog-editor` last, once code is settled — see "Editing charts"
   below for what it updates and regenerates.

Also runnable standalone (not just as a pipeline stage): `/storybook-render-audit`
sanity-checks the current state of Storybook, scoped or full-library.

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

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
goes through this agent graph, in order. Do not skip or reorder stages, and
do not write implementation code before `dataviz-spec-architect` has locked
the spec or commit before the review loop is clean.

```
dataviz-spec-architect
  ├─> vitest-test-writer ─┐
  └─> main session ───────┤
                           v
              main session (merge tests + impl, iterate til green)
                           v
              d3-react-code-reviewer <-> main session (loop til clean)
                           v
              chart-catalog-editor
                           v
              main session (pre-PR checks, commit)
```

The **main session** (the coordinating, top-level assistant — not a
subagent) implements the code, merges tests with the implementation, writes
the Storybook stories, and makes the commits. Subagents only spec, test,
review and update the catalog; they never commit or push.

1. `dataviz-spec-architect` first, always — locks the prop/type signature and
   behavior spec before anything forks. Test-writer and implementation must
   work off the same signature or the merge step fails.
2. Fork in parallel: `vitest-test-writer` writes tests from the spec; the
   main session writes the implementation (and stories) from the same spec.
3. The main session merges tests + implementation, runs them, iterates until
   green.
4. `d3-react-code-reviewer` reviews; back-and-forth with the main session
   until the review is clean.
5. `chart-catalog-editor` once code is settled — see "Editing charts" below
   for what it updates and regenerates.
6. Before committing or opening a PR, the main session runs the same checks
   as CI, and all must pass:
   `yarn tsc --noEmit && yarn lint && yarn test:hooks && yarn vitest run && yarn docs:check && yarn vite build`

Existing lint debt lives in `eslint-suppressions.json`. If you fix suppressed
violations, run `yarn lint:prune` and commit the smaller file. Never run
`eslint --suppress-all` / `--suppress-rule` to make new code pass; type it or
fix it. Any diff that *increases* counts in `eslint-suppressions.json` must be
called out for review.

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

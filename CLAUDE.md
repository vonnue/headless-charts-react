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
- `src/components/<category>/<Chart>/*.stories.tsx` — Storybook examples, one
  file per section (see "Storybook stories" below)
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
   Stories follow "Storybook stories" below: separate Intro, Drawing, Tooltip
   and Labels section files, as the spec lists them.
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

**Optional real-browser render audit.** `/storybook-render-audit` (the
`storybook-render-auditor` agent, `yarn test:storybook-render`) renders stories
in Playwright's Chromium and checks structural invariants plus visual
regression against committed baselines, which jsdom unit tests can't see. It is
not yet a required pipeline stage; scope it to the stories you touched with
`STORYBOOK_AUDIT_FILTER`.

**Safety hook requirements.** The PreToolUse Bash hook
(`.claude/hooks/subagent-block-risky-actions.sh`) needs Claude Code >= 2.1.295,
`bash` and `jq`. Because `.claude/settings.json` sets `"onFailure": "block"`, a
broken hook (lost exec bit, missing `bash`, a crash or a timeout) blocks every
Bash call, including the main session's. If all Bash calls start failing with
`blocking because onFailure is "block"`, fix the hook rather than removing the
setting.

## Storybook stories

The main session writes the stories. Nest them under separate Storybook
sections, one file per section, instead of putting every example in one file.
FunnelChart is the model: `Flow/FunnelChart/Intro`, `Flow/FunnelChart/Drawing`,
`Flow/FunnelChart/Tooltip` and `Flow/FunnelChart/Labels`, in
`src/components/flow/FunnelChart/`.

- **Titles** are `Category/ChartName/Section`, e.g. `Flow/FunnelChart/Drawing`.
- **File names.** Intro is `<CatalogName>.stories.tsx`. Every other section is
  `<CatalogName>.<section>.stories.tsx`, section in lowercase, e.g.
  `BarChart.tooltip.stories.tsx` (title `Linear/BarChart/Tooltips`) or
  `FunnelChart.drawing.stories.tsx`. Use the **catalog** (`meta.ts`) name as
  the prefix when it differs from the export name: `ColumnChart.binning.stories.tsx`
  holds `Linear/ColumnChartGrouped/Binning`.
- **Style.** Import `preview` from `.storybook/preview`, build the meta with
  `preview.meta({ title, component, tags: ['autodocs'] })`, put a JSDoc comment
  on the meta (it becomes the docs page intro) and on every story, and give each
  story a unique `id`. Share args within a file through a small `base` object
  (`className: 'w-full h-80'`, data, keys). Don't import stories or args from
  another section file; duplicate the small `base` and class maps instead.

A new chart needs these sections:

- **Intro**: the default orientation or shape, the chart's distinctive
  variants, and the empty and edge cases. Don't dump every example here.
- **Drawing**: required whenever the chart honours `drawing` from `ChartProps`,
  which almost every chart does. At least one story with
  `drawing: { duration: 1000, delay: 100 }`, and a comment that remounting the
  story replays the animation. The component default stays `{ duration: 0 }`, so
  the other stories render instantly. Don't put a drawing story (or an
  `Animated` story) in Intro instead of a Drawing section.
- **Tooltip**: required whenever the chart supports `tooltip`. Show the default
  HTML (`tooltip: {}`), styling with `tooltip.className`, and a custom
  `tooltip.html` callback when the chart has one.
- **Labels**: required whenever the chart has a `labels` (or equivalent) prop
  worth demonstrating.
- **Other feature sections** as needed, named like existing peers: `Zoom`,
  `Brushing`, `Highlight`, `Binning`, `Time Scaling` (file `<Name>.time.stories.tsx`).

When adding a variant or prop to an existing chart, add the story to the section
file it belongs in (create the file if it doesn't exist yet), not just to Intro.

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

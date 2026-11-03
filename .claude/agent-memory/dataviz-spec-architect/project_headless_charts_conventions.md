---
name: project_headless_charts_conventions
description: Repo-specific conventions in headless-charts relevant to writing chart specs (naming mismatches, no-shared-util policy, generic axis hook)
type: project
---

Facts learned while writing the spec for issue #7 (`x.scalingFunction: 'time'` on ColumnChart, ColumnChartStacked, LollipopVChart, BoxPlotV), useful for any future spec in this repo.

## Duplication is intentional, not tech debt to fix
AreaChart, LineChart, and TimeLineChart each carry their own copy of the same
`toDateTime`/scale-selection/domain pattern rather than sharing a util. When
writing a spec that touches multiple charts, instruct implementers to
duplicate the pattern locally (copy-paste) rather than extracting a new
shared module.

**Why:** the mandatory agent graph in CLAUDE.md forks per-chart work into
independent parallel pipelines (`vitest-test-writer` + `general-purpose` per
chart) that never see each other's diffs. A new shared util file introduced
by the spec would be a guaranteed multi-way merge conflict with no
coordination mechanism between the pipelines.

**How to apply:** in any spec touching >1 chart, explicitly say "duplicate
this block, don't extract a shared file" and call out any *unavoidable*
shared-file edit (e.g. a new field on `AxisConfig` in `src/types.tsx`) as a
named conflict-risk point, with instructions to make it idempotently (check
if the field already exists before adding) so parallel pipelines converge
rather than collide.

## Naming has three independent layers per chart — don't assume they match
A chart can have three different names in play at once:
- the exported/internal component name (e.g. `ColumnChartGrouped`)
- the catalog/`meta.ts` name used in `AGENTS.md` and by
  `resolveChartRequest` (e.g. `ColumnChart`)
- the Storybook `title` (matches the internal name: `'Linear/ColumnChartGrouped'`)

Extra `*.stories.tsx` files (binning, time, tooltip variants) are prefixed
with the **catalog name**, not the internal export name — e.g.
`ColumnChart.binning.stories.tsx` imports `ColumnChartGrouped from '.'` and
sets `title: 'Linear/ColumnChartGrouped/Binning'`. Confirmed this pattern by
reading `ColumnChart.binning.stories.tsx` and `BoxPlotV.binning.stories.tsx`
before specifying new `*.time.stories.tsx` file names/titles — worth
verifying against an existing sibling variant-stories file every time rather
than guessing from the component name.

## `drawAxis` (`src/hooks/useAxis.tsx`) is already scale-agnostic
It takes any d3 scale and calls `axisBottom(scale)` etc. — no special-casing
needed for `scaleTime` vs `scaleBand`, d3-axis formats time ticks
automatically. Confirmed no changes are needed there when adding time-scale
support to a chart; only the chart's own `xFn` construction and
bar/box/stem position math need branching.

## Known pre-existing bug (not in scope to fix opportunistically)
`AreaChart.time.stories.tsx` passes `isISO: true` directly on the `x` object
instead of nested under `x.time.isISO` (the actual `AxisConfig` shape).
Don't copy this mistake into new time-scaling stories — use `x.time.isISO`
correctly. Flagged to the user rather than fixed inline since spec-stage work
should not silently patch unrelated files.

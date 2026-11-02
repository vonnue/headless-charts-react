---
name: issue-7-time-scaling
description: Scope and known-tracked defects for GitHub issue #7 (x.scalingFunction 'time' across ColumnChart, ColumnChartStacked, LollipopVChart, BoxPlotV) — includes two issues that must NOT be re-flagged in review
type: project
---

GitHub issue #7 adds `x.scalingFunction: 'time'` to ColumnChart,
ColumnChartStacked, LollipopVChart and BoxPlotV, on branch
`issue-7-time-scaling`. AreaChart is the pre-existing reference
implementation for the time-scale pattern.

**Two defects are already filed and must not be re-reported when reviewing
any chart on this branch:**

- **#15** — `AreaChart.time.stories.tsx` nests `isISO` wrongly.
- **#16** — `scaleTime().nice()` is called *before* `.domain()` is set, so it
  is a no-op. Cross-cutting across every time-scaled chart. The visible
  symptom is that the first and last data points land exactly on the range
  ends, so centered marks (bars, box plots, lollipop heads) overhang the plot
  bounds. Expected; already tracked.

Per CLAUDE.md the `chart-catalog-editor` stage runs *after* code review, so
during review `yarn vitest run src/catalog/catalog.generated.test.ts` failing
its two snapshots (AGENTS.md + catalog.json missing the new time variants) is
the expected pending state, not a regression — do not hand-edit those files
or the `/* catalog:start */` JSDoc blocks.

Reviews cleared so far: ColumnChart, ColumnChartStacked, LollipopVChart
(2026-08-09). BoxPlotV had a mean-vs-median cadence bug that was fixed in
`96fe391`.

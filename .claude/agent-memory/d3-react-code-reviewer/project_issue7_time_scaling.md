---
name: issue-7-time-scaling
description: Historical — issue #7 (x.scalingFunction 'time' for ColumnChart, ColumnChartStacked, LollipopVChart, BoxPlotV) is merged; #15 and #16 are fixed, so edge-mark overhang and the isISO story bug ARE flaggable again
type: project
---

**Historical note.** Issue #7 landed on main in PR #26 (branch
`fix/issue-7-time-scaling`, a re-land of #24). It added
`x.scalingFunction: 'time'` to ColumnChart, ColumnChartStacked, LollipopVChart
and BoxPlotV, with time-bar slot layout and a padded domain. AreaChart was the
reference implementation for the time-scale pattern.

What changed since the earlier version of this note:

- **#15** (`AreaChart.time.stories.tsx` set `isISO` on the wrong prop path) is
  closed — fixed in the #7 work.
- **#16** (`scaleTime().nice()` called before `.domain()`, a no-op) is closed —
  the dead `.nice()` calls were removed in PR #29.
- **Edge-mark overhang is no longer expected.** If centered marks (bars, box
  plots, lollipop heads) on a time-scaled chart overhang the plot bounds,
  flag it — that is a regression, not a tracked issue.
- The catalog (AGENTS.md, catalog.json) was regenerated in the same PR, so
  catalog snapshot failures are no longer an "expected pending state" for this
  work. In general they are only expected mid-pipeline, before the
  `chart-catalog-editor` stage has run on the change under review.

Still open as of this note: #25 (default `x.time.utc` to true when `isISO` is
set; next major).

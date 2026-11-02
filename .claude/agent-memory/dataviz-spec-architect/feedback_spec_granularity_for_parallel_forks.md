---
name: feedback_spec_granularity_for_parallel_forks
description: How much granularity a spec needs when it will fork into independent parallel per-chart agent pipelines that can't see each other's work
type: feedback
---

Not a correction — the user explicitly primed this up front in the task
prompt for issue #7, and it's a strong enough constraint on spec-writing
style in this repo that it's worth keeping as a standing rule for
`dataviz-spec-architect` work here, not just a one-off instruction.

**Rule:** when a spec is going to fork into N independent per-chart (or
per-component) pipelines via the mandatory agent graph in CLAUDE.md, any
piece of logic that must come out *identical* across pipelines cannot be
described as "figure out something reasonable per chart" — it must be given
as one literal, copy-pasteable algorithm (exact variable names, exact
pseudocode/formula, an explicit substitution table for how it maps onto each
chart's existing code), because the pipelines never see each other's diffs
and have no way to converge by themselves.

**Why:** the reviewer/merge stage downstream only catches *bugs*, not
*inconsistency* between four independently-invented-but-each-individually-
reasonable approaches to the same shared problem (e.g. four different bar
width formulas that all look fine in isolation but behave differently from
each other). Precision at the spec stage is the only point where
consistency can actually be enforced.

**How to apply:** for any future multi-chart spec in this repo —
1. Write the shared algorithm once, in full, with concrete variable names.
2. Give a mechanical substitution/lookup table for applying it to each
   chart's existing code, rather than re-deriving prose per chart.
3. Explicitly name any prop/type added to a *shared* file (e.g.
   `src/types.tsx`) as a merge-conflict risk point, since it's the one place
   multiple pipelines might touch independently — see
   [[project_headless_charts_conventions]] for the specific case (adding
   `x.time.barWidth` to `AxisConfig`).
4. Keep per-chart sections self-contained (restate anything from the shared
   section that a section needs) since each pipeline is only handed its own
   section plus the shared one, not the whole document's context.

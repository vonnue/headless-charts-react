---
name: verify-unchanged-claims-by-diffing-rendered-dom
description: When a spec or ground rule claims "existing behavior must not change", prove it by stashing the diff and diffing rendered SVG attributes — never by reading the code and reasoning about d3 setter order
metadata:
  type: feedback
---

When a spec, ground rule, or PR description claims an existing code path is
"unchanged" / "byte-for-byte equivalent, just moved into an `else`", do not
verify it by reading the diff and reasoning. Verify it mechanically:

1. Write a throwaway test that renders the old code path across its meaningful
   variations (defaults, a non-default prop, any alternate branch like binning)
   and appends every rendered attribute to a file (`console.log` is swallowed
   by this repo's vitest reporter — use `fs.appendFileSync`).
2. Run it, `git stash push -- <changed files>`, run it again to a second file,
   `git stash pop`, then `diff` the two outputs.
3. Delete the throwaway test.

**Why:** on the issue #7 ColumnChart review, the refactor moved d3's
`.padding()` call to before `.range()`. Reasoning about whether d3 `scaleBand`
cares about setter order is exactly the kind of subtle question where a
confident wrong answer is easy — the empirical diff settled it in seconds
(identical; each `scaleBand` setter calls `rescale()`, so the final state is
order-independent). The same technique validated the exact expected pixel
values for the new code path, which then let me replace vacuous `> 0`
assertions with exact `toBeCloseTo(..., 6)` ones.

**How to apply:** worth it whenever a change claims to preserve a code path
that has real geometry output — i.e. most chart refactors here. Pair it with
mutation testing of the *new* path (break the algorithm on purpose, confirm a
test fails) so both directions are covered. See
[[jsdom-zero-size-makes-chart-tests-vacuous]] for why the render in step 1
must pass an explicit `style` size or the diff compares two degenerate 0x0
charts.

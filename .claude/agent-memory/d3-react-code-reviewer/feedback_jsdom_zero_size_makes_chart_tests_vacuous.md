---
name: jsdom-zero-size-makes-chart-tests-vacuous
description: Any chart test in this repo that does not pass an explicit style size is asserting against a 0x0 chart with an inverted scale range — check this first when reviewing chart tests
metadata:
  type: feedback
---

When reviewing any test in this repo that asserts on rendered geometry (`x`,
`width`, `cx`, `d`, transforms), first check whether the render passes an
explicit `style={{ width: '...px', height: '...px' }}`. If it does not, the
assertions are almost certainly vacuous.

**Why:** every chart component derives its dimensions with
`+svg.style('width').split('px')[0]`. JSDOM performs no layout, so
`svg.style('width')` returns `''` and both width and height compute to **0**.
With the default 40px margins that makes the x range `[40, -40]` — inverted and
negative. Downstream:

- Any width derived from a scale delta goes **negative** and lands on whatever
  `Math.max(1, ...)` style floor the code has, so every mark renders at a
  constant 1px.
- Bars/marks render at negative `x`, so naive `x >= 0` assertions fail for a
  reason that has nothing to do with the code under test.
- Assertions like `expect(width).toBeGreaterThan(0)`, "all widths approximately
  equal", or grouping marks by `Math.round(x)` all pass trivially and would
  keep passing if the entire algorithm under test were deleted.

Found this on the ColumnChart `x.scalingFunction: 'time'` review (issue #7):
the median-gap cadence inference had 23 passing tests and *zero* effective
coverage — every inferred bar was exactly 1px. The ColumnChartStacked review
of the same issue hit it independently and confirmed it by mutation: swapping
median for mean in the implementation still passed 27/27, and the failure
message after sizing the SVG was literally `expected 1 to be close to 138.67`.

A second tell, beyond a missing `style` prop: a test carrying a *comment* that
explains the jsdom quirk and then loosens an assertion to accommodate it
(direction-agnostic monotonicity, sorting marks by x before diffing gaps,
`uniqueWidths.size <= 2`, `Number.isFinite(x)` in place of `x >= 0`,
`toBeCloseTo(firstSpacing, 1)` in place of a spacing derived from real date
math). Each of those is a merge-stage workaround for the 0-size render, and
each one deletes the coverage it looks like it is preserving.

Third occurrence: the LollipopVChart time-scaling review (issue #7, 2026-08-09),
23 passing tests. Mutating the time-mode x to `xFn(date) * 0.5 + 3` — an
arbitrary affine distortion of every position — still passed 23/23. After
sizing the SVG and pinning exact coordinates, the same mutation failed 17/28.

Two traps specific to that file, both worth checking elsewhere:

- **Sorting the extracted positions before diffing them.** Several charts
  (LollipopVChart, LollipopHChart) `data.sort(...)` the caller's array *in
  place* before drawing, so DOM/paint order is value-descending, not the
  fixture's order. Sorting the extracted x values papers over that and lets a
  test compare the wrong marks to each other — the "gap" test was subtracting
  positions in the wrong order and only passed because the inverted 0-size
  range flipped the sign back. Derive the expected DOM order by applying the
  same sort to a copy of the fixture instead. The in-place sort also leaks
  mutated order into later tests in the same file: pass `data={[...fixture]}`.
- **Transition end-states are never observed.** d3 transitions don't advance
  during a synchronous `render()`, so tests only ever see the anchor frame and
  the `.transition().attr(...)` expressions are untested — a 4px nudge to the
  final symbol transform passed everything. One `async` test with
  `await waitFor(..., { timeout: 4000 })` lets the 1000ms draw-in actually run
  under real timers and closes the hole for ~1s of wall clock.

**How to apply:** the fix is cheap — every chart forwards its `style` prop
straight onto the `<svg>`, so `style={{ width: '500px', height: '300px' }}`
gives a real range (`[margin.left, width - margin.right]`) and lets tests
assert exact expected values with `toBeCloseTo(..., 6)` instead of `> 0`.
Compute expectations from real date math (elapsed-time *ratios* are invariant
to the UTC-vs-local difference between `isoParse` and `timeParse`, so one
helper serves both parsing paths), and pin one hand-computed literal so the
helper cannot mirror the component's own bug. Note that date-only fixtures
cannot distinguish the `isISO` branch from `timeParse('%Y-%m-%d')` — use a
full ISO timestamp with a sub-day offset to cover it. Then confirm
non-vacuity by mutating the implementation (swap median for mean/min, drop an
offset term, apply an affine distortion, disable a guard) and checking a test
actually fails. Related: [[repo-wide-d3-lifecycle-defects]].

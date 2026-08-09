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
`uniqueWidths.size <= 2`, `Number.isFinite(x)` in place of `x >= 0`). Each of
those is a merge-stage workaround for the 0-size render, and each one deletes
the coverage it looks like it is preserving.

**How to apply:** the fix is cheap — every chart forwards its `style` prop
straight onto the `<svg>`, so `style={{ width: '500px', height: '300px' }}`
gives a real range (`[margin.left, width - margin.right]`) and lets tests
assert exact expected values with `toBeCloseTo(..., 6)` instead of `> 0`.
Then confirm non-vacuity by mutating the implementation (swap median for
mean/min, drop an offset term, disable a guard) and checking a test actually
fails. Related: [[repo-wide-d3-lifecycle-defects]].

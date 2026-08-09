---
name: feedback_transition_cleanup_checklist
description: Two D3-in-React defects found in SpeedometerChart that this review agent should flag proactively -- global/unscoped d3 selectors for transitions, and redundant update calls duplicated between setup and an update effect
type: feedback
---

Found and fixed in `src/components/gauges/SpeedometerChart/index.tsx`
(2026-08-09), not caught by review at the time it was introduced. Flag these
patterns on future D3-in-React reviews, not just in gauges:

**1. Transitions selected by global/id CSS selector instead of a node ref.**
The component did `select('.data-group')` (later `select('#${id}
.data-group')`) inside the update effect, then tried to `.interrupt()` the
same selector in that effect's cleanup on unmount. This doesn't reliably
cancel the pending transition: React unmounts remove the DOM subtree before
passive-effect cleanups run, so by the time cleanup fires, the id-scoped
selector can find nothing to interrupt and the d3-timer callback still fires
later against a detached node. Fix: store the actual node via `useRef` when
it's created (e.g. `dataGroupRef.current = dataG.node()`) and interrupt via
`select(dataGroupRef.current)` — a direct node reference works even after
DOM detachment, since d3's transition schedule lives on the node object
itself. **Flag any `.transition()` whose selection is a CSS/id selector
rather than a ref, if the same component doesn't also call `.interrupt()`
on unmount using a stable node reference.**

**2. The same update logic invoked twice per prop change.** `setup()` (structural,
re-runs on prop changes like `dataValue`) called `refreshChart()` (the
transition-driving function) directly at the end of its body, *and*
`refreshChart()` was already wired to its own `useEffect`. Every data change
scheduled two competing transitions on the same node with different stale
closures. Not a crash, just wasted work and a source of visual glitches —
easy to miss because d3 auto-interrupts a same-node transition when a second
one starts, so nothing throws. **Flag any call to an effect-driven update
function from inside another effect's setup function** — it's almost always
either a leftover from before the effects were split apart, or a sign the
effect dependency arrays are wrong.

See [[feedback_jsdom_transform_tweens]] in vitest-test-writer's memory for
the related jsdom-side fix that was needed to actually observe transitions
correctly in tests.

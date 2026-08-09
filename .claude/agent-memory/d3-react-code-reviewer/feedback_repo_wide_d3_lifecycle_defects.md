---
name: feedback_repo_wide_d3_lifecycle_defects
description: Full-repo D3/React lifecycle audit (2026-08-09) found several defect patterns repeated across many chart components, beyond the two SpeedometerChart patterns in [[feedback_transition_cleanup_checklist]]. Check these on every future review.
type: feedback
---

Full-repo review on 2026-08-09 (triggered by a request to check all charts for the
two SpeedometerChart lifecycle patterns) turned up additional repeated defects.
Flag all of these proactively in future reviews — they were not caught when each
component was originally reviewed one at a time.

**1. `useTooltip` (src/hooks/useTooltip.tsx) mutates the DOM during render, not
in an effect.** It calls `select('body').append('div')...` directly in the hook
body, and is itself called at the top level of ~18 chart components' render
bodies (BarChart, ColumnChart, PieChart, ScatterPlot, WaffleChart, LinearGauge,
PizzaChart, RingGauge, SpeedometerChart, BoxPlotH/V, CometPlot, RangePlot,
LollipopH/VChart, SpineChart, ColumnChartStacked, BarChartStacked — grep
`useTooltip` under src/components to get the current list). Every re-render of
the host component appends a fresh `<div id="tooltip-${id}">` to `document.body`
with a duplicate id, with nothing to deduplicate against previous appends except
whatever the chart's own effect cleanup happens to remove on the *next* prop
change. This is a render-purity violation (React explicitly disallows side
effects in the render phase) and a real DOM/memory leak on any re-render that
doesn't change the effect's own dependency array (e.g. a parent re-render with
unchanged data). Fix direction: move the div creation into a `useEffect`/`useRef`
inside `useTooltip` itself (create once, reuse, remove on unmount), not into the
render body of every consumer.
Also: `onMouseMove` in that file references the ambient global `event` instead
of taking an `event` parameter — fragile/deprecated, and breaks in environments
(tests, some browsers) where `window.event` isn't populated.

**2. `refreshChart` declared with an empty `useCallback` dependency array
`[]` while closing over props used inside it (`data`, `margin`, `padding`,
`x`, `y`, `zooming`, `id`, etc).** Confirmed in `LineChart/index.tsx` (refreshChart
spans ~line 202–874) and `AreaChart/index.tsx` (~line 218–440) — both wired via
`useEffect(() => { refreshChart(); ... }, [data, refreshChart])`. Because
`refreshChart` is referentially stable (empty deps), the effect *does* re-fire
when `data` changes, but it calls the same closure captured on the first
render — so the chart redraws with the **original mount-time `data`/`margin`/
`padding`/etc, not the updated props**. Net effect: LineChart and AreaChart
(and Streamgraph, which is AreaChart + a prop) do not visibly update after
mount for any prop change. `LineChart/index.tsx` has a dangling
`/* eslint-enable */` with no matching `/* eslint-disable */` right before the
`}, []);` — worth checking whether `react-hooks/exhaustive-deps` is actually
enabled for this file/repo, since it should have caught this.
Also present in `Network/index.tsx` (~line 184–487): `refreshChart` is
`useCallback(..., [])` closing over `nodes`, `edges`, `nodeDef`, `edgeDef`,
`padding`, `margin`, `zooming`, `dragging`, `id` — none of which are deps, so
Network never updates after the initial mount either. Same root cause as
[[feedback_transition_cleanup_checklist]] pattern 2 (setup/update split with
wrong deps) but manifesting as "never updates" instead of "double-updates."
**Check every chart's `refreshChart`/`setup` useCallback deps array against
what it actually closes over before trusting an empty `[]`.**

**3. Cleanup function returned from `refreshChart` (a `useCallback`), not from
the `useEffect` that calls it — silently discarded.** In `PieChart/index.tsx`
(~line 344-346) and `RingGauge/index.tsx` (~line 236-238), `refreshChart`
itself does `const timeOut = setTimeout(...); ... return () => clearTimeout(timeOut);`,
but the caller is `useEffect(() => { refreshChart(); return () => { selectAll(...).remove(); }; }, ...)`
— it ignores `refreshChart()`'s return value and supplies its own unrelated
cleanup (tooltip removal). The `clearTimeout` cleanup is dead code; the timeout
(which sets `previousData.current`/`previousArcs.current` for the next
transition's start-state) is never cancelled on unmount or rapid re-triggers.
Low severity (harmless on unmount since the ref just gets written after the
fact) but real dead code / intent-not-matching-behavior — worth a quick fix by
returning the cleanup from the effect itself instead of from inside the
callback.

**4. `LinearGauge/index.tsx` restarts transitions via an entirely unscoped
global class selector.** `refreshChart`'s effect does
`select('.data-rect').transition()...` (line ~202) — not scoped by `#${id}` at
all, unlike every other component's `select('#${id} ...)`. With more than one
`LinearGauge` on a page this animates whichever `.data-rect` element happens to
be first in document order, which may belong to a different instance. This is
a worse variant of [[feedback_transition_cleanup_checklist]] pattern 1 (wrong
selector for the animated node), and it co-occurs with pattern 2: `setup()`
(rebuilds the whole SVG including its own transition) and `refreshChart()` are
both wired to their own effects and both have `data` in their dep list, so both
fire and schedule competing transitions on every data change, same as the
original SpeedometerChart bug.

**5. `Network/index.tsx` never calls `simulation.stop()` on unmount** — the
`forceSimulation` timer (and any alpha-reheat from a drag interaction) keeps
running against a detached DOM subtree after the component unmounts. No
`useEffect` cleanup exists for the simulation at all (the sole effect has no
return). Also calls `useTooltip` (hook-styled, `use`-prefixed) from inside
`refreshChart`, a plain callback — not at the top level of the component. It
happens not to crash today because `useTooltip` itself doesn't call real React
hooks internally, but it's a Rules-of-Hooks violation waiting to break the
moment `useTooltip` is changed to use `useState`/`useRef` (which is also the
fix recommended in point 1 above) — flag this combination together if `useTooltip`
is ever refactored.

Overall pattern for this codebase: chart components mostly favor a
"tear down and rebuild via `svg.selectAll('*').remove()`" style over D3's
enter/update/exit `.join()` pattern, and virtually none of them call
`.interrupt()` on unmount (SpeedometerChart is now the only one that does).
That's a lower-severity, structural, repo-wide note rather than a bug per se —
mention it but don't block on it unless a component also has one of defects
1-5 above.

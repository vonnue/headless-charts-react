---
name: feedback_jsdom_transform_tweens
description: jsdom SVGElement.transform is polyfilled in setupTests.tsx with real matrix parsing — d3-transition tweens on the "transform" attribute resolve to correct final values in tests, not identity
type: feedback
---

`src/setupTests.tsx` polyfills `SVGElement.prototype.transform` (jsdom has no
native `SVGAnimatedTransformList` — accessing it throws `undefined.baseVal`,
crashing any `d3-transition` that tweens a `transform` attribute). The
polyfill actually parses the attribute string (translate/rotate/scale/skewX/
skewY/matrix, composed via 2D matrix multiplication) rather than stubbing
identity — so `d3-interpolate`'s `parseSvg` gets a real consolidated matrix.

**Why:** An earlier version of this polyfill made `consolidate()` always
return `null`, which stopped the crash but made every transform tween
interpolate identity→identity regardless of the real start/end values. That
masked bugs — a test could pass while the actual animated attribute was
wrong. Verified the fix by rendering `SpeedometerChart`, awaiting past the
1000ms transition duration, and asserting `.data-group`'s final
`transform` attribute equals the expected `rotate(angle)` — not just that
nothing threw.

**How to apply:** When writing tests for any chart that uses
`.transition()` on a `transform` attribute (gauges/needles, animated
translate/rotate), you can assert on the real post-transition
`getAttribute('transform')` value — await past the transition's `.duration()`
(real timers; `vi.useFakeTimers()` doesn't drive d3-timer's
requestAnimationFrame loop reliably here). Don't reintroduce an
identity-only stub to "fix" a transform-related jsdom crash — check
`setupTests.tsx` first, since the real parser is probably already handling
it and the crash means something else (e.g. a transition still scheduled
against a node from an unmounted/replaced component).

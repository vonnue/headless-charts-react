Add a recognised chart-type variant (a named chart people ask for by name — waterfall,
streamgraph, histogram, donut, etc.) to an existing chart component, end to end. Follow
this process:

1. **Ground the definition.** If the chart type is a real, named visualization technique,
   confirm what it actually is and its known strengths/limitations from an authoritative
   source (e.g. its Wikipedia article) before writing anything — don't invent `useWhen`/
   `avoidWhen` bullets from guesswork. Note origin/history only if it sharpens a `useWhen`
   or `avoidWhen` bullet; skip trivia that doesn't change guidance.

2. **Check it isn't already covered.** Search `AGENTS.md`'s "If a chart type was named"
   table and the target chart's `meta.ts` `variants` for existing aliases before adding a
   duplicate.

3. **Edit the catalog.** Use the `chart-catalog-editor` agent (or do it inline for a small
   change) to add/update the variant in `src/components/<category>/<Chart>/meta.ts`:
   `kind: 'chart-type'`, real `aliases`, concrete `useWhen`/`avoidWhen`, a runnable
   `example`. Add a `decisionTree` entry in `src/catalog/decisions.ts` only if this answers
   a new kind of question — variant nuance stays in the variant, not the tree. Then run
   `yarn docs` and verify `yarn docs:check` passes.

4. **Add a Storybook story.** In `<Chart>.stories.tsx`, add a story for the variant
   following the existing `meta.story({...})` / `<ExistingStory>.extend({...})` pattern.
   If the variant's defining behavior needs data the chart's shared `data.json` doesn't
   have (e.g. negative values for a diverging/mirrored variant), add a small inline data
   array scoped to that story rather than mutating the shared fixture.

5. **Add a test that proves the distinguishing behavior**, not just that it renders. A
   render-only test (`expect(svg).toBeTruthy()`) doesn't verify the variant does what its
   `useWhen` claims — assert on the actual output the prop change causes (e.g. scale
   domain/ticks, path count, stacking order) using data chosen to make that behavior
   observable.

6. **Report** which files changed, the `yarn docs:check` and test results, and one line
   per new `useWhen`/`avoidWhen` bullet so the user can sanity-check the claims against
   their own understanding of the chart type before it ships.

Chart and variant: $ARGUMENTS

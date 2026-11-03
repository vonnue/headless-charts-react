# Storybook render audit

Renders every Storybook story in Playwright's Chromium and checks two tiers:

1. **Structural** (`checks.ts`): no NaN/Infinity geometry, no console or page
   errors, no degenerate axes, no gross overflow outside the SVG.
2. **Visual**: the story's `<svg>` against a committed baseline
   (`maxDiffPixels: 60`).

This is not part of `vitest run` or CI. Run it with:

```sh
yarn playwright install chromium     # once per machine
yarn test:storybook-render           # full audit, about 3 minutes
STORYBOOK_AUDIT_FILTER=barchart yarn test:storybook-render   # scoped
yarn tsc:audit                       # type-check these files
```

Playwright starts its own Storybook on port 6106 (`STORYBOOK_AUDIT_PORT`).
`global-setup.ts` reads the story index, fails on orphaned baselines and
writes this run's story list (a per-run file passed to the workers in
`STORYBOOK_AUDIT_IDS_FILE`) that `render.spec.ts` turns into one test per story.

The browser runs with `timezoneId: 'UTC'`, `locale: 'en-US'`, a fixed "now"
(2026-01-15T12:00:00Z, via `page.clock.setFixedTime`) and a seeded
`Math.random`, so date-dependent and random-data stories render identically
on any machine, in any timezone, on any day.

## Baselines

Baselines are per platform: `render.spec.ts-snapshots/<story-id>-<platform>.png`.
macOS and Linux rasterise text differently, by far more than 60 pixels, so
one image can't serve both. The committed set is **linux**, generated on this
repo's pinned Playwright (see `package.json`) with headless Chromium.
`playwright`, `@playwright/test` and `@vitest/browser-playwright` must stay on
the same Playwright version (bump them together), since a different Chromium
build can shift pixels.

- A normal run never writes baselines (`updateSnapshots: 'none'`). A missing
  baseline **fails** the story on Linux and whenever `CI` is set. On other
  platforms (no committed set yet) the story runs the structural tier only,
  with a printed warning and a `no-baseline` annotation.
- To add or refresh baselines (a new story, an intentional visual change, or a
  first macOS set), run on that platform:

  ```sh
  STORYBOOK_AUDIT_FILTER=<story ids> yarn test:storybook-render:update
  ```

  Review the PNGs in `git diff` before committing. The update run also deletes
  baselines for stories that no longer exist or are exempt (below); a normal
  run fails on them.

## Stories without a baseline

- `KNOWN_BROKEN` in `shared.ts`: stories broken by a filed bug, each with
  that bug's exact symptoms. The story fails if it reports anything beyond
  those symptoms (a new break), or if the bug's signature stops appearing
  (the bug is fixed and the entry needs removing).
- `LIVE_UPDATING`: stories that re-render on a timer; structural tier only.

`Math.random` is seeded before each story loads so random demo data is stable.

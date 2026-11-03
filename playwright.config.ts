import { defineConfig } from '@playwright/test';
import { AUDIT_BASE_URL, AUDIT_PORT } from './tests/storybook-render-audit/shared';

// Config for the Storybook render audit only (tests/storybook-render-audit/).
// This project renders every story in a real browser and checks structural
// invariants plus visual regressions — separate in purpose and cost from the
// jsdom-based unit tests in vite.config.ts.
export default defineConfig({
  testDir: 'tests/storybook-render-audit',
  globalSetup: './tests/storybook-render-audit/global-setup.ts',
  // One test per story (see render.spec.ts), so stories run across workers
  // and a retry reruns only the story that failed.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  // Per story: navigation + networkidle + ~1.2s for D3 transitions to settle.
  timeout: 60_000,
  // Never write a missing baseline as a side effect of a normal run — on a
  // platform without baselines the run would otherwise "pass" against images
  // it just generated. Only `yarn test:storybook-render:update`
  // (--update-snapshots) creates or changes baselines.
  updateSnapshots: 'none',
  // Baselines are per platform (`<story-id>-<platform>.png`): font
  // rasterisation differs between macOS and Linux by far more than the
  // 60px budget below, so one shared image can't serve both. See
  // tests/storybook-render-audit/README.md.
  snapshotPathTemplate: '{testDir}/{testFileName}-snapshots/{arg}-{platform}{ext}',
  expect: {
    // An absolute pixel budget, not a ratio: screenshots are cropped to just
    // the <svg>, and a ratio large enough to absorb font-antialiasing noise
    // (checked empirically: ~2%) is also large enough to miss a real few-
    // pixel positional shift concentrated at a chart's edges (verified by
    // deliberately reintroducing a real bug and confirming a ratio-based
    // threshold let it through). 60px total is generous for antialiasing
    // noise on a typical chart image but won't absorb an edge-bar shift of
    // more than a couple of pixels.
    toHaveScreenshot: { maxDiffPixels: 60 },
  },
  use: {
    baseURL: AUDIT_BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Pin what date and number formatting depend on, so axis labels and
    // local-time story data don't differ between machines. render.spec.ts
    // also freezes "now" (page.clock) for stories that use new Date().
    timezoneId: 'UTC',
    locale: 'en-US',
  },
  webServer: {
    // Playwright owns a fresh server on a dedicated port. Set
    // STORYBOOK_AUDIT_REUSE=1 to attach to one you already started on that
    // port (only if you know it is fresh — see the agent's notes).
    // `run -B` runs the storybook binary directly (not the package.json
    // script, which hard-codes -p 6006), so only this port is passed.
    command: `yarn run -B storybook dev --ci -p ${AUDIT_PORT}`,
    url: `${AUDIT_BASE_URL}/index.json`,
    reuseExistingServer: !!process.env.STORYBOOK_AUDIT_REUSE,
    timeout: 120_000,
  },
});

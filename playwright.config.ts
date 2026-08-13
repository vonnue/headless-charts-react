import { defineConfig } from '@playwright/test';

// Config for the Storybook render audit only (tests/storybook-render-audit/).
// This project renders every story in a real browser and checks structural
// invariants plus visual regressions — separate in purpose and cost from the
// jsdom-based unit tests in vite.config.ts.
export default defineConfig({
  testDir: 'tests/storybook-render-audit',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  // This one test loops over every audited story (each needs ~1.2s to let
  // D3 transitions settle, plus navigation/networkidle), not the per-test
  // budget a unit test needs. Measured: a full 272-story run took ~10.1min,
  // right at a 10min timeout — 20min gives real margin.
  timeout: 20 * 60_000,
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
    baseURL: 'http://localhost:6006',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'yarn storybook',
    url: 'http://localhost:6006',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});

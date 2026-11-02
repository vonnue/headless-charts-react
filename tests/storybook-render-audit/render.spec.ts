import fs from 'node:fs';
import { test, expect, type ConsoleMessage } from '@playwright/test';
import { runStructuralChecks, waitForTransitionsToSettle } from './checks';
import { STORY_IDS_FILE } from './shared';

/**
 * Console "Failed to load resource" errors for these Storybook dev-server
 * assets are tooling noise, not chart bugs: builder-vite injects
 * `/vite-inject-mocker-entry.js` into iframe.html, and a server that has
 * desynced from its config (or a different Storybook on the same port)
 * answers it with a 404. Only that exact message for exactly these URLs is
 * ignored — JS errors, and 404s for anything else, still fail the story.
 */
const IGNORED_RESOURCE_URLS = [/\/vite-inject-mocker-entry\.js(\?.*)?$/];

function isIgnoredConsoleError(msg: ConsoleMessage): boolean {
  const url = msg.location()?.url ?? '';
  return (
    msg.text().startsWith('Failed to load resource') &&
    IGNORED_RESOURCE_URLS.some((re) => re.test(url))
  );
}

/**
 * Stories that are broken on main by already-filed, pre-existing bugs, keyed
 * by story id. They run as `test.fail()`: the audit stays green while the bug
 * is open, and turns red ("expected to fail, but passed") the moment it is
 * fixed, so the entry has to be removed together with the fix. No baseline is
 * taken for them — a screenshot of a broken render is not a reference image.
 * Add an entry only with a filed issue number; never to hide a new failure.
 */
const KNOWN_BROKEN: Record<string, string> = {
  'distribution-piechart-intro--custom-style': '#18',
  'linear-barchart-intro--styled': '#19',
  'linear-barchart-intro--negative-styling': '#19',
  'flow-network-tooltip--style-node-tooltip': '#20',
  'flow-network-tooltip--node-tooltip-custom-keys': '#20',
  'flow-network-tooltip--node-tooltip-custom-html': '#20',
  'flow-network-tooltip--edge-tooltip': '#20',
  'flow-network-tooltip--edge-tooltip-style-with-class-name': '#20',
  'flow-network-tooltip--edge-tooltip-custom-keys': '#20',
};

/**
 * Stories that re-render on a `setInterval` with fresh data (live demos).
 * Their settled frame depends on how many ticks fired before the screenshot,
 * so a pixel baseline is meaningless; they get the structural tier only.
 */
const LIVE_UPDATING = new Set([
  'distribution-piechart-intro--pie-chart-race',
  'gauge-bulletchart-intro--updating-data',
  'gauge-lineargauge-intro--updating-data',
  'gauge-ringgauge-intro--updating-data',
]);

/**
 * Some stories build their data with Math.random() at load time. Seed it
 * (mulberry32) before any page script runs, so each story renders the same
 * data on every run and its baseline is stable.
 */
function seedMathRandom(seed: number): void {
  let a = seed >>> 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Written by global-setup.ts, which runs after the webServer is up and before
// this file is loaded. One test per story: stories run in parallel across
// workers, a retry reruns only the failing story, and one failure can't stop
// the audit of the rest.
const storyIds: string[] = fs.existsSync(STORY_IDS_FILE)
  ? JSON.parse(fs.readFileSync(STORY_IDS_FILE, 'utf8'))
  : [];

for (const storyId of storyIds) {
  test(storyId, async ({ page }, testInfo) => {
    const knownIssue = KNOWN_BROKEN[storyId];
    test.fail(!!knownIssue, `known broken story, tracked in ${knownIssue}`);

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !isIgnoredConsoleError(msg)) consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.addInitScript(seedMathRandom, 0x5eed);
    await page.goto(`/iframe.html?id=${storyId}&viewMode=story`);
    await page.waitForLoadState('networkidle');
    await waitForTransitionsToSettle(page);

    const structuralIssues = await runStructuralChecks(page);
    const lines = [
      ...consoleErrors.map((e) => `console error: ${e}`),
      ...structuralIssues.map((i) => `[${i.check}] ${i.message}`),
    ];

    // Both tiers are soft assertions, so a structural break and a visual diff
    // are reported together rather than the first masking the second.
    expect.soft(lines, `structural issues in story "${storyId}"`).toEqual([]);
    if (knownIssue) return;
    if (LIVE_UPDATING.has(storyId)) {
      testInfo.annotations.push({
        type: 'structural-only',
        description: 'live-updating story; no visual baseline',
      });
      return;
    }

    // Visual regression, scoped to the <svg> itself (not the whole page): a
    // subtle few-pixel positional shift concentrated at a chart's edges is a
    // small fraction of a full-page screenshot's total pixels — cropping to
    // just the chart makes the same shift a much larger, more
    // reliably-detected fraction of the compared image.
    //
    // Baselines are per platform. When this platform has none for the story,
    // a normal run skips the comparison (with an annotation) instead of
    // failing or silently writing one; an update run creates it.
    const baseline = testInfo.snapshotPath(`${storyId}.png`);
    if (testInfo.config.updateSnapshots === 'none' && !fs.existsSync(baseline)) {
      testInfo.annotations.push({
        type: 'no-baseline',
        description: `no ${process.platform} baseline for ${storyId}; visual tier skipped (run yarn test:storybook-render:update to create it)`,
      });
      return;
    }
    await expect.soft(page.locator('svg').first()).toHaveScreenshot(`${storyId}.png`);
  });
}

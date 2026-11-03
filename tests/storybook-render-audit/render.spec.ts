import fs from 'node:fs';
import { test, expect, type ConsoleMessage } from '@playwright/test';
import { runStructuralChecks, waitForTransitionsToSettle } from './checks';
import { AUDIT_BASE_URL, KNOWN_BROKEN, LIVE_UPDATING, STORY_IDS_ENV } from './shared';

/**
 * A console "Failed to load resource" error for builder-vite's injected
 * `/vite-inject-mocker-entry.js` is dev-server tooling noise, not a chart bug:
 * the dev server can answer it with a 404 (e.g. when it is requested with a
 * cache-busting query string, or when node_modules resolves outside the
 * project root). Only that message for exactly that path on the audit's own
 * server (any query string) is ignored. JS errors, and 404s for anything
 * else, including the same file name under another path or origin, still
 * fail the story.
 */
const IGNORED_RESOURCE_PATH = '/vite-inject-mocker-entry.js';

function isIgnoredConsoleError(msg: ConsoleMessage): boolean {
  if (!msg.text().startsWith('Failed to load resource')) return false;
  try {
    const url = new URL(msg.location()?.url ?? '');
    return url.origin === AUDIT_BASE_URL && url.pathname === IGNORED_RESOURCE_PATH;
  } catch {
    return false;
  }
}

/** Console text plus the URL it came from, so a 404 names the resource. */
function describeConsoleError(msg: ConsoleMessage): string {
  const url = msg.location()?.url;
  return url ? `${msg.text()} (${url})` : msg.text();
}

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

/**
 * Some stories build dates from `new Date()` (relative to today) or in local
 * time. The config pins the browser's timezone and locale; this pins "now",
 * so those stories render the same axis on every day of the year. Only Date
 * is frozen; timers, rAF and transitions keep running in real time.
 */
const FIXED_NOW = new Date('2026-01-15T12:00:00Z');

// Written by global-setup.ts, which runs after the webServer is up and before
// this file is loaded. One test per story: stories run in parallel across
// workers, a retry reruns only the failing story, and one failure can't stop
// the audit of the rest.
const storyIdsFile = process.env[STORY_IDS_ENV];
const storyIds: string[] =
  storyIdsFile && fs.existsSync(storyIdsFile) ? JSON.parse(fs.readFileSync(storyIdsFile, 'utf8')) : [];

/**
 * A missing baseline is an error on Linux (the platform the committed
 * baselines are for) and in CI, so a deleted or never-generated baseline
 * can't pass silently. Elsewhere it is a visible warning, so a macOS or
 * Windows run can still use the structural tier.
 */
const MISSING_BASELINE_IS_ERROR = process.platform === 'linux' || !!process.env.CI;

for (const storyId of storyIds) {
  test(storyId, async ({ page }, testInfo) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !isIgnoredConsoleError(msg)) consoleErrors.push(describeConsoleError(msg));
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.clock.setFixedTime(FIXED_NOW);
    await page.addInitScript(seedMathRandom, 0x5eed);
    await page.goto(`/iframe.html?id=${storyId}&viewMode=story`);
    await page.waitForLoadState('networkidle');
    await waitForTransitionsToSettle(page);

    const structuralIssues = await runStructuralChecks(page);
    const lines = [
      ...consoleErrors.map((e) => `console error: ${e}`),
      ...structuralIssues.map((i) => `[${i.check}] ${i.message}`),
    ];

    const known = KNOWN_BROKEN[storyId];
    if (known) {
      testInfo.annotations.push({ type: 'known-broken', description: `tracked in ${known.issue}` });
      const unexpected = lines.filter((l) => !known.symptoms.some((re) => re.test(l)));
      expect(unexpected, `issues in known-broken story "${storyId}" beyond ${known.issue}`).toEqual([]);
      expect(
        lines.some((l) => known.symptoms[0].test(l)),
        `${known.issue} no longer reproduces in "${storyId}"; if it is fixed, remove the story from KNOWN_BROKEN`
      ).toBe(true);
      return;
    }

    // Both tiers are soft assertions, so a structural break and a visual diff
    // are reported together rather than the first masking the second.
    expect.soft(lines, `structural issues in story "${storyId}"`).toEqual([]);
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
    // Baselines are per platform; an update run creates missing ones.
    const baseline = testInfo.snapshotPath(`${storyId}.png`);
    if (testInfo.config.updateSnapshots === 'none' && !fs.existsSync(baseline)) {
      const message = `no ${process.platform} baseline for ${storyId} (run yarn test:storybook-render:update to create it)`;
      if (MISSING_BASELINE_IS_ERROR) throw new Error(message);
      console.warn(`[storybook-render-audit] WARNING: ${message}; visual tier skipped`);
      testInfo.annotations.push({ type: 'no-baseline', description: `${message}; visual tier skipped` });
      return;
    }
    await expect.soft(page.locator('svg').first()).toHaveScreenshot(`${storyId}.png`);
  });
}

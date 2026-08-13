import { test, expect } from '@playwright/test';
import { runStructuralChecks, waitForTransitionsToSettle } from './checks';

interface StoryIndexEntry {
  id: string;
  title: string;
  name: string;
  type: 'story' | 'docs';
}

interface StoryIndex {
  entries: Record<string, StoryIndexEntry>;
}

/**
 * Optional substring/regex filter on story id, set by the calling agent to
 * scope the audit to just the charts touched by the current change instead
 * of every story in the library (full audit is the default, no env var
 * set). Example: STORYBOOK_AUDIT_FILTER=columnchart-grouped-time-scaling
 */
function storyMatchesFilter(id: string): boolean {
  const filter = process.env.STORYBOOK_AUDIT_FILTER;
  if (!filter) return true;
  return new RegExp(filter, 'i').test(id);
}

async function fetchStoryIds(baseURL: string): Promise<string[]> {
  const res = await fetch(`${baseURL}/index.json`);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch Storybook index.json (${res.status}) — is the dev server actually up at ${baseURL}?`
    );
  }
  const index: StoryIndex = await res.json();
  return Object.values(index.entries)
    .filter((e) => e.type === 'story')
    .map((e) => e.id)
    .filter(storyMatchesFilter);
}

test('every story renders structurally sound output with no visual regression', async ({
  page,
  baseURL,
}, testInfo) => {
  const storyIds = await fetchStoryIds(baseURL!);
  expect(storyIds.length, 'expected at least one story to audit — check STORYBOOK_AUDIT_FILTER').toBeGreaterThan(0);

  const failures: string[] = [];

  for (const storyId of storyIds) {
    // Wrapped in try/catch, not left to `test.step`'s own propagation: an
    // uncaught throw from either assertion below aborts this whole `for`
    // loop, silently skipping every story after the first failure — which
    // defeats the point of a full-library audit (or baseline generation
    // run). Every story gets checked regardless of earlier failures; the
    // step is still marked failed in the report via the rethrow at the end.
    try {
      await test.step(storyId, async () => {
        const consoleErrors: string[] = [];
        const onConsole = (msg: import('@playwright/test').ConsoleMessage) => {
          if (msg.type() === 'error') consoleErrors.push(msg.text());
        };
        page.on('console', onConsole);
        const onPageError = (err: Error) => consoleErrors.push(err.message);
        page.on('pageerror', onPageError);

        await page.goto(`/iframe.html?id=${storyId}&viewMode=story`);
        await page.waitForLoadState('networkidle');
        await waitForTransitionsToSettle(page);

        page.off('console', onConsole);
        page.off('pageerror', onPageError);

        const structuralIssues = await runStructuralChecks(page);

        if (consoleErrors.length > 0 || structuralIssues.length > 0) {
          const lines = [
            ...consoleErrors.map((e) => `  console error: ${e}`),
            ...structuralIssues.map((i) => `  [${i.check}] ${i.message}`),
          ];
          failures.push(`${storyId} (structural):\n${lines.join('\n')}`);
          expect(lines, `structural issues in story "${storyId}"`).toHaveLength(0);
        }

        // Visual regression — separate from the structural assertion above
        // so a screenshot diff and a structural break are both reported
        // rather than one masking the other. Scoped to the <svg> itself
        // (not the whole page): a subtle few-pixel positional shift
        // concentrated at a chart's edges is a small fraction of a
        // full-page screenshot's total pixels — cropping to just the chart
        // makes the same shift a much larger, more reliably-detected
        // fraction of the compared image.
        await expect(page.locator('svg').first()).toHaveScreenshot(`${storyId}.png`);
      });
    } catch (err) {
      if (!failures.some((f) => f.startsWith(`${storyId} (`))) {
        // Only reached for a visual-regression failure (a structural one
        // already recorded its own entry above before throwing) or an
        // unexpected error (e.g. navigation failure) — either way, record
        // it so the end-of-run summary and final assertion see it.
        failures.push(`${storyId} (screenshot or unexpected error):\n  ${err}`);
      }
    }
  }

  await testInfo.attach('summary', {
    body: `Audited ${storyIds.length} stories. ${failures.length} had structural/console/visual issues.`,
    contentType: 'text/plain',
  });

  expect(
    failures,
    `${failures.length}/${storyIds.length} stories had issues — see attached "summary" and individual step failures above for details`
  ).toEqual([]);
});

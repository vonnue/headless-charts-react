import path from 'node:path';

/**
 * Dedicated port for the audit's own Storybook dev server, so the audit never
 * attaches to (or kills) a developer's `yarn storybook` on :6006 or a server
 * running from another worktree. Override with STORYBOOK_AUDIT_PORT.
 */
export const AUDIT_PORT = Number(process.env.STORYBOOK_AUDIT_PORT ?? 6106);
export const AUDIT_BASE_URL = `http://localhost:${AUDIT_PORT}`;

export const AUDIT_DIR = path.resolve('tests/storybook-render-audit');
export const SNAPSHOT_DIR = path.join(AUDIT_DIR, 'render.spec.ts-snapshots');

/**
 * global-setup.ts (which runs after Playwright's webServer is up and before
 * test files are loaded) writes the story ids to a per-run file in this
 * directory and passes its path in STORY_IDS_ENV, which Playwright hands on
 * to the workers; render.spec.ts reads it at module scope to declare one test
 * per story. Per run (not one shared file) so two concurrent audits from the
 * same checkout can't overwrite each other's list. Lives outside
 * test-results/, which Playwright empties at the start of each run.
 */
export const STORY_IDS_DIR = path.resolve('node_modules/.cache/storybook-render-audit');
export const STORY_IDS_ENV = 'STORYBOOK_AUDIT_IDS_FILE';

/** Baseline files are `<story-id>-<platform>.png` (see snapshotPathTemplate). */
export const BASELINE_RE = /^(.+)-(darwin|linux|win32)\.png$/;

/**
 * Stories that are broken on main by already-filed, pre-existing bugs, keyed
 * by story id, each with the exact symptoms that bug produces. The story
 * passes only while every reported line matches one of its symptoms and at
 * least one line matches the first (the bug's signature):
 * - a line matching none of them is a new break on top of the known one, and
 *   fails the story like any other;
 * - no signature line means the bug looks fixed, which also fails the story,
 *   so the entry is removed together with the fix.
 * No baseline is taken for them (a screenshot of a broken render is not a
 * reference image). Add an entry only with a filed issue number; never to
 * hide a new failure.
 */
export interface KnownBroken {
  issue: string;
  symptoms: [RegExp, ...RegExp[]];
}

const PIE_NAN_TRANSFORM: KnownBroken = {
  issue: '#18',
  symptoms: [/translate\(NaN,NaN\)/],
};
export const KNOWN_BROKEN: Record<string, KnownBroken> = {
  'distribution-piechart-intro--custom-style': PIE_NAN_TRANSFORM,
  'linear-barchart-intro--styled': {
    issue: '#19',
    symptoms: [/^console error: Error: <rect> attribute height: A negative value is not valid\./],
  },
  'linear-barchart-intro--negative-styling': {
    issue: '#19',
    symptoms: [
      /^console error: Error: <rect> attribute width: Expected length, "NaN"\./,
      /^\[no-invalid-numbers\] <rect [^>]*> has width="NaN"/,
    ],
  },
};

/**
 * Stories that re-render on a `setInterval` with fresh data (live demos).
 * Their settled frame depends on how many ticks fired before the screenshot,
 * so a pixel baseline is meaningless; they get the structural tier only.
 */
export const LIVE_UPDATING = new Set([
  'distribution-piechart-intro--pie-chart-race',
  'gauge-bulletchart-intro--updating-data',
  'gauge-lineargauge-intro--updating-data',
  'gauge-ringgauge-intro--updating-data',
]);

/** Stories that are never compared against a baseline. */
export function isExemptFromBaseline(storyId: string): boolean {
  return storyId in KNOWN_BROKEN || LIVE_UPDATING.has(storyId);
}

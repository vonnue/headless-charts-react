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
 * Written by global-setup.ts (which runs after Playwright's webServer is up and
 * before test files are loaded), read at module scope by render.spec.ts so it
 * can declare one test per story. Lives outside test-results/, which
 * Playwright empties at the start of each run.
 */
export const STORY_IDS_FILE = path.resolve(
  'node_modules/.cache/storybook-render-audit/story-ids.json'
);

/** Baseline files are `<story-id>-<platform>.png` (see snapshotPathTemplate). */
export const BASELINE_RE = /^(.+)-(darwin|linux|win32)\.png$/;

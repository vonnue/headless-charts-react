import fs from 'node:fs';
import path from 'node:path';
import type { FullConfig } from '@playwright/test';
import {
  AUDIT_BASE_URL,
  BASELINE_RE,
  SNAPSHOT_DIR,
  STORY_IDS_DIR,
  STORY_IDS_ENV,
  isExemptFromBaseline,
} from './shared';

interface StoryIndexEntry {
  id: string;
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

export default async function globalSetup(config: FullConfig): Promise<() => void> {
  const res = await fetch(`${AUDIT_BASE_URL}/index.json`);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch Storybook index.json (${res.status}) — is the dev server actually up at ${AUDIT_BASE_URL}?`
    );
  }
  const index: StoryIndex = await res.json();
  const allIds = Object.values(index.entries)
    .filter((e) => e.type === 'story')
    .map((e) => e.id);

  // Orphaned baselines: PNGs that are never compared, so they'd otherwise rot
  // in the tree forever: stories that no longer exist (renamed or deleted),
  // and stories exempt from the visual tier (KNOWN_BROKEN, LIVE_UPDATING).
  // An update run deletes them; a normal run fails and lists them.
  const known = new Set(allIds);
  const orphans = fs.existsSync(SNAPSHOT_DIR)
    ? fs.readdirSync(SNAPSHOT_DIR).filter((f) => {
        const m = BASELINE_RE.exec(f);
        return !m || !known.has(m[1]) || isExemptFromBaseline(m[1]);
      })
    : [];
  if (orphans.length > 0) {
    if (config.updateSnapshots !== 'none') {
      for (const f of orphans) fs.rmSync(path.join(SNAPSHOT_DIR, f));
      console.log(`Deleted ${orphans.length} orphaned baseline(s):\n  ${orphans.join('\n  ')}`);
    } else {
      throw new Error(
        `${orphans.length} baseline(s) in ${SNAPSHOT_DIR} match no story in index.json. ` +
          `Delete them, or run \`yarn test:storybook-render:update\` (which prunes them):\n  ${orphans.join('\n  ')}`
      );
    }
  }

  const ids = allIds.filter(storyMatchesFilter);
  if (ids.length === 0) {
    throw new Error('expected at least one story to audit — check STORYBOOK_AUDIT_FILTER');
  }
  fs.mkdirSync(STORY_IDS_DIR, { recursive: true });
  const idsFile = path.join(STORY_IDS_DIR, `story-ids-${process.pid}.json`);
  fs.writeFileSync(idsFile, JSON.stringify(ids));
  // Env vars set here reach the test-file loader and every worker.
  process.env[STORY_IDS_ENV] = idsFile;
  // Returned function is Playwright's global teardown for this run.
  return () => fs.rmSync(idsFile, { force: true });
}

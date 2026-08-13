Run the Storybook render audit — checks that stories actually render correctly in a
real browser (structural invariants + visual regression against committed baselines),
not just that jsdom unit tests pass. Use the `storybook-render-auditor` agent for this
rather than running Playwright directly yourself, so failures get triaged (fixed inline
vs. filed via `issue-writer`) rather than just dumped as raw output.

Arguments (`$ARGUMENTS`), if given, scope the audit — e.g. a chart name, story title
fragment, or story-id substring/regex. Pass it through as `STORYBOOK_AUDIT_FILTER`. With
no arguments, audit the full story library.

1. **Confirm Storybook's dev server is fresh**, not one that's been running through
   config/dependency changes without a restart (its Vite dependency cache can desync and
   produce unrelated errors that look like real failures). If unsure, restart it:
   `lsof -ti :6006 | xargs -r kill && (nohup yarn storybook > /tmp/storybook.log 2>&1 &) && sleep 10`.
2. **Launch the `storybook-render-auditor` agent**, passing the scope (`$ARGUMENTS` if
   given) and the reason you're running it (standalone sanity check vs. auditing a
   specific just-merged change — the agent's failure-handling differs slightly by
   context, see its own instructions).
3. **Relay its report** — what passed, what failed, what got fixed inline, what got
   filed as an issue and why. Don't just paste raw Playwright output; the agent's own
   report is already structured for this.

#!/usr/bin/env bash
# SubagentStart hook: drops a timestamp marker keyed by agent_id so the
# matching SubagentStop hook (subagent-stop-memory-check.sh) can tell whether
# this specific run touched its agent-memory directory.
set -euo pipefail

# Fail open if jq isn't installed — a missing dependency on a teammate's
# machine shouldn't error out on every subagent start.
command -v jq >/dev/null 2>&1 || exit 0

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
INPUT="$(cat)"

AGENT_ID="$(printf '%s' "$INPUT" | jq -r '.agent_id // empty')"
[ -z "$AGENT_ID" ] && exit 0

MARKER_DIR="$PROJECT_DIR/.claude/agent-memory/.run-markers"
mkdir -p "$MARKER_DIR"

# Prune stale markers left behind by subagents that were killed rather than
# stopped gracefully (so SubagentStop never ran to clean up after itself).
find "$MARKER_DIR" -name '*.marker' -mtime +1 -delete 2>/dev/null || true

touch "$MARKER_DIR/$AGENT_ID.marker"
exit 0

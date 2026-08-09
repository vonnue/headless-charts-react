#!/usr/bin/env bash
# SubagentStop hook: nudges an agent to write a memory entry if its run
# didn't touch its agent-memory directory. Which agents are covered is
# determined by their own .claude/agents/<agent_type>.md declaring a
# `memory:` frontmatter field — not by whether the directory already
# exists — so a newly added agent is covered automatically as soon as it
# declares memory, with no separate "remember to mkdir" step. The directory
# is created here on first run if needed.
#
# Relies on the paired SubagentStart hook (subagent-start-memory-marker.sh)
# having dropped a marker file keyed by agent_id, so "touched" means
# "modified after this specific run started" rather than "ever modified."
set -euo pipefail

# Fail open if jq isn't installed — a missing dependency on a teammate's
# machine shouldn't error out on every subagent stop.
command -v jq >/dev/null 2>&1 || exit 0

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
INPUT="$(cat)"

# Required per SubagentStop contract: once we've already nudged and the
# agent kept going, stop_hook_active is true on the next stop — never block
# again, or this loops until the hook block cap kicks in.
STOP_HOOK_ACTIVE="$(printf '%s' "$INPUT" | jq -r '.stop_hook_active // false')"
[ "$STOP_HOOK_ACTIVE" = "true" ] && exit 0

AGENT_TYPE="$(printf '%s' "$INPUT" | jq -r '.agent_type // empty')"
AGENT_ID="$(printf '%s' "$INPUT" | jq -r '.agent_id // empty')"
[ -z "$AGENT_TYPE" ] && exit 0
[ -z "$AGENT_ID" ] && exit 0

AGENT_DEF="$PROJECT_DIR/.claude/agents/$AGENT_TYPE.md"
# Not one of our custom agents, or doesn't declare persistent memory
# (e.g. general-purpose, Explore) — skip.
[ -f "$AGENT_DEF" ] || exit 0
grep -qE '^memory:[[:space:]]*[^[:space:]]' "$AGENT_DEF" || exit 0

MEM_DIR="$PROJECT_DIR/.claude/agent-memory/$AGENT_TYPE"
mkdir -p "$MEM_DIR"

MARKER="$PROJECT_DIR/.claude/agent-memory/.run-markers/$AGENT_ID.marker"
if [ ! -f "$MARKER" ]; then
  # No start marker (e.g. hook added mid-session) — fail open rather than
  # nudge on a false premise.
  exit 0
fi

TOUCHED="$(find "$MEM_DIR" -type f -newer "$MARKER" 2>/dev/null | head -1)"
rm -f "$MARKER"

if [ -n "$TOUCHED" ]; then
  exit 0
fi

REASON="Your agent-memory directory (.claude/agent-memory/$AGENT_TYPE/) wasn't modified this run. Before finishing: was there a mistake you made and got corrected on, a pattern you'd repeat, or an approach that got confirmed as right? If so, write it now per your Persistent Agent Memory instructions. If genuinely nothing from this session is memory-worthy, you can stop as normal."

jq -n --arg reason "$REASON" '{
  decision: "block",
  reason: $reason,
  hookSpecificOutput: {
    hookEventName: "SubagentStop",
    additionalContext: $reason
  }
}'
exit 0

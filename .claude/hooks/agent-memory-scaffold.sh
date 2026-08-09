#!/usr/bin/env bash
# PostToolUse hook (Write|Edit): when a .claude/agents/<name>.md file is
# written and declares a `memory:` frontmatter field, immediately scaffold
# its .claude/agent-memory/<name>/ dir with an empty MEMORY.md. Covers the
# gap the SubagentStart/SubagentStop marker hooks leave: those only create
# the dir the first time the agent actually runs, so a freshly authored
# agent has no memory folder until someone spawns it.
set -euo pipefail

command -v jq >/dev/null 2>&1 || exit 0

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
INPUT="$(cat)"

FILE="$(printf '%s' "$INPUT" | jq -r '.tool_response.filePath // .tool_input.file_path // empty')"
[ -z "$FILE" ] && exit 0

case "$FILE" in
  */.claude/agents/*.md) ;;
  *) exit 0 ;;
esac

[ -f "$FILE" ] || exit 0
grep -qE '^memory:[[:space:]]*[^[:space:]]' "$FILE" || exit 0

NAME="$(basename "$FILE" .md)"
MEM_DIR="$PROJECT_DIR/.claude/agent-memory/$NAME"
mkdir -p "$MEM_DIR"
[ -f "$MEM_DIR/MEMORY.md" ] || : > "$MEM_DIR/MEMORY.md"

exit 0

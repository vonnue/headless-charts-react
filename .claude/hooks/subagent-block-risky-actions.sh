#!/usr/bin/env bash
# PreToolUse/Bash hook: hard-blocks externally visible / hard-to-reverse git
# and gh commands when run from a subagent context (agent_type set), backing
# up the prompt-level guardrail in .claude/agents/*.md with actual
# enforcement. Never fires for the main thread (agent_type empty), so the
# user can still ask the top-level assistant to commit/push/file issues
# directly — this only stops a subagent from doing it unprompted.
#
# One carve-out: issue-writer's entire job is filing/updating GitHub issues,
# so `gh issue create/comment/edit` is allowed for that agent_type only.
# Everything else — git push/commit, gh issue close/delete, all gh pr and gh
# release actions — stays blocked even for issue-writer, matching its own
# stated guardrails (enforced here too, not just trusted from its prompt).
set -euo pipefail

INPUT="$(cat)"

# Fail closed if jq isn't installed: without it we can't parse the command,
# so block every Bash call from a subagent (exit 2 = deny, stderr is shown
# to the agent). The main thread (no agent_type) is still allowed, so a
# missing jq never locks the user out of the top-level session.
if ! command -v jq >/dev/null 2>&1; then
  if printf '%s' "$INPUT" | grep -Eq '"agent_type"[[:space:]]*:[[:space:]]*"[^"]'; then
    echo "Blocked: .claude/hooks/subagent-block-risky-actions.sh needs 'jq' to vet subagent Bash commands, and jq is not installed. Install jq (e.g. 'brew install jq' or 'apt-get install jq'), or report back to the calling agent so the main session can run this command." >&2
    exit 2
  fi
  exit 0
fi

AGENT_TYPE="$(printf '%s' "$INPUT" | jq -r '.agent_type // empty')"
[ -z "$AGENT_TYPE" ] && exit 0

CMD="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')"
[ -z "$CMD" ] && exit 0

GIT_RISKY_RE='(^|[;&|]|`)[[:space:]]*git[[:space:]]+(push|commit)\b'
GH_ISSUE_WRITE_RE='(^|[;&|]|`)[[:space:]]*gh[[:space:]]+issue[[:space:]]+(create|comment|edit)\b'
GH_OTHER_RISKY_RE='(^|[;&|]|`)[[:space:]]*gh[[:space:]]+(issue[[:space:]]+(close|delete)|pr[[:space:]]+(create|comment|close|merge|edit|delete)|release[[:space:]]+(create|edit|delete))\b'

BLOCK=""
if printf '%s' "$CMD" | grep -Eq "$GIT_RISKY_RE"; then
  BLOCK=1
elif printf '%s' "$CMD" | grep -Eq "$GH_OTHER_RISKY_RE"; then
  BLOCK=1
elif printf '%s' "$CMD" | grep -Eq "$GH_ISSUE_WRITE_RE" && [ "$AGENT_TYPE" != "issue-writer" ]; then
  BLOCK=1
fi

if [ -n "$BLOCK" ]; then
  REASON="Blocked for subagent '$AGENT_TYPE': externally visible/hard-to-reverse git or gh action ('$CMD'). Per this agent's guardrails, these require the user's explicit instruction for this specific action. Report your findings/output back to the calling agent or user instead — they can run this themselves, or ask for the issue-writer agent if the goal is filing GitHub issues."
  jq -n --arg reason "$REASON" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    }
  }'
fi
exit 0

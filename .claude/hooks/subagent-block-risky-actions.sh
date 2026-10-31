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
# release actions, and gh api — stays blocked even for issue-writer,
# matching its own stated guardrails (enforced here too, not just trusted
# from its prompt).
#
# Fails closed: Claude Code only treats exit 2 (or a deny JSON) as a block,
# so every failure path below exits 2. Tests:
# .claude/hooks/tests/subagent-block-risky-actions.test.sh
set -euo pipefail

deny() { printf 'Blocked: %s\n' "$1" >&2; exit 2; }
trap 'deny "subagent-block-risky-actions.sh failed unexpectedly (line $LINENO); refusing to run the command."' ERR

INPUT="$(cat)"

# Without jq we can't parse the command, so block every Bash call from a
# subagent. The main thread (no agent_type) is still allowed, so a missing
# jq never locks the user out of the top-level session. Newlines are
# flattened first so pretty-printed JSON is detected too.
if ! command -v jq >/dev/null 2>&1; then
  FLAT="${INPUT//[$'\n\r\t']/ }"
  if grep -Eq '"agent_type"[[:space:]]*:[[:space:]]*"[^"]' <<<"$FLAT"; then
    deny ".claude/hooks/subagent-block-risky-actions.sh needs 'jq' to vet subagent Bash commands, and jq is not installed. Install jq (e.g. 'brew install jq' or 'apt-get install jq'), or report back to the calling agent so the main session can run this command."
  fi
  exit 0
fi

# Here-strings, not pipes: with pipefail, `printf | grep -q` can fail on
# SIGPIPE for large input and silently skip the block.
AGENT_TYPE="$(jq -r '.agent_type // empty' <<<"$INPUT")" || deny "could not parse hook input as JSON."
[ -z "$AGENT_TYPE" ] && exit 0
CMD="$(jq -r '.tool_input.command // empty' <<<"$INPUT")" || deny "could not parse hook input as JSON."
[ -z "$CMD" ] && exit 0

# Deliberately conservative: git/gh may be preceded by any separator,
# whitespace, quote, `(`, `$(`, `{`, or a wrapper (command/env/exec/...),
# may be a path (/usr/bin/git), and may carry global options (-C dir,
# -c k=v, --git-dir=x, -R owner/repo). So `echo git push` blocks too.
PRE='(^|[;&|`({"'"'"'!$[:space:]]|\$\()[[:space:]]*((command|env|exec|sudo|nohup|xargs|time)[[:space:]]+([A-Za-z_][A-Za-z0-9_]*=[^[:space:]]*[[:space:]]+)*)?'
END='([[:space:];&|)}<>"'"'"'`]|$)'
GITBIN='([^[:space:];&|]*/)?git([[:space:]]+(-[Cc][[:space:]]*[^[:space:]]+|--(git-dir|work-tree|namespace|exec-path|config-env|super-prefix)[[:space:]]+[^[:space:]]+|--[a-z-]+(=[^[:space:]]+)?|-[a-zA-Z]))*[[:space:]]+'
GHBIN='([^[:space:];&|]*/)?gh([[:space:]]+(-R[[:space:]]*[^[:space:]]+|--repo([[:space:]]+|=)[^[:space:]]+))*[[:space:]]+'
GIT_RISKY_RE="${PRE}${GITBIN}(push|commit|send-pack|http-push)${END}"
# git aliases can smuggle push/commit: `git config alias.p push`, `git -c alias.p=push p`.
GIT_ALIAS_RE='alias\.[^[:space:]=]+([[:space:]]+|=)[^[:space:]]*(push|commit|send-pack)'
GH_ISSUE_WRITE_RE="${PRE}${GHBIN}issue[[:space:]]+(create|comment|edit|reopen)${END}"
GH_OTHER_RISKY_RE="${PRE}${GHBIN}(issue[[:space:]]+(close|delete|transfer|lock|unlock|pin|unpin)|pr[[:space:]]+(create|comment|close|merge|edit|delete|review|reopen|ready)|release[[:space:]]+(create|edit|delete|upload)|repo[[:space:]]+(create|delete|edit|rename|archive|fork)|label[[:space:]]+(create|edit|delete|clone)|workflow[[:space:]]+(run|enable|disable)|run[[:space:]]+(cancel|rerun|delete)|(secret|variable)[[:space:]]+(set|delete)|gist[[:space:]]+(create|edit|delete)|api)${END}"

# Join backslash-continued lines, and treat other newlines as `;`.
FLAT_CMD="${CMD//$'\\\n'/ }"
FLAT_CMD="${FLAT_CMD//[$'\n\r']/;}"
# Drop quotes and backslashes so 'git', "git", g"i"t, \git and $'git' all read as git.
NORM_CMD="${FLAT_CMD//[\"\'\\]/}"

# grep exits 1 for "no match" and >1 for errors; an error inside `if` would
# otherwise read as "no match" and allow the call.
matches() {
  local rc=0
  grep -Eiq -- "$1" <<<"$NORM_CMD" || rc=$?
  [ "$rc" -le 1 ] || deny "pattern match failed (grep exit $rc)."
  return "$rc"
}

BLOCK=""
if matches "$GIT_RISKY_RE" || matches "$GIT_ALIAS_RE" || matches "$GH_OTHER_RISKY_RE"; then
  BLOCK=1
elif [ "$AGENT_TYPE" != "issue-writer" ] && matches "$GH_ISSUE_WRITE_RE"; then
  BLOCK=1
fi

if [ -n "$BLOCK" ]; then
  # Truncate so `jq --arg` stays far below ARG_MAX for huge commands.
  SHORT_CMD="${CMD:0:500}"
  [ "${#CMD}" -gt 500 ] && SHORT_CMD="${SHORT_CMD}…"
  REASON="Blocked for subagent '${AGENT_TYPE:0:100}': externally visible/hard-to-reverse git or gh action ('$SHORT_CMD'). Per this agent's guardrails, these require the user's explicit instruction for this specific action. Report your findings/output back to the calling agent or user instead — they can run this themselves, or ask for the issue-writer agent if the goal is filing GitHub issues."
  jq -n --arg reason "$REASON" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    }
  }' || deny "$REASON"
fi
exit 0

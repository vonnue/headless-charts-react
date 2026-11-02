#!/usr/bin/env bash
# Tests for ../subagent-block-risky-actions.sh. Run: yarn test:hooks
# Needs bash and jq (jq is hidden from the hook for the no-jq cases).
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
HOOK="$HERE/../subagent-block-risky-actions.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
PASS=0
FAIL=0

# PATH without jq, for the fail-closed-without-jq cases.
mkdir -p "$TMP/nojq"
for b in bash cat grep printf env dirname; do ln -s "$(command -v "$b")" "$TMP/nojq/$b"; done
# PATH whose jq always errors, for the ERR/parse-failure cases.
mkdir -p "$TMP/badjq"
printf '#!/bin/sh\nexit 3\n' >"$TMP/badjq/jq" && chmod +x "$TMP/badjq/jq"

# run <path> <stdin-file> -> sets OUTCOME to block|allow|error:<rc>
run() {
  local out rc
  out="$(PATH="$1" bash "$HOOK" <"$2" 2>/dev/null)"
  rc=$?
  if [ "$rc" -eq 2 ] || { [ "$rc" -eq 0 ] && grep -q '"permissionDecision": "deny"' <<<"$out"; }; then
    OUTCOME=block
  elif [ "$rc" -eq 0 ]; then
    OUTCOME=allow
  else
    OUTCOME="error:$rc"
  fi
}

check() { # check <expected> <name> <path> <stdin-file>
  run "$3" "$4"
  if [ "$OUTCOME" = "$1" ]; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    printf 'FAIL: %s (expected %s, got %s)\n' "$2" "$1" "$OUTCOME"
  fi
}

# case <expected> <agent_type or ""> <command> [path]
case_() {
  local f="$TMP/in.json"
  if [ -n "$2" ]; then
    jq -cn --arg a "$2" --arg c "$3" '{agent_type:$a, tool_input:{command:$c}}' >"$f"
  else
    jq -cn --arg c "$3" '{tool_input:{command:$c}}' >"$f"
  fi
  check "$1" "[${2:-main}] $3" "${4:-$PATH}" "$f"
}

A=vitest-test-writer

# --- Blocked for subagents: plain and every reviewed bypass ---
for c in \
  'git push' 'git commit -m x' 'cd x && git push' $'ls\ngit push' $'git \\\n  push' \
  'git -C . push' 'git -C /workspace/hc-wt/x push origin HEAD' 'git -c user.name=x commit -m y' \
  'git --no-pager push' 'git --git-dir=.git push' 'command git push' 'env git push' \
  'env FOO=1 git push' '/usr/bin/git push' 'exec git push' 'time git commit' \
  '(git push)' 'echo $(git push)' 'echo `git push`' 'bash -c "git push"' "sh -c 'git commit -m x'" \
  '{ git push; }' 'true||git push' 'xargs git push' \
  'gh pr create --fill' 'gh pr merge 1' 'gh pr review 1 --approve' 'gh -R o/r pr comment 1 -b x' \
  'gh release create v1' 'gh issue close 1' 'gh api -X POST repos/o/r/issues' 'gh issue create -t x' \
  '/opt/homebrew/bin/gh issue comment 1 -b x' 'bash -c "gh issue edit 1"'; do
  case_ block "$A" "$c"
done

# --- Allowed for subagents ---
for c in \
  'git status' 'git log --oneline origin/main..HEAD' 'git log --grep commit' 'git diff HEAD~1' \
  'git commit-tree abc' 'git pushx' 'mygit push' 'yarn vitest run' 'ls -la' \
  'gh pr view 1' 'gh pr list' 'gh issue view 1' 'gh issue list'; do
  case_ allow "$A" "$c"
done

# --- issue-writer carve-out ---
case_ allow issue-writer 'gh issue create -t x -b y'
case_ allow issue-writer 'gh issue comment 1 -b y'
case_ block issue-writer 'gh issue close 1'
case_ block issue-writer 'git push'
case_ block issue-writer 'gh api repos/o/r/issues'

# --- Main thread is never blocked ---
case_ allow "" 'git push'
case_ allow "" 'gh pr merge 1'

# --- Large input fails closed (blocks), not open ---
for size in 70000 140000 420000; do
  f="$TMP/big.txt"
  { printf 'git push\n'; head -c "$size" /dev/zero | tr '\0' 'a' | fold -w 100; } >"$f"
  jq -cn --arg a "$A" --rawfile c "$f" '{agent_type:$a, tool_input:{command:$c}}' >"$TMP/big.json"
  check block "multi-line ${size}B command starting with git push" "$PATH" "$TMP/big.json"
  { printf 'git push '; head -c "$size" /dev/zero | tr '\0' 'a'; } >"$f"
  jq -cn --arg a "$A" --rawfile c "$f" '{agent_type:$a, tool_input:{command:$c}}' >"$TMP/big.json"
  check block "single-line ${size}B git push" "$PATH" "$TMP/big.json"
  { printf 'echo '; head -c "$size" /dev/zero | tr '\0' 'a'; } >"$f"
  jq -cn --arg a "$A" --rawfile c "$f" '{agent_type:$a, tool_input:{command:$c}}' >"$TMP/big.json"
  check allow "single-line ${size}B harmless command" "$PATH" "$TMP/big.json"
done

# --- Bad input / errors fail closed ---
printf '{"agent_type":"%s","tool_input":{"command":"git push"' "$A" >"$TMP/bad.json"
check block "malformed JSON" "$PATH" "$TMP/bad.json"
printf 'not json at all' >"$TMP/bad.json"
check block "non-JSON input" "$PATH" "$TMP/bad.json"
jq -cn --arg a "$A" '{agent_type:$a, tool_input:{command:"ls"}}' >"$TMP/ok.json"
check block "jq errors (ERR path)" "$TMP/badjq:$PATH" "$TMP/ok.json"

# --- jq missing ---
check block "no jq, subagent, harmless command" "$TMP/nojq" "$TMP/ok.json"
printf '{\n  "agent_type"\n    :\n  "%s",\n  "tool_input": {"command": "ls"}\n}\n' "$A" >"$TMP/pretty.json"
check block "no jq, subagent, pretty-printed JSON" "$TMP/nojq" "$TMP/pretty.json"
jq -cn '{tool_input:{command:"git push"}}' >"$TMP/main.json"
check allow "no jq, main thread" "$TMP/nojq" "$TMP/main.json"

# --- Review-2 bypasses: quoting, case, attached/space-separated globals, aliases, redirects ---
for c in \
  'g"i"t push' "'git' push" '"git" push' '\git push' "\$'git' push" 'GIT push' \
  'git --git-dir .git push' 'git --work-tree . push' 'git -C. push' \
  'git config alias.p push && git p' "git config alias.x '!git push'" 'git -c alias.p=push p' \
  'git send-pack origin main' 'git push>/dev/null' 'git push<x' \
  'gh --repo=o/r pr create' 'gh -Ro/r pr create' 'gh issue reopen 1' 'gh repo delete o/r --yes' \
  'gh workflow run ci.yml' 'gh label delete bug'; do
  case_ block "$A" "$c"
done
case_ allow issue-writer 'gh issue reopen 5'

# --- grep errors fail closed ---
mkdir -p "$TMP/badgrep"
printf '#!/bin/sh\nexit 2\n' >"$TMP/badgrep/grep" && chmod +x "$TMP/badgrep/grep"
check block "grep errors" "$TMP/badgrep:$PATH" "$TMP/ok.json"
mkdir -p "$TMP/nojq-badgrep"
for b in bash cat printf env dirname; do ln -s "$(command -v "$b")" "$TMP/nojq-badgrep/$b"; done
ln -s "$TMP/badgrep/grep" "$TMP/nojq-badgrep/grep"
check block "no jq, grep errors" "$TMP/nojq-badgrep" "$TMP/ok.json"

# --- More review-2 gh write actions, and read-only commands that must stay allowed ---
for c in 'gh secret set X' 'gh variable set X' 'gh gist create f' 'gh pr ready 1' 'gh release upload v1 f' \
  'gh issue transfer 1 o/r' 'gh repo edit --visibility public' 'gh run cancel 1' 'git -C/tmp push'; do
  case_ block "$A" "$c"
done
for c in 'git log --grep push' 'git stash push' 'git stash list' 'git config --get user.name' \
  'git config alias.st status' 'git log --author=pushkin' 'git fetch' 'git rebase main' \
  'gh run list' 'gh run view 1' 'gh repo view --json name' 'gh issue list --search "x y"' \
  'gh pr checkout 1' 'echo $HOME' 'cat src/git/push.ts' 'yarn commitlint'; do
  case_ allow "$A" "$c"
done

# --- Review-3: quoted option values with spaces, and $IFS as a separator ---
for c in 'git -C "my dir" push' "git -C 'x y' push" 'git -c "user.name=A B" commit -m x' \
  'git --git-dir "a b/.git" push' 'gh -R "o/r" pr create' 'git${IFS}push' 'git$IFS push'; do
  case_ block "$A" "$c"
done
for c in 'git -C "my dir" status' 'git -c "a=b c" log' 'git log --grep "fix push"' 'echo "$IFS"'; do
  case_ allow "$A" "$c"
done
# Over-long commands are denied up front (bash's quote strip is quadratic, and a
# timed-out hook fails open); the main thread is never capped.
f="$TMP/big.txt"
head -c 524289 /dev/zero | tr '\0' '"' >"$f"
jq -cn --arg a "$A" --rawfile c "$f" '{agent_type:$a, tool_input:{command:$c}}' >"$TMP/big.json"
check block "subagent command over 512 KB" "$PATH" "$TMP/big.json"
jq -cn --rawfile c "$f" '{tool_input:{command:$c}}' >"$TMP/big.json"
check allow "main-thread command over 512 KB" "$PATH" "$TMP/big.json"

printf '%d passed, %d failed\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]

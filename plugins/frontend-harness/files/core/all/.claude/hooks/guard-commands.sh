#!/usr/bin/env bash
# Blocks dangerous git commands before Claude runs them.

set -uo pipefail # Run this file with bash.

# Find out which command Claude is about to run.
input=$(cat)
cmd=$(jq -r '.tool_input.command // empty' <<<"$input")
[[ -z "$cmd" ]] && exit 0

deny() { echo "Blocked: $1" >&2; exit 2; }
shopt -s nocasematch

# Rule 1: no force push, it rewrites history on the server.
[[ "$cmd" =~ git[[:space:]].*push.*(--force|--force-with-lease|-f([[:space:]]|$)) ]] \
  && deny "force push. Ask the user."

# Rule 2: no skipping git hooks, only a human decides that.
[[ "$cmd" =~ (--no-verify|SKIP_VERIFY) ]] \
  && deny "skipping the git hooks is a human decision."

exit 0

#!/usr/bin/env bash
# Blocks dangerous git commands before Claude runs them.

set -uo pipefail # Run this file with bash.

# Find out which command Claude is about to run.
input=$(cat)
cmd=$(jq -r '.tool_input.command // empty' <<<"$input")
[[ -z "$cmd" ]] && exit 0

deny() { echo "Blocked: $1" >&2; exit 2; }

# Rule 1: no force push, it rewrites history on the server. Each command of a
# chain is checked on its own, push must be a whole word and -f is lower-case,
# so a path such as .githooks/pre-push next to `git commit -F` is not one.
parts=${cmd//&&/$'\n'}
parts=${parts//||/$'\n'}
parts=${parts//;/$'\n'}
parts=${parts//|/$'\n'}
while IFS= read -r part; do
  [[ "$part" =~ (^|[[:space:]])git[[:space:]](.*[[:space:]])?push([[:space:]]|$) ]] \
    && [[ "$part" =~ [[:space:]](--force[^[:space:]]*|-f)([[:space:]]|$) ]] \
    && deny "force push. Ask the user."
done <<<"$parts"

shopt -s nocasematch

# Rule 2: no skipping git hooks, only a human decides that.
[[ "$cmd" =~ (--no-verify|(^|[[:space:];&|])SKIP_VERIFY=) ]] \
  && deny "skipping the git hooks is a human decision."

exit 0

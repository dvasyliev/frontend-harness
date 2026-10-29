#!/usr/bin/env bash
# Formats and lints every file right after Claude edits it.

set -uo pipefail

# Find out which file Claude just changed.
input=$(cat)
path=$(jq -r '.tool_input.file_path // empty' <<<"$input")
[[ -z "$path" || ! -f "$path" ]] && exit 0

cd "$CLAUDE_PROJECT_DIR" || exit 0

# Skip files outside the project; its tools do not cover them.
[[ "$path" == "$CLAUDE_PROJECT_DIR"/* ]] || exit 0
ext=${path##*.}

# Run each file check from .claude/harness.json that covers this extension.
# A blocking check (lint) makes Claude fix the errors right away; the others (format) run silently.
while IFS=$'\t' read -r name script block; do
  if ! out=$(npm run -s "$script" -- "$path" 2>&1 </dev/null) && [ "$block" = "true" ]; then
    {
      echo "$name failed on $path. Fix these before moving on:"
      tail -n 40 <<<"$out"
    } >&2
    exit 2
  fi
done < <(jq -r --arg ext "$ext" '.fileChecks[] | select(.extensions | index($ext)) | [.name, .script, .blocking] | @tsv' .claude/harness.json)

exit 0

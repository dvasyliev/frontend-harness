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

# Keep CLAUDE.md and the rules short: past the limit, Claude moves the extra out
# to where it is loaded only when a task needs it.
LIMIT=200
name=${path##*/}
if [[ "$name" == CLAUDE.md || "$name" == CLAUDE.local.md || "$path" == */.claude/rules/*.md ]]; then
  lines=$(wc -l <"$path" | tr -d ' ')
  if [ "$lines" -gt "$LIMIT" ]; then
    cat >&2 <<EOF
$path has $lines lines; the limit is $LIMIT. It is read in every session (a rule: whenever its paths match), so the longer it is, the less attention each line gets.
Shorten it by moving each part to where it is loaded only when needed, not by dropping or squeezing it:
- What a linter, the types or a test can check: into that tool's config or a test; then delete it here.
- What applies to one folder or kind of file: a rule in .claude/rules/<topic>.md with paths: for those files (an existing rule on the topic first). A long rule: split it by topic, each with the narrowest paths.
- A procedure done now and then (a release, a migration, adding a page): a skill in .claude/skills/<name>/SKILL.md.
- Background a task may need (architecture details, API notes): a file in docs/, with one line here saying when to read it.
- What another rule, a skill, the code or the tool's config already says: delete it.
Keep here only what every task needs. Then tell the user in one line what went where.
EOF
    exit 2
  fi
fi

exit 0

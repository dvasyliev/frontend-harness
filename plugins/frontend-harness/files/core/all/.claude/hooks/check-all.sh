#!/usr/bin/env bash
# Runs the project checks at the end of every Claude turn, or all of them with `npm run check`.

# Go to the project folder; stop if it is not a git repo.
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0
force=false
[ "${1:-}" = "--force" ] && force=true

# Do nothing on the retry after a block, or while background subagents are still working.
if ! $force; then
  input=$(cat)
  [ "$(jq -r '.stop_hook_active // false' <<<"$input" 2>/dev/null)" = "true" ] && exit 0
  transcript=$(jq -r '.transcript_path // empty' <<<"$input" 2>/dev/null)
  if [ -f "$transcript" ]; then
    started=$(grep 'Async agent launched' "$transcript" | grep -oE 'agentId: [a-z0-9]+' | cut -d' ' -f2 | sort -u)
    finished=$(grep -oE '<task-id>[a-z0-9]+</task-id>' "$transcript" | sed -E 's/<\/?task-id>//g' | sort -u)
    [ -n "$(comm -23 <(echo "$started") <(echo "$finished") | grep .)" ] && exit 0
  fi
fi

# Skip the checks if the code did not change or already passed in this exact state.
watch=(. ":(exclude)*.md")
state=$({
  git rev-parse HEAD
  git diff HEAD -- "${watch[@]}" 2>/dev/null
  git ls-files -z --others --exclude-standard -- "${watch[@]}" | xargs -0 cat 2>/dev/null
  cat "$0"
} | shasum | cut -d' ' -f1)
stamp="$(git rev-parse --git-dir)/checks-green"
if ! $force; then
  [ -z "$(git status --porcelain -- "${watch[@]}")" ] && exit 0
  [ "$(cat "$stamp" 2>/dev/null)" = "$state" ] && exit 0
fi

# Run each check below and collect the errors.
failed=""
run() {
  local name=$1 out
  shift
  $force && echo "== $name"
  if ! out=$("$@" 2>&1); then
    failed+="== $name failed ==
$(tail -15 <<<"$out")

"
  fi
}

# The checks the installed harness modules list in .claude/harness.json, in order.
while IFS=$'\t' read -r name script; do
  run "$name" npm run -s "$script" </dev/null
done < <(jq -r '.checks[] | [.name, .script] | @tsv' .claude/harness.json)

# Red: send Claude back to fix. Green: remember it, so the same code is not checked again.
if [ -n "$failed" ]; then
  echo "Checks are red. Fix them before finishing:" >&2
  echo "$failed" >&2
  exit 2
fi

echo "$state" >"$stamp"
$force && echo "All checks green."
exit 0

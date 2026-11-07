#!/usr/bin/env sh
# `npm run verify`: all end-to-end tests. A full run that passes on code that did
# not change while it ran remembers that code, so the pre-push hook can skip
# pushing exactly the same code again. `verify.sh --state` prints that code's id.

# The id of the code as it is on disk, untracked files too (but not ignored
# ones): the tree git would commit with `git add -A`. The real index stays as is.
state() {
	index=$(mktemp) || return 1
	cp "$(git rev-parse --git-dir)/index" "$index" 2>/dev/null
	GIT_INDEX_FILE=$index git add -A . >/dev/null 2>&1 &&
		GIT_INDEX_FILE=$index git write-tree
	status=$?
	rm -f "$index"
	return $status
}

[ "${1:-}" = "--state" ] && { state; exit $?; }

stamp="$(git rev-parse --git-dir)/e2e-green"
before=$(state)
rm -f "$stamp"
npx playwright test "$@" || exit $?

# Only the whole suite counts, and only for code that stayed the same.
if [ $# -eq 0 ] && [ -n "$before" ] && [ "$(state)" = "$before" ]; then
	echo "$before" >"$stamp"
fi
exit 0

# Several agents at once

- Several agents may work in this repo at the same time, all on `main`. Changes you did not make are another agent's work in progress, not a mess to clean up.
- Touch only your own changes. Never revert, reformat, stash or commit another agent's files.
- Before editing a file, check `git status`. If it has changes you did not make, tell the user which file and wait instead of editing it.
- If the end-of-turn checks fail, first make sure none of the failures come from your own changes. If they all sit in another agent's files, finish with one short line saying so; do not analyse, list or fix them.
- Commit only your own files (`git add <paths>`, never `git add -A`).

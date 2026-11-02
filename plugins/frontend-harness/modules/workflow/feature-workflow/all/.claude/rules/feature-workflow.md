# How we work

- For every user-facing feature, use the `feature-workflow` skill before writing any code.
- After a large change made without that skill (a refactor, the fixes of an audit), invoke the `improve-harness` skill.
- Work on `main`; no branches, worktrees or PRs, even when a skill suggests them.
- Several agents may work in this repo at the same time. Changes you did not make are another agent's work in progress, not a mess to clean up.
- Touch only your own changes. Never revert, reformat, stash or commit another agent's files.
- Before editing a file, check `git status`. If it has changes you did not make, tell the user which file and wait instead of editing it.
- If the end-of-turn checks fail, first make sure none of the failures come from your own changes. If they all sit in another agent's files, finish with one short line saying so; do not analyse, list or fix them.
- Commit only your own files (`git add <paths>`, never `git add -A`).
- Never run implementer subagents in parallel: they share one working tree on `main`.
- Ask every question that has ready answer options (including "apply this?" after a proposal) with `AskUserQuestion`, never as plain text at the end of a reply. This holds inside `superpowers:brainstorming` too, even where it says to ask open questions in text; only a question with no sensible options stays in text.

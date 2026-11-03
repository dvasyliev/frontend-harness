# Workflow

## Features

- For every user-facing feature, use the `feature-workflow` skill before writing any code.
- After a large change made without that skill (a refactor, the fixes of an audit), invoke the `improve-harness` skill.

## Several agents on `main`

- Work on `main`; no branches, worktrees or PRs, even when a skill suggests them.
- Several agents may work in this repo at the same time. Changes you did not make are another agent's work in progress, not a mess to clean up.
- Touch only your own changes. Never revert, reformat, stash or commit another agent's files.
- Before editing a file, check `git status`. If it has changes you did not make, tell the user which file and wait instead of editing it.
- If the end-of-turn checks fail, first make sure none of the failures come from your own changes. If they all sit in another agent's files, finish with one short line saying so; do not analyse, list or fix them.
- Commit only your own files (`git add <paths>`, never `git add -A`).
- Never run implementer subagents in parallel: they share one working tree on `main`.

## Questions

- Ask every question that has ready answer options (including "apply this?" after a proposal) with `AskUserQuestion`, never as plain text at the end of a reply. This holds inside `superpowers:brainstorming` too, even where it says to ask open questions in text; only a question with no sensible options stays in text.
- In `AskUserQuestion`: picking any number from a list is `multiSelect: true`; choosing one of several ways is `multiSelect: false`, the recommended option first with "(recommended)" after its label, and only ways a reasonable person could really pick (never one made up to fill the question; with one sensible way, do not ask how); one item on its own gets "Fix" (or what will happen) and "Skip". Headers are at most 12 characters, plain words in the user's language rather than abbreviations; labels 1–5 words; the tool adds "Other" itself. A question takes 2–4 options and a call 4 questions; split more evenly (5: 3 and 2) so none is left with one option, and never merge two items into one option to make them fit. Each question and option must make sense without the chat, which the dialog may hide.

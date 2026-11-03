---
name: libraries
description: Use when the user wants to choose or change which library each job uses in this project, or wants the libraries rule that was skipped when the harness was set up.
---

# Choose the libraries

Sets the `libraries` answers of a project that already has the harness, and adds the `libraries` module if it is missing. The template is the one the `setup` skill (`../setup/SKILL.md`, next to this skill's folder) describes. Ask as `../../references/questions.md` (from this skill's base directory) says.

1. Stop if `.claude/harness.json` is missing: the project has no harness yet; offer `/frontend-harness:setup`.
2. Run `git status --short`. If anything is uncommitted, stop and tell the user, as setup's step 1 says.
3. Stop if the `version` in `.claude/harness.json` is older than the template's: running it here would also update every module. Offer `/frontend-harness:update` first.
4. Follow setup's **Libraries** step for every section, not only those with no answer: a current answer is the recommended library, and the user can change any of them.
5. Run setup's step 3 with only the answers that change: `libraries`, and `modules` with `libraries` added when it is not listed.
6. Follow setup's merge steps for the `harness:` lines it printed. A `.claude/rules/libraries.md` the project wrote by hand comes up as a file the project already had.
7. Run `npm run check`, then commit only `.claude/harness.json`, `.claude/rules/libraries.md` and `.claude/rules/harness.md`, with the message `chore(harness): set the libraries`.
8. Tell the user what changed, section by section.

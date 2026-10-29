---
name: setup
description: Use when the user wants to set up the frontend harness (Claude Code hooks, rules, skills, checks, git hooks) in a React (Vite) or Next.js project, add, remove or change its modules or checks, or move a harness fix into the plugin.
---

# Set up the harness

This skill picks the modules that fit the project, runs `tasks/apply.mjs` to write them, and finishes what the script cannot: merge conflicts, `CLAUDE.md`, MCP sign-in, and a green `npm run check`.

**Template:** `$HARNESS_TEMPLATE` if set (a local checkout of this plugin, to try changes), else this plugin's folder: two folders up from this skill's base directory. Its version is `version` in `.claude-plugin/plugin.json`.

**Catalog:** `<template>/modules.json` lists every framework and module: what a module brings (`scripts`, `checks`, `settings` for `.claude/settings.json`, `install` commands, npm packages) and how to suggest it (`detect`, `recommended`). A module's files are in `<template>/modules/<category>/<module>/`: `all/` for every framework, `<framework>/` for one, laid out as in the project. Read them; do not guess.

## 1. Look at the project

1. Run `git status --short`. If anything is uncommitted, stop and tell the user: the harness merges into the project's files, and the changes may be another agent's.
2. If `.claude/harness.json` exists, this is an **update**: read its `version`, `framework`, `modules`, `skipChecks` and `docsLanguage`. Otherwise it is an **install**. A project installed with Copier also has `.copier-answers.yml`: take `docs_language` from it, and delete it in step 4's commit. A project from before 0.19 may list `next-rules`: replace it with `page-speed`. A project from before 0.24 with `best-practices` had the performance rules in it: add `page-speed` too. A project with `performance` (0.24): replace it with `page-speed`. A project from before 0.25 with `quality`: replace it with `knip` and `jscpd`. A project from before 0.28 has its merge base in `.claude/harness-base/`: `apply.mjs` moves it into `.claude/harness.json` and deletes the folder. A project from before 0.29 has `.claude/harness.md`: `apply.mjs` writes `.claude/rules/harness.md` instead; remove the `@.claude/harness.md` line from `CLAUDE.md` if the merge left it.
3. Ask which framework the project uses (`AskUserQuestion`, one option per entry in `frameworks`, its `description` as the label, such as "React (Vite)"). Put the one `frameworks.*.detect` finds in `package.json` first, marked "(detected)"; `nextjs` wins over `react`, since a Next.js project has both. On an update, the `framework` in `.claude/harness.json` is the detected one. The framework decides which version of each module's files is installed.
4. Check that the code sits where the harness configs look (Prettier, Vitest, the linter, the rules): `app/` and `lib/` for Next.js, `src/` for React. A Next.js project with its code in `src/` or a `components/` folder at the root is not covered there; tell the user before installing, since those folders would go unformatted and untested.

## 2. Choose modules

Mark each module:

- **required:** always installed; do not ask.
- **auto** (such as `tailwind`, or `next-docs` when `node_modules/next/dist/docs` exists): installed exactly when its `detect` matches, checked again on every update; do not ask, only say whether it is in.
- **suggested:** its `detect` matches `package.json`, or it is `recommended` and has no `detect`.
- **offered:** the rest, unselected.

Ask with `AskUserQuestion`, `multiSelect: true`, one question per `category` (but `core`) with the category in words as its header (such as "Code quality"), up to 4 questions per call (a second call for the rest). Each option: the module id as label, its `description` as description (add what it brings in a few words, such as "plugin superpowers, skill improve-harness"); put "(suggested)" or "(installed)" after the label where it applies. On an update, the installed modules are the starting point; say what removing one does (its files, scripts, hooks, plugins and MCP servers go; npm packages stay).

Exactly one `linter` module is installed: choose the one the project already uses (its `detect`), else the framework's `linter`. Ask only when the project has both or the user wants the other.

Skills come with their modules; there is no separate skill question.

Ask about `skipChecks` only when the user asks to turn a check off, or in step 4.

## 3. Run the template

```bash
node <template>/tasks/apply.mjs '{"framework": "<framework>", "modules": [...], "skipChecks": [...], "docsLanguage": "<language>"}'
```

On an update, leave out the answers that do not change; they keep their values from `.claude/harness.json`. `docsLanguage` is the language of specs and plans (default English); ask if the project's docs do not show it. The dev server port, which the hooks and the end-to-end tests use, is the one the project's `dev` script sets (`--port` or `-p`), else one `apply.mjs` derives from the folder name (3000–3999) and adds to the `dev` script, so projects on one machine rarely share it. To change it, change the `dev` script.

The script writes each module's files, merges its `scripts` into `package.json` and its `settings` into `.claude/settings.json` (the project's own keys stay), takes back what a removed module added, writes `.claude/harness.json` and `.claude/rules/harness.md`, installs missing npm packages, and runs each `install` command whose `creates` paths are not all there (one without `creates` runs every time).

Then read the `harness:` lines it printed, `git status` and `git diff`:

- **Merge conflicts:** a file with `<<<<<<< project` markers. Resolve each so both the project's change and the harness change survive; ask the user when the two contradict.
- **The same file under another name:** the project's `eslint.config.js` for the harness `eslint.config.mjs` (the tool reads only one). Merge the harness version (`.claude/harness-merge/<path>`) into the project's file and rename it to the harness name (fix its syntax if the new extension needs it, such as `module.exports` in a `.mjs` file). When both files are there, merge the other into the harness one and delete it.
- **Files the project had before the harness:** a file the project already had is left as it was, with the harness version in `.claude/harness-merge/<path>`. Merge the harness version into the project's file, asking the user where they contradict; the next update merges from the harness version, which `apply.mjs` keeps in `.claude/harness.json`. For `CLAUDE.md`, `.claude/rules/harness.md` lists the commands and the other files in `.claude/rules/` the rest, so if `CLAUDE.md` repeats any of these, ask the user before removing it.
- When every file is merged, delete `.claude/harness-merge/`.
- **Kept files:** a file no module needs any more stays when the project edited it. Ask the user whether to delete it.
- **Kept values:** a `package.json` script or `.claude/settings.json` value the project set differently (such as `"prepare": "husky"` or its own `lint`) stays the project's, and the harness one is printed. Ask the user: keep the project's (the checks then run it), or set the harness one; a value equal to the harness one becomes the harness's on the next run.
- **Git hooks elsewhere:** when git runs its hooks from another folder (husky's `.husky/`), the harness git hooks in `.githooks/` do not run. Offer to call each from the project's hook of the same name (such as `.githooks/commit-msg "$1"` in `.husky/commit-msg`).

## 4. Finish

1. **MCP:** for each server in `.claude/harness.json` `mcp`, check `claude mcp list`. A server that needs sign-in: tell the user to run `/mcp`.
2. **Checks:** run `npm install`, then `npm run check`. When a check fails on code the harness did not touch (for example `dupes` in an old project), ask: fix it now, or turn the check off (rerun step 3 with the check's name added to `skipChecks`).
3. **`CLAUDE.md`:** if "What this is" or "Architecture" still hold the `<...>` placeholders, read the project (`package.json`, README, folders, main modules) and write them, then show the user what you wrote.
4. **Commit** only the files the harness wrote or you merged (including the removal of `.claude/harness-base/` in a project from before 0.28), with the message `chore(harness): install harness <version>` or `chore(harness): update harness to <version>`.
5. Tell the user, in short: modules installed or removed, version, what still needs them (`/mcp` sign-in, a conflict you could not merge).

## Improving the harness itself

A fix to a harness-owned file (anything the template writes, or the hooks, rules and skills it installs) goes into the template, not only into the project, or the next update overwrites it.

1. Make the change in a checkout of the plugin (`$HARNESS_TEMPLATE`), not in the plugin cache, as its `CLAUDE.md` says: the layout, the conventions, how to try a change and how to release it.
2. Update the project: step 3 with `HARNESS_TEMPLATE` set to that checkout, or once the plugin itself is updated.

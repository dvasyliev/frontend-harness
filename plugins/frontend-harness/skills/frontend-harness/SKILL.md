---
name: frontend-harness
description: Use when the user wants to install, update, add or remove parts of their Claude Code harness (hooks, rules, skills, checks, commitlint, Playwright, Context7) in a React (Vite) or Next.js project, or move a harness fix into the shared template.
---

# Harness

The harness is a Copier template. This skill picks the modules that fit the project, runs Copier, and finishes what Copier cannot: merge conflicts, `CLAUDE.md`, plugins, and a green `npm run check`.

**Template:** `$HARNESS_TEMPLATE` if set, else `${CLAUDE_PLUGIN_ROOT}` (a git repo; versions are its `vX.Y.Z` tags). Never use the copy in the plugin cache: it has no git history, so `copier update` cannot merge.

**Catalog:** `<template>/modules.json` lists every framework and module: what a module brings (`scripts`, `checks`, `settings` for `.claude/settings.json`, `install` commands, npm packages) and how to suggest it (`detect`, `recommended`). A module's files are in `<template>/files/<module>/`: `all/` for every framework, `<framework>/` for one, laid out as in the project. Read them; do not guess.

## 1. Look at the project

1. Run `git status --short`. If anything is uncommitted, stop and tell the user: Copier needs a clean tree, and the changes may be another agent's.
2. If `.copier-answers.yml` exists, this is an **update**: read its `framework`, `modules`, `skip_checks` and `_commit`. Otherwise it is an **install**.
3. Ask which framework the project uses (`AskUserQuestion`, one option per entry in `frameworks`, its `description` as the label, such as "React (Vite)"). Put the one `frameworks.*.detect` finds in `package.json` first, marked "(detected)"; `nextjs` wins over `react`, since a Next.js project has both. On an update, the answer in `.copier-answers.yml` is the detected one. The framework decides which modules step 2 offers and which of their skills and configs are installed.

## 2. Choose modules

For each module whose `frameworks` (if any) include the project's framework, mark it:

- **required:** always installed; do not ask.
- **suggested:** its `detect` matches `package.json`, or it is `recommended` and has no `detect`.
- **offered:** the rest, unselected.

Ask with `AskUserQuestion`, `multiSelect: true`, up to 4 modules per question (split into several questions in one call). Each option: the module id as label, its `description` as description (add what it brings in a few words, such as "plugin superpowers, skill improve-harness"); put "(suggested)" or "(installed)" after the label where it applies. On an update, the installed modules are the starting point; say what removing one does (its files, scripts, hooks, plugins and MCP servers go; npm packages stay).

Exactly one `linter` module is installed: choose the one the project already uses (its `detect`), else the framework's `linter`. Ask only when the project has both or the user wants the other.

Skills come with their modules; there is no separate skill question.

Ask about `skip_checks` only when the user asks to turn a check off, or in step 5.

## 3. Run Copier

Install:

```bash
uvx copier copy --trust --defaults \
  -d framework=<framework> -d 'modules=[...]' -d 'skip_checks=[...]' -d docs_language=<language> \
  <template> .
```

Update (same `-d` answers; Copier keeps any you leave out):

```bash
uvx copier update --trust --defaults -d 'modules=[...]' -d 'skip_checks=[...]'
```

`--trust` lets the template's task (`tasks/apply.mjs`) run: it writes each module's files, merges its `scripts` into `package.json` and its `settings` into `.claude/settings.json` (the project's own keys stay), writes `.claude/harness.json` and `.claude/harness.md`, installs missing npm packages, and runs each `install` command whose `creates` paths are not all there (one without `creates` runs every time). `docs_language` is the language of specs and plans; ask if the project's docs do not show it.

Then read the `harness:` lines it printed, `git status` and `git diff`:

- **Merge conflicts:** a file with `<<<<<<< project` markers. Resolve each so both the project's change and the harness change survive; ask the user when the two contradict.
- **Files the project had before the harness:** a file the project already had is left as it was, with the harness version in `.claude/harness-base/<path>.new`. Merge the harness version into the project's file, asking the user where they contradict; then move the `.new` file over `.claude/harness-base/<path>`, so the next update merges from there. For `CLAUDE.md`, that means adding `@.claude/harness.md` under its first heading; `.claude/harness.md` lists the commands and `.claude/rules/` the rest, so if `CLAUDE.md` repeats any of these, ask the user before removing it.
- **Kept files:** a file no module needs any more stays when the project edited it. Ask the user whether to delete it.

## 4. Finish

1. **MCP:** for each server in `.claude/harness.json` `mcp`, check `claude mcp list`. A server that needs sign-in: tell the user to run `/mcp`.
2. **Checks:** run `npm install`, then `npm run check`. When a check fails on code the harness did not touch (for example `dupes` in an old project), ask: fix it now, or turn the check off (rerun step 3's update with the check's name added to `skip_checks`).
3. **Commit** only the files the harness wrote or you merged (including `.claude/harness-base/`), with the message `chore(harness): install harness <version>` or `chore(harness): update harness to <version>`.
4. Tell the user, in short: modules installed or removed, version, what still needs them (`/mcp` sign-in, a conflict you could not merge).

## Improving the harness itself

A fix to a harness-owned file (anything the template writes, or the hooks, rules and skills it installs) goes into the template, not only into the project, or the next update overwrites it.

1. Make the change in `<template>`:
   - `modules.json`: one module per thing the project gets (such as `feature-workflow` or `context7`), with what it adds: `scripts`, `checks` and `fileChecks`, `settings` (merged into `.claude/settings.json` as it is: hooks, permissions, `enabledPlugins`), npm `devDependencies`, and `install` commands with the paths each `creates`. For another repo's skill: `npx -y skills add <owner/repo> --skill <name> -a claude-code --copy -y` (projects update it with `npx skills update`). For a tool with its own setup (like `npx ctx7 setup` for Context7): that command, with what it writes in `creates`, and the MCP servers it adds in `mcp`.
   - `files/<module>/all/` and `files/<module>/<framework>/`: the module's files, at their paths in the project. Every file is merged: the project's edits and the harness changes since the last install are merged with `git merge-file`, against the copy kept in `.claude/harness-base/`.
   - `tasks/apply.mjs`: how modules are installed, written and removed.
   - A new framework (Vue, Nuxt, Svelte, Angular): an entry in `modules.json` `frameworks` and in copier.yml `framework` choices, a `files/<module>/<framework>/` version of each per-framework file, and the framework in the `frameworks` of each module limited to some. A file whose text depends on the framework gets one version per framework; a rule that depends on other modules names them in plain text ("With `e2e`: ...").
2. Try it on a scratch project: `uvx copier copy --trust --defaults -d framework=<framework> -d 'modules=[...]' <template> <scratch>` (with `HARNESS_NO_INSTALL=1` to skip npm installs).
3. Commit in `<template>` and tag the next version (`git tag vX.Y.Z`; a new module or answer is a minor version, a fix a patch).
4. Update the project with step 3's update command.

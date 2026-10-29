---
name: frontend-harness
description: Use when the user wants to install, update, add or remove parts of their Claude Code harness (hooks, rules, skills, checks, commitlint, Playwright, Context7) in a React (Vite) or Next.js project, or move a harness fix into the shared template.
---

# Harness

The harness is a Copier template. This skill picks the modules that fit the project, runs Copier, and finishes what Copier cannot: merge conflicts, `CLAUDE.md`, plugins, and a green `npm run check`.

**Template:** `$HARNESS_TEMPLATE` if set, else `${CLAUDE_PLUGIN_ROOT}` (a git repo; versions are its `vX.Y.Z` tags). Never use the copy in the plugin cache: it has no git history, so `copier update` cannot merge.

**Catalog:** `<template>/catalog/`. `modules.json` lists every framework and module; each module's `dependencies` names everything it brings: other modules, npm packages, and entries of `plugins.json`, `skills.json`, `mcp.json`, `rules.json`, `files.json`, `hooks.json` and `githooks.json`. Every such entry has a `description`, a source (`install`: a command, or `input`: a file or folder in `library/`), its `output` path in the project, and for an input file a `mode` (`override` or `merge`). Read them; do not guess.

## 1. Look at the project

1. Run `git status --short`. If anything is uncommitted, stop and tell the user: Copier needs a clean tree, and the changes may be another agent's.
2. If `.copier-answers.yml` exists, this is an **update**: read its `framework`, `modules`, `skip_checks` and `_commit`. Otherwise it is an **install**.
3. Ask which framework the project uses (`AskUserQuestion`, one option per entry in `frameworks`, its `description` as the label, such as "React (Vite)"). Put the one `frameworks.*.detect` finds in `package.json` first, marked "(detected)"; `nextjs` wins over `react`, since a Next.js project has both. On an update, the answer in `.copier-answers.yml` is the detected one. The framework decides which modules step 2 offers and which of their skills and configs are installed.

## 2. Choose modules

For each module whose `frameworks` (if any) include the project's framework, mark it:

- **required:** always installed; do not ask.
- **suggested:** its `detect` matches `package.json`, or it is `recommended` and has no `detect`.
- **offered:** the rest, unselected.

Ask with `AskUserQuestion`, `multiSelect: true`, up to 4 modules per question (split into several questions in one call). Each option: the module id as label, its `description` as description (add what its `dependencies` bring in a few words, such as "plugin superpowers, skill improve-harness"); put "(suggested)" or "(installed)" after the label where it applies. On an update, the installed modules are the starting point; say what removing one does (its files, scripts, hooks, plugins and MCP servers go; npm packages stay).

Add every module in a chosen one's `dependencies.modules`, and tell the user which ones you added and why.

A `group` in `catalog/modules.json` (the linter) takes exactly `pick` modules: choose the one the project already uses (its `detect`), else the group's `default` for the framework. Ask only when the project has both or the user wants the other.

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

`--trust` lets the template's task (`tasks/apply.mjs`) run: it writes each `input` to its `output` (a file with its Jinja filled in first), writes `.claude/settings.json` hooks and plugins, `.mcp.json`, `.claude/harness.json`, `.claude/harness.md` and the npm scripts, installs missing npm packages, and runs each `install` command whose outputs are not all there (a plugin's runs every time). `docs_language` is the language of specs and plans; ask if the project's docs do not show it.

Then read the `harness:` lines it printed, `git status` and `git diff`:

- **Merge conflicts:** a `merge` file with `<<<<<<< project` markers. Resolve each so both the project's change and the harness change survive; ask the user when the two contradict.
- **Files the project had before the harness:** a `merge` file the project already had is left as it was, with the harness version in `.claude/harness-base/<path>.new`. Merge the harness version into the project's file, asking the user where they contradict; then move the `.new` file over `.claude/harness-base/<path>`, so the next update merges from there. For `CLAUDE.md`, that means adding `@.claude/harness.md` under its first heading (and `@AGENTS.md` above it when `next-rules` is installed); `.claude/harness.md` lists the commands, rules, hooks, skills and commits, so if `CLAUDE.md` repeats any of these sections, ask the user before removing them.
- **Kept files:** a `merge` file no module needs any more stays when the project edited it. Ask the user whether to delete it.

## 4. Finish

1. **MCP:** for each server in `.claude/harness.json` `mcp`, check `claude mcp list`. A server that needs sign-in: tell the user to run `/mcp`.
2. **Checks:** run `npm install`, then `npm run check`. When a check fails on code the harness did not touch (for example `dupes` in an old project), ask: fix it now, or turn the check off (rerun step 3's update with the check's name added to `skip_checks`).
3. **Commit** only the files the harness wrote or you merged (including `.claude/harness-base/`), with the message `chore(harness): install harness <version>` or `chore(harness): update harness to <version>`.
4. Tell the user, in short: modules installed or removed, version, what still needs them (`/mcp` sign-in, a conflict you could not merge).

## Improving the harness itself

A fix to a harness-owned file (anything the template writes, or the hooks, rules and skills it installs) goes into the template, not only into the project, or the next update overwrites it.

1. Make the change in `<template>`:
   - `catalog/`: `modules.json` holds one module per thing the project gets (such as `feature-workflow` or `context7`): its `dependencies` name everything it needs, and `scripts`, `checks` and `sections` what it adds. The other files are catalogs of entries by kind; a new entry reaches no project until a module names it. Every entry has the same fields: `description`, optional `frameworks`, one source, and `output`:
     - `install`: a command; `output` lists every path it writes. For another repo's skill: `npx -y skills add <owner/repo> --skill <name> -a claude-code --copy -y` (projects update it with `npx skills update`). For a tool with its own setup (like `npx ctx7 setup` for Context7): that command, with what it writes in `output`.
     - `input`: a file or folder in `library/` (`skills/`, `hooks/`, `githooks/`, `rules/`, `files/`); `output` is its one path in the project. A folder is copied as it is. A file has its Jinja filled in first (`framework`, `modules`, `docs_language`), then `mode` decides: `override` (the default, for files projects never edit: hooks, git hooks, `AGENTS.md`) or `merge` (for files projects edit: rules, configs, `CLAUDE.md`; the project's edits and the harness changes since the last install are merged with `git merge-file`).
   - Hooks also have `settings`: `event`, `matcher`, `timeout` and `statusMessage`, written to `.claude/settings.json`; an MCP server may give its definition as `server` instead of a source.
   - `tasks/apply.mjs` and `tasks/render.py`: how entries are installed, written and removed.
   - A new framework (Vue, Nuxt, Svelte, Angular): an entry in `catalog/modules.json` `frameworks` and in copier.yml `framework` choices, its branch in each `library/` file that checks `framework`, and the framework in the `frameworks` of each module and entry that fits it.
2. Try it on a scratch project: `uvx copier copy --trust --defaults -d framework=<framework> -d 'modules=[...]' <template> <scratch>` (with `HARNESS_NO_INSTALL=1` to skip npm installs).
3. Commit in `<template>` and tag the next version (`git tag vX.Y.Z`; a new module or answer is a minor version, a fix a patch).
4. Update the project with step 3's update command.

---
name: frontend-harness
description: Use when the user wants to install, update, add or remove parts of their Claude Code harness (hooks, rules, skills, checks, commitlint, Playwright, Context7) in a React (Vite) or Next.js project, or move a harness fix into the shared template.
---

# Harness

The harness is a Copier template. This skill picks the modules that fit the project, runs Copier, and finishes what Copier cannot: merge conflicts, `CLAUDE.md`, plugins, and a green `npm run check`.

**Template:** `$HARNESS_TEMPLATE` if set, else `${CLAUDE_PLUGIN_ROOT}` (a git repo; versions are its `vX.Y.Z` tags). Never use the copy in the plugin cache: it has no git history, so `copier update` cannot merge.

**Catalog:** `<template>/catalog/`. `modules.json` lists every framework and module; each module's `dependencies` names everything it brings: other modules, npm packages, and entries of `plugins.json`, `skills.json`, `mcp.json`, `rules.json`, `files.json`, `hooks.json` and `githooks.json`. Every such entry says how it gets into the project: `install` (a command), `copy` (from `library/`) or `template` (from `template/`, merged by Copier). Read them; do not guess.

## 1. Look at the project

1. Run `git status --short`. If anything is uncommitted, stop and tell the user: Copier needs a clean tree, and the changes may be another agent's.
2. If `.copier-answers.yml` exists, this is an **update**: read its `framework`, `modules`, `skip_checks` and `_commit`. Otherwise it is an **install**.
3. Ask which framework the project uses (`AskUserQuestion`, one option per entry in `frameworks`, its `describe` as the label, such as "React (Vite)"). Put the one `frameworks.*.detect` finds in `package.json` first, marked "(detected)"; `nextjs` wins over `react`, since a Next.js project has both. On an update, the answer in `.copier-answers.yml` is the detected one. The framework decides which modules step 2 offers and which of their skills and configs are installed.

## 2. Choose modules

For each module whose `frameworks` (if any) include the project's framework, mark it:

- **required:** always installed; do not ask.
- **suggested:** its `detect` matches `package.json`, or it is `recommended` and has no `detect`.
- **offered:** the rest, unselected.

Ask with `AskUserQuestion`, `multiSelect: true`, up to 4 modules per question (split into several questions in one call). Each option: the module id as label, its `describe` as description (add what its `dependencies` bring in a few words, such as "plugin superpowers, skill improve-harness"); put "(suggested)" or "(installed)" after the label where it applies. On an update, the installed modules are the starting point; say what removing one does (its files, scripts, hooks, plugins and MCP servers go; npm packages stay).

Add every module in a chosen one's `dependencies.modules`, and tell the user which ones you added and why.

A `group` in `catalog/modules.json` (the linter) takes exactly `pick` modules: choose the one the project already uses (its `detect`), else the group's `default` for the framework. Ask only when the project has both or the user wants the other.

Skills come with their modules; there is no separate skill question.

Ask about `skip_checks` only when the user asks to turn a check off, or in step 5.

## 3. Run Copier

Install:

```bash
uvx copier copy --trust --overwrite --defaults \
  -d framework=<framework> -d 'modules=[...]' -d 'skip_checks=[...]' -d docs_language=<language> \
  <template> .
```

Update (same `-d` answers; Copier keeps any you leave out):

```bash
uvx copier update --trust --defaults -d 'modules=[...]' -d 'skip_checks=[...]'
```

`--trust` lets the template's task (`tasks/apply.mjs`) run: it copies each `copy` entry from `library/`, checks each `template` entry was rendered, writes `.claude/settings.json` hooks and plugins, `.mcp.json`, `.claude/harness.json`, `.claude/harness.md` and the npm scripts, installs missing npm packages, and runs each `install` command whose `output` paths are not all there (a plugin's runs every time). `docs_language` is the language of specs and plans; ask if the project's docs do not show it.

Then read `git status` and `git diff`:

- **Conflicts:** files with `<<<<<<< before updating` markers or `*.rej` files. Merge each so both the project's change and the template's change survive; ask the user when the two contradict. Delete the `.rej` files.
- **Install over existing files:** `--overwrite` replaced any file the template also has. Look at each replaced file's diff; if the project's version held something the template's does not, tell the user and ask which to keep.

## 4. CLAUDE.md

Copier writes `CLAUDE.md` only when there is none. If the project already had one:

1. Add `@.claude/harness.md` under its first heading (and `@AGENTS.md` above it when `next-rules` is installed and the file does not import it yet).
2. `.claude/harness.md` now lists the commands, rules, hooks, skills and commits. If `CLAUDE.md` repeats any of these sections, ask the user before removing them.

## 5. Finish

1. **Plugins:** for each entry in `.claude/harness.json` `plugins`, check `claude plugin list`; install the missing ones with `claude plugin install <name>@<marketplace> --scope project`.
2. **MCP:** for each server in `.claude/harness.json` `mcp`, check `claude mcp list`. A server that needs sign-in: tell the user to run `/mcp`.
3. **Checks:** run `npm install`, then `npm run check`. When a check fails on code the harness did not touch (for example `dupes` in an old project), ask: fix it now, or turn the check off (rerun step 3's update with the check's name added to `skip_checks`).
4. **Commit** only the files the harness wrote or you merged, with the message `chore(harness): install harness <version>` or `chore(harness): update harness to <version>`.
5. Tell the user, in short: modules installed or removed, version, what still needs them (`/mcp` sign-in, a conflict you could not merge).

## Improving the harness itself

A fix to a harness-owned file (anything the template writes, or the hooks, rules and skills it installs) goes into the template, not only into the project, or the next update overwrites it.

1. Make the change in `<template>`:
   - `catalog/`: `modules.json` holds one module per thing the project gets (such as `feature-workflow` or `context7`): its `dependencies` name everything it needs, and `scripts`, `checks` and `sections` what it adds. The other files are catalogs of entries by kind; a new entry reaches no project until a module names it. Each entry has `describe`, optional `frameworks`, `output` (where it goes in the project: one path, or for an install all the paths it writes) and one source:
     - `install`: a command, with the paths it writes in `output`. For another repo's skill: `npx -y skills add <owner/repo> --skill <name> -a claude-code --copy -y` (projects update it with `npx skills update`). For a tool with its own setup (like `npx ctx7 setup` for Context7): that command, and the entries it writes (its rule, its skill) listed without a source.
     - `copy`: a file or folder in `library/`, copied whole to `output`: `library/skills/<name>/`, `library/hooks/<name>`, `library/githooks/<name>`, `library/AGENTS.md`. Projects never edit these.
     - `template`: a file in `template/` at its project path (`output` is the same path): configs, `.claude/rules/`, `CLAUDE.md`. Copier renders it per framework and modules and merges it with the project's edits. A template only some modules use also goes in copier.yml `_exclude`.
   - Hooks also have `event`, `matcher`, `timeout` and `statusMessage` (written to `.claude/settings.json`); an MCP server may give its definition as `server`.
   - `tasks/apply.mjs`: how entries are installed, copied and removed.
   - A new framework (Vue, Nuxt, Svelte, Angular): an entry in `catalog/modules.json` `frameworks` and in copier.yml `framework` choices, its branch in each `template/` file that checks `framework`, and the framework in the `frameworks` of each module and entry that fits it.
2. Try it on a scratch project: `uvx copier copy --trust --defaults -d framework=<framework> -d 'modules=[...]' <template> <scratch>` (with `HARNESS_NO_INSTALL=1` to skip npm installs).
3. Commit in `<template>` and tag the next version (`git tag vX.Y.Z`; a new module or answer is a minor version, a fix a patch).
4. Update the project with step 3's update command.

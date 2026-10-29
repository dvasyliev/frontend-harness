# frontend-harness

How the plugin is built and how to change it. How to use it is in `README.md`.

## Layout

```
.claude-plugin/plugin.json                 name and version
skills/setup/                              /frontend-harness:setup: picks modules, runs apply.mjs, merges what it cannot
skills/update/                             /frontend-harness:update: the same, as an update
modules.json                               every framework and module
modules/<category>/<module>/all/           a module's files for every framework, at their paths in the project
modules/<category>/<module>/<framework>/   its files for one framework
tasks/apply.mjs                            writes the chosen modules into the project in the current folder
```

## Entities

| Entity | What it is |
|---|---|
| Framework | `modules.json` `frameworks`: `nextjs` or `react`, with its port, source folders, default linter and how to detect it. Picks the `<framework>/` version of each file. |
| Module | `modules.json` `modules`: one thing a project gets, in a `category` (the folder its files are in). Brings files, `scripts` / `frameworkScripts` (package.json), `checks` / `fileChecks` (run by the hooks), `settings` (.claude/settings.json), `mcpServers` (.mcp.json), npm `devDependencies` / `frameworkDevDependencies`, and `install` commands with the paths each `creates` (and the `.mcp.json` servers it adds in `mcp`). |
| How a module is chosen | `required` always; `auto` exactly when its `detect` matches (package.json or files); `linter` exactly one; `recommended` suggested; the rest offered, one question per category. |
| Answers | `framework`, `modules`, `skipChecks`, `docsLanguage`: passed to `apply.mjs`, kept in `.claude/harness.json`. |

## What apply.mjs writes in a project

| Path | Purpose |
|---|---|
| module files | Merged with the project's edits (`git merge-file` against `base` in `.claude/harness.json`). A file the project already had, or has under another extension, is left for the skill to merge (its harness version in `.claude/harness-merge/`). |
| `package.json`, `.claude/settings.json`, `.mcp.json` | The modules' keys are merged in and taken back when their module goes; a value the project set differently stays. |
| `.claude/harness.json` | Answers, version, the checks the hooks run, what this run wrote, and `base`: the text of each file the harness wrote last, the base for the next merge. |
| `.claude/rules/harness.md` | Installed modules and commands; always loaded, as a rule with no `paths`. |
| `core.hooksPath` | `.githooks` when a module brings git hooks, unless the project runs its hooks from elsewhere (husky). |

A module that goes takes its files (unless the project edited them), scripts, settings and MCP servers with it; npm packages stay.

## Conventions

- Plain files, no templating. A file whose text depends on the framework gets one version per framework (`<framework>/`).
- Modules stand alone: no file needs another module to be installed. A step that only applies with another module says so in plain text ("With `e2e`: ...").
- The project's own work wins: edited files are merged, not overwritten; a script, setting or hooks path the project set stays; the harness takes back only what it added.
- `modules.json` is ordered by category; checks run in module order, so cheap ones come first.
- Everything in the plugin is written in English.

## Changing the harness

- New module: an entry in `modules.json` with its `category`, its files in `modules/<category>/<module>/`. Another repo's skill installs with `npx -y skills add <owner/repo> --skill <name> -a claude-code --copy -y` (projects update it with `npx skills update`); a tool with its own setup (like `npx ctx7 setup`) installs with that command, with what it writes in `creates`.
- New framework (Vue, Nuxt, Svelte, Angular): an entry in `modules.json` `frameworks`, and a `<framework>/` version of each per-framework file next to the module's `all/`.
- Renamed or removed module: a line in the skill's step 1 telling it what to put in its place for projects that still list it.
- Try it on a scratch project with a `package.json`:

  ```bash
  HARNESS_NO_INSTALL=1 node <plugin>/tasks/apply.mjs '{"framework": "react", "modules": ["core", "oxlint"]}'
  ```

  `HARNESS_NO_INSTALL=1` skips npm packages and install commands.
- Release: on push, as the repository's `CLAUDE.md` says (version, `CHANGELOG.md` and tag come from the commits). Projects get it with `claude plugin update`, or right away with `HARNESS_TEMPLATE` set to this folder.

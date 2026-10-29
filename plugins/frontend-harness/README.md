# frontend-harness

A Claude Code plugin that installs and updates a harness (hooks, rules, skills, checks, git hooks) in React (Vite) and Next.js projects, from modules the project picks.

The plugin only installs and updates the harness. What it installs lives in the project's own files (`.claude/`, `.githooks/`, configs, `package.json`) and works without the plugin.

## Getting started

1. Add the marketplace once (the `claude-plugins` folder):

   ```bash
   claude plugin marketplace add /path/to/marketplace
   ```

2. Install the plugin in each project that should have it, from that project's folder:

   ```bash
   claude plugin install frontend-harness@dvasyliev-plugins --scope local
   ```

   | Scope | Where it is on | Written to |
   |---|---|---|
   | `local` | this project, only for you | `.claude/settings.local.json` (not committed) |
   | `project` | this project, for everyone who clones it | `.claude/settings.json` |
   | `user` | every project | `~/.claude/settings.json` |

3. Set up the harness: open Claude Code in the project and ask "set up the harness" (or run `/frontend-harness:frontend-harness`). The skill asks the framework and modules, writes the files, merges what the project already had, runs `npm run check` and commits.

## Day to day

| To | Do |
|---|---|
| Add or remove modules | Ask "add e2e", "remove sync-deps". |
| Turn one check off | Ask "turn off the dupes check" (it goes into `skipChecks`). |
| Update the harness in a project | Ask "update the harness": its files are merged with the project's edits. |
| Update the plugin | `claude plugin marketplace update dvasyliev-plugins`, then `claude plugin update frontend-harness@dvasyliev-plugins --scope local`, and restart Claude Code. |
| Remove the plugin | `claude plugin uninstall frontend-harness@dvasyliev-plugins --scope local`. The harness already in the project stays. |

By hand, from the project folder (answers left out keep their values from `.claude/harness.json`):

```bash
node <plugin>/tasks/apply.mjs '{"framework": "nextjs", "modules": ["core", "eslint", "unit"]}'
```

## Layout

```
.claude-plugin/plugin.json                 name and version
skills/frontend-harness/                   the skill: picks modules, runs apply.mjs, merges what it cannot
modules.json                               every framework and module
modules/<category>/<module>/all/           a module's files for every framework, at their paths in the project
modules/<category>/<module>/<framework>/   its files for one framework
tasks/apply.mjs                            writes the chosen modules into the project in the current folder
```

## Entities

| Entity | What it is |
|---|---|
| Framework | `modules.json` `frameworks`: `nextjs` or `react`, with its port, source folders, default linter and how to detect it. Picks the `<framework>/` version of each file. |
| Module | `modules.json` `modules`: one thing a project gets, in a `category` (the folder its files are in). Brings files, `scripts` / `frameworkScripts` (package.json), `checks` / `fileChecks` (run by the hooks), `settings` (.claude/settings.json), `mcpServers` (.mcp.json), npm `devDependencies` / `frameworkDevDependencies`, and `install` commands. |
| How a module is chosen | `required` always; `auto` exactly when its `detect` matches (package.json or files); `linter` exactly one; `recommended` suggested; the rest offered. |
| Answers | `framework`, `modules`, `skipChecks`, `docsLanguage`: passed to `apply.mjs`, kept in `.claude/harness.json`. |

## What apply.mjs writes in a project

| Path | Purpose |
|---|---|
| module files | Merged with the project's edits (`git merge-file` against `.claude/harness-base/`). A file the project already had, or has under another extension, is left for the skill to merge (`.new`). |
| `package.json`, `.claude/settings.json`, `.mcp.json` | The modules' keys are merged in and taken back when their module goes; a value the project set differently stays. |
| `.claude/harness.json` | Answers, version, the checks the hooks run, and what this run wrote. |
| `.claude/harness.md` | Installed modules and commands; `CLAUDE.md` imports it. |
| `.claude/harness-base/` | What the harness wrote last: the base for the next merge. |

A module that goes takes its files (unless the project edited them), scripts, settings and MCP servers with it; npm packages stay.

## Modules

| Category | Module | Chosen | Brings |
|---|---|---|---|
| core | `core` | required | Claude Code hooks (session start, command guard, format and lint on edit, checks at end of turn), structure and hooks rules, typecheck, Prettier |
| workflow | `feature-workflow` | recommended | feature-workflow skill, "how we work" rule, superpowers plugin, improve-harness skill |
| code-quality | `eslint` / `oxlint` | linter | the linter, with no import cycles and a 400-line limit (oxlint: accessibility too) |
| code-quality | `knip` | recommended | knip: unused files, exports and dependencies, run at end of turn |
| code-quality | `jscpd` | recommended | jscpd: duplicated code, run at end of turn |
| code-quality | `tailwind` | auto | Prettier plugin that sorts Tailwind classes |
| testing | `unit` | recommended | Vitest, run at end of turn |
| testing | `e2e` | recommended | Playwright with axe checks, playwright-cli skill, pre-push hook |
| git | `commitlint` | recommended | Conventional Commits, commit-msg hook, commit skill |
| git | `pre-commit` | recommended | secretlint and lint-staged on staged files |
| git | `sync-deps` | optional | `npm install` after a pull or checkout that changed the lockfile |
| best-practices | `best-practices` | recommended | Vercel skills: React and Next.js performance, composition, Web Interface Guidelines |
| best-practices | `context7` | recommended | Context7 MCP, rule and skill |
| best-practices | `next-docs` | auto | `AGENTS.md` (bundled Next.js docs), Next.js DevTools MCP |
| performance | `page-speed` | recommended | fast pages and lists rules, Chrome DevTools MCP, bundle size check (React) |

## Changing the harness

- New module: an entry in `modules.json` (with its `category`), its files in `modules/<category>/<module>/`.
- New framework: an entry in `modules.json` `frameworks`, and a `<framework>/` version of each per-framework file next to the module's `all/`.
- Try it on a scratch project with `HARNESS_NO_INSTALL=1`, raise `version` in `plugin.json`, commit and tag `vX.Y.Z`.

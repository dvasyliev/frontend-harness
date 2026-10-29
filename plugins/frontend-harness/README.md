# frontend-harness

A Claude Code plugin that installs and updates a harness (hooks, rules, skills, checks, git hooks) in React (Vite) and Next.js projects, from modules the project picks.

Run it with the `frontend-harness` skill ("install the harness", "add e2e", "update the harness"). By hand, from the project folder:

```bash
node <plugin>/tasks/apply.mjs '{"framework": "nextjs", "modules": ["core", "eslint", "unit"]}'
```

## Layout

```
.claude-plugin/plugin.json      name and version
skills/frontend-harness/        the skill: picks modules, runs apply.mjs, merges what it cannot
modules.json                    every framework and module
modules/<module>/all/           a module's files for every framework, at their paths in the project
modules/<module>/<framework>/   its files for one framework
tasks/apply.mjs                 writes the chosen modules into the project in the current folder
```

## Entities

| Entity | What it is |
|---|---|
| Framework | `modules.json` `frameworks`: `nextjs` or `react`, with its port, source folders, default linter and how to detect it. Picks the `modules/<module>/<framework>/` version of each file. |
| Module | `modules.json` `modules`: one thing a project gets, in a `category`. Brings files, `scripts` / `frameworkScripts` (package.json), `checks` / `fileChecks` (run by the hooks), `settings` (.claude/settings.json), `mcpServers` (.mcp.json), npm `devDependencies` / `frameworkDevDependencies`, and `install` commands. |
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
| | `core` | required | Claude Code hooks (session start, command guard, format and lint on edit, checks at end of turn), structure and hooks rules, typecheck, Prettier |
| Workflow | `feature-workflow` | recommended | feature-workflow skill, "how we work" rule, superpowers plugin, improve-harness skill |
| Code quality | `eslint` / `oxlint` | linter | the linter, with no import cycles and a 400-line limit (oxlint: accessibility too) |
| Code quality | `quality` | recommended | knip and jscpd, run at end of turn |
| Code quality | `tailwind` | auto | Prettier plugin that sorts Tailwind classes |
| Testing | `unit` | recommended | Vitest, run at end of turn |
| Testing | `e2e` | recommended | Playwright with axe checks, playwright-cli skill, pre-push hook |
| Git | `commitlint` | recommended | Conventional Commits, commit-msg hook, commit skill |
| Git | `pre-commit` | recommended | secretlint and lint-staged on staged files |
| Git | `sync-deps` | optional | `npm install` after a pull or checkout that changed the lockfile |
| Best practices | `best-practices` | recommended | Vercel skills: React and Next.js performance, composition, Web Interface Guidelines |
| Best practices | `context7` | recommended | Context7 MCP, rule and skill |
| Best practices | `next-docs` | auto | `AGENTS.md` (bundled Next.js docs), Next.js DevTools MCP |
| Performance | `performance` | recommended | fast pages and lists rules, Chrome DevTools MCP, bundle size check (React) |

## Changing the harness

- New module: an entry in `modules.json` (with its `category`), its files in `modules/<module>/`.
- New framework: an entry in `modules.json` `frameworks`, and a `modules/<module>/<framework>/` version of each per-framework file.
- Try it on a scratch project with `HARNESS_NO_INSTALL=1`, raise `version` in `plugin.json`, commit and tag `vX.Y.Z`.

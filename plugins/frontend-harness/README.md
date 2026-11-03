# frontend-harness

A Claude Code plugin that installs and updates a harness (hooks, rules, skills, checks, git hooks) in React (Vite) and Next.js projects, from modules the project picks.

The plugin only installs and updates the harness. What it installs lives in the project's own files (`.claude/`, `.githooks/`, configs, `package.json`) and works without the plugin.

## Getting started

1. Add the marketplace once:

   ```bash
   claude plugin marketplace add dvasyliev/frontend-harness
   ```

2. Install the plugin in each project that should have it, from that project's folder:

   ```bash
   claude plugin install frontend-harness@frontend-harness --scope local
   ```

   | Scope | Where it is on | Written to |
   |---|---|---|
   | `local` | this project, only for you | `.claude/settings.local.json` (not committed) |
   | `project` | this project, for everyone who clones it | `.claude/settings.json` |
   | `user` | every project | `~/.claude/settings.json` |

3. Set up the harness: open Claude Code in the project and ask "set up the harness" (or run `/frontend-harness:setup`). The skill asks the framework and modules, writes the files, merges what the project already had, runs `npm run check` and commits.

## Day to day

| To | Do |
|---|---|
| Add or remove modules | `/frontend-harness:setup`, or ask "add e2e", "remove sync-deps". |
| Turn one check off | Ask "turn off the dupes check" (it goes into `skipChecks`). |
| Choose or change the libraries | `/frontend-harness:libraries`, also when the question was skipped at setup. |
| Update the harness in a project | `/frontend-harness:update` (or ask "update the harness"): its files are merged with the project's edits. |
| Update the plugin | `claude plugin marketplace update frontend-harness`, then `claude plugin update frontend-harness@frontend-harness --scope local`, and restart Claude Code. |
| Remove the plugin | `claude plugin uninstall frontend-harness@frontend-harness --scope local`. The harness already in the project stays. |

By hand, from the project folder (answers left out keep their values from `.claude/harness.json`):

```bash
node <plugin>/tasks/apply.mjs '{"framework": "nextjs", "modules": ["core", "eslint", "unit"]}'
```

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
| best-practices | `libraries` | recommended | a rule on when to use the platform and when a library; setup recommends a library for each job, the one already in the project first, and you accept or change the list |
| best-practices | `next-docs` | auto | `AGENTS.md` (bundled Next.js docs), Next.js DevTools MCP |
| performance | `page-speed` | recommended | fast pages and lists rules, Chrome DevTools MCP, bundle size check (React) |

How the plugin is built and how to change it: `CLAUDE.md`.

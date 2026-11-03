# frontend-harness

[![CI](https://github.com/dvasyliev/frontend-harness/actions/workflows/ci.yml/badge.svg)](https://github.com/dvasyliev/frontend-harness/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fdvasyliev%2Ffrontend-harness%2Fmain%2Fplugins%2Ffrontend-harness%2F.claude-plugin%2Fplugin.json&query=%24.version&label=version)](plugins/frontend-harness/CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Claude Code plugin that sets up hooks, rules and checks so Claude writes code that fits your React or Next.js project

[Claude Code](https://docs.claude.com/en/docs/claude-code/overview) writes code fast, but on a real project you keep cleaning up after it. frontend-harness turns that cleanup into checks Claude runs itself (each row comes with a module you can pick):

| The pain | What the harness does |
|---|---|
| Claude says "done", and you find type errors, lint errors or failing tests later, or in CI. | At the end of every turn it runs typecheck, lint, tests and the other checks. If any is red, Claude is sent back to fix it before it finishes. |
| Every file Claude touches needs formatting and lint fixes afterwards. | The file is formatted and linted right after each edit, and Claude sees the errors at once. |
| You repeat the same instructions in every session, and `CLAUDE.md` gets ignored. | Rules in `.claude/rules/` load with the files they cover: folder structure, tests, commits, page speed. |
| Claude adds a new library for something the project already has a library for. | The libraries rule and list name the one library the project uses for each job (forms, data fetching, dates and so on). |
| The codebase slowly fills with duplicated code, unused exports, huge files and import cycles. | knip, jscpd and the linter (400-line limit, no import cycles) catch them on every turn. |
| Claude force-pushes or skips the git hooks with `--no-verify`. | Those commands are blocked before they run. |
| Bad commit messages, secrets in commits, broken pages reaching the remote. | Git hooks check commit messages, scan staged files for secrets and run end-to-end tests before a push. |
| Setting all this up by hand takes days, and every project ends up with its own drifting copy. | One command sets it up from the modules you pick, and another updates it later without losing your edits. |

A **harness** is that set of hooks, rules, skills, checks and git hooks: the files that turn your expectations into checks Claude runs every time.

Everything lands in the project's own files (`.claude/`, `.githooks/`, configs, `package.json`). The harness keeps working without the plugin, and everyone who clones the project gets it.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [Modules](#modules)
- [Contributing](#contributing)
- [License](#license)

## Install

You need Claude Code, Node.js with npm, and git, in a React (Vite) or Next.js project.

```bash
claude plugin marketplace add dvasyliev/frontend-harness
claude plugin install frontend-harness@frontend-harness --scope local
```

Run the second command from the project's folder. `--scope local` turns the plugin on for this project and only for you; use `--scope project` to turn it on for everyone who clones the project, or `--scope user` for all your projects.

## Usage

Open Claude Code in the project and run:

```
/frontend-harness:setup
```

It asks which framework and modules you want, writes the files, merges them with what the project already has, runs the checks and commits. This is what the files look like after a setup with four modules:

![Files a setup with the core, eslint, unit and commitlint modules adds to a Next.js project](docs/setup.png)

Later:

| To | Run |
|---|---|
| Add or remove modules | `/frontend-harness:setup`, or ask "add e2e" |
| Update the project's harness to the plugin's latest version, keeping your edits | `/frontend-harness:update` |
| Choose the libraries the project uses for forms, data fetching, dates and the like | `/frontend-harness:libraries` |

The [plugin guide](plugins/frontend-harness/README.md) has every command, how to turn a single check off, and how to update or remove the plugin.

## Modules

| Category | Modules |
|---|---|
| core (always on) | Claude Code hooks, structure rule, typecheck, Prettier |
| workflow | `feature-workflow`: spec, plan, tests first and a browser check for every feature |
| code quality | `eslint` or `oxlint`, `knip` (unused code), `jscpd` (duplicated code), `tailwind` (class sorting) |
| testing | `unit` (Vitest), `e2e` (Playwright with accessibility checks) |
| git | `commitlint`, `pre-commit` (secrets and lint on staged files), `sync-deps` |
| best practices | Vercel's React and Next.js skills, Context7 docs, library choices, Next.js docs |
| performance | page speed rules, Chrome DevTools, bundle size check |

What each module adds: [plugin guide](plugins/frontend-harness/README.md#modules).

## Contributing

Questions, bugs and ideas: [open an issue](https://github.com/dvasyliev/frontend-harness/issues). Pull requests are welcome.

Run `npm install` once after cloning: it turns on the git hooks that check commit messages ([Conventional Commits](https://www.conventionalcommits.org)) and validate the plugin. Versions and the changelog are made on release from the commit messages, so do not edit them by hand. [CLAUDE.md](CLAUDE.md) has the commit rules, and [the plugin's CLAUDE.md](plugins/frontend-harness/CLAUDE.md) explains how the plugin is built.

## License

[MIT](LICENSE) © Dmytro Vasyliev

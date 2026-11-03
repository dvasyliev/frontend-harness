# frontend-harness

[![CI](https://github.com/dvasyliev/frontend-harness/actions/workflows/ci.yml/badge.svg)](https://github.com/dvasyliev/frontend-harness/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fdvasyliev%2Ffrontend-harness%2Fmain%2Fplugins%2Ffrontend-harness%2F.claude-plugin%2Fplugin.json&query=%24.version&label=version)](plugins/frontend-harness/CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Claude Code plugin that sets up hooks, rules and checks so Claude writes code that fits your React or Next.js project

[Claude Code](https://docs.claude.com/en/docs/claude-code/overview) reads your `CLAUDE.md`, but nothing makes it follow it: it can end a turn with type errors, failing tests or unformatted files, and it does not know your project's conventions until it trips over them.

A **harness** is the set of files that turns those expectations into checks Claude runs every time. frontend-harness writes one into your project from the modules you pick, and updates it later without losing your edits:

- **After every edit**, the file Claude changed is formatted and linted.
- **At the end of every turn**, typecheck, lint, tests and the other checks run, and if any is red, Claude is sent back to fix it before it finishes.
- **Before risky commands**, dangerous git commands are blocked.
- **Rules** tell Claude how the project is built: folder structure, tests, commits, page speed, which libraries to use.
- **Git hooks** check commit messages, scan staged files for secrets and run end-to-end tests before a push.

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

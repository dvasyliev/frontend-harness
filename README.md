# frontend-harness

[![CI](https://github.com/dvasyliev/frontend-harness/actions/workflows/ci.yml/badge.svg)](https://github.com/dvasyliev/frontend-harness/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fdvasyliev%2Ffrontend-harness%2Fmain%2Fplugins%2Ffrontend-harness%2F.claude-plugin%2Fplugin.json&query=%24.version&label=version)](plugins/frontend-harness/CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Claude Code plugin that sets up hooks, rules and checks so Claude writes code that fits your React or Next.js project

[Claude Code](https://docs.claude.com/en/docs/claude-code/overview) writes code fast. But it often says "done" when the code still has errors. Then you find them yourself and ask it to fix them. Again and again.

frontend-harness makes Claude check its own work. After every change, it checks the code. If something is broken, Claude fixes it before it tells you it is done. You get working code, not a list of things to clean up.

## The problems it solves

| Without it | With it |
|---|---|
| ❌ Claude says "done", but the code has errors, bad formatting or failing tests. | ✅ Each edit is formatted and checked at once, and all checks run before "done". Claude fixes what fails. |
| ❌ You repeat the same rules in every chat. | ✅ The rules are written down once, and Claude follows them. |
| ❌ Claude adds a new library for a job the project already has one for. | ✅ One library for each job, and Claude uses it. |
| ❌ The code slowly fills up with copied, unused and very long code. | ✅ Tools catch it on every change, and Claude cleans it up. |
| ❌ A force push, a bad commit message or a leaked password slips through. | ✅ Risky commands are blocked, and every commit is checked. |
| ❌ Code written before the rules does not follow them. | ✅ An audit shows where, and fixes what you pick. |
| ❌ Setting all this up by hand takes days. | ✅ One command sets it up, another updates it. |

Everything goes into your project's own files (`.claude/`, `.githooks/`, configs, `package.json`), so it works without the plugin and for everyone who clones the project.

## Table of Contents

- [Install](#install)
- [Commands](#commands)
- [Modules](#modules)
- [My Educational Courses](#my-educational-courses)
- [Contributing](#contributing)
- [License](#license)

## Install

You need [Claude Code](https://docs.claude.com/en/docs/claude-code/overview), [Node.js](https://nodejs.org), git and a React (Vite) or Next.js project. In the project's folder:

```bash
claude plugin marketplace add dvasyliev/frontend-harness
claude plugin install frontend-harness@frontend-harness --scope local
```

`--scope local` turns it on only for you in this project; `--scope project` for everyone on the project; `--scope user` in all your projects.

Then open Claude Code in the project and run `/frontend-harness:setup`. It asks which framework and modules you want, adds the files, keeps what the project already had, runs the checks and commits. The files it adds: hooks, rules and settings in `.claude/`, git hooks in `.githooks/`, configs for the tools you picked, and scripts in `package.json`.

## Commands

| Command | What it does |
|---|---|
| `/frontend-harness:setup` | Sets up the harness. Run it again to add or remove modules, or just ask: "add e2e tests". |
| `/frontend-harness:update` | Brings the harness to the newest version of the plugin and keeps your own edits. |
| `/frontend-harness:libraries` | Picks one library for each job: forms, data, dates and so on. |
| `/frontend-harness:audit` | Checks code written before the harness against its rules, shows what breaks them, and fixes what you pick. To check only some modules: `/frontend-harness:audit core libraries`. |

With the `feature-workflow` module, your project also gets:

| Command | What it does |
|---|---|
| `/feature-workflow` | Builds a feature step by step: spec, plan, tests first, a check in the browser. Claude uses it on its own for new features. |
| `/improve-harness` | Finds where the harness let Claude down in this chat (a hook that did not run, a rule it ignored) and fixes what you approve. |

To turn off one check, update the plugin or remove it, see the [plugin guide](plugins/frontend-harness/README.md).

## Modules

Pick only what you need. `core` is always on.

| Module | What it does for you |
|---|---|
| `core` | Formats and checks each file Claude edits. Runs all checks before Claude finishes. Blocks risky commands. Checks types (TypeScript). |
| `feature-workflow` | Claude works in steps: describe the feature, plan it, write tests first, check it in the browser. |
| `eslint` or `oxlint` | Finds code mistakes and bad patterns. Also stops files from getting too long. |
| `knip` | Finds code and packages nobody uses. |
| `jscpd` | Finds copied code. |
| `tailwind` | Keeps Tailwind classes in the same order everywhere. |
| `unit` | Runs unit tests (Vitest). |
| `e2e` | Runs browser tests (Playwright) and checks pages for accessibility problems before you push. |
| `commitlint` | Checks that commit messages follow one format. |
| `pre-commit` | Before each commit, looks for passwords and keys and checks the changed files. |
| `sync-deps` | Runs `npm install` for you after a pull that changed packages. |
| `best-practices` | Gives Claude Vercel's React and Next.js guides. |
| `context7` | Lets Claude read the current docs of your libraries, not old ones from memory. |
| `libraries` | One chosen library for each job, so Claude does not add new ones. |
| `next-docs` | Gives Claude the docs of your exact Next.js version. |
| `page-speed` | Rules for fast pages, a browser tool to measure them, and a size limit for your code bundle (React). |

Full details for each module: [plugin guide](plugins/frontend-harness/README.md#modules).

<!-- COURSES:START -->
## My Educational Courses

I teach developers what I use in production: practical, project-based courses on AI coding tools, Agentic AI, Vibe Coding and modern full-stack technologies. Every course builds on projects I ship and workflows I test first. Students learn what holds up in real work, from new framework releases to AI coding tools.

👨‍🎓 Taught **235,000+ students** across Udemy and Coursera, with a **4.4+ average rating**.<br/>
📚 Created **25+ courses** across AI coding, frontend, full-stack and modern developer tools.

#### AI Coding Courses

<p>
  <a href="https://go.dvasyliev.com/harness-engineering"><img src="https://raw.githubusercontent.com/dvasyliev/courses-links/main/covers/harness-engineering.png" width="150" alt="Harness Engineering: Modern AI Software Development Bootcamp"/></a>
  <a href="https://go.dvasyliev.com/claude-code"><img src="https://raw.githubusercontent.com/dvasyliev/courses-links/main/covers/claude-code.png" width="150" alt="Claude Code: AI Crash Course for Developers"/></a>
  <a href="https://go.dvasyliev.com/openclaw"><img src="https://raw.githubusercontent.com/dvasyliev/courses-links/main/covers/openclaw.png" width="150" alt="OpenClaw for Developers: AI Coding Crash Course"/></a>
  <a href="https://go.dvasyliev.com/evaluating-ai-code"><img src="https://raw.githubusercontent.com/dvasyliev/courses-links/main/covers/evaluating-ai-code.png" width="150" alt="AI Code Review: Evaluate Python Code with Confidence"/></a>
  <a href="https://go.dvasyliev.com/cca-f"><img src="https://raw.githubusercontent.com/dvasyliev/courses-links/main/covers/cca-f.png" width="150" alt="CCA-F: Claude Certified Architect - Practice Certification Exam"/></a>
  <a href="https://go.dvasyliev.com/copilot"><img src="https://raw.githubusercontent.com/dvasyliev/courses-links/main/covers/copilot.png" width="150" alt="GitHub Copilot for Beginners: AI Coding Crash Course"/></a>
  <a href="https://go.dvasyliev.com/cursor"><img src="https://raw.githubusercontent.com/dvasyliev/courses-links/main/covers/cursor.png" width="150" alt="Cursor AI for Beginners: AI Coding Crash Course"/></a>
  <a href="https://go.dvasyliev.com/v0"><img src="https://raw.githubusercontent.com/dvasyliev/courses-links/main/covers/v0.png" width="150" alt="Vibe Coding for Developers: v0 AI, Supabase, Vercel Deploy"/></a>
  <a href="https://go.dvasyliev.com/lovable"><img src="https://raw.githubusercontent.com/dvasyliev/courses-links/main/covers/lovable.png" width="150" alt="Lovable AI: Complete Guide for Vibe Coding"/></a>
  <a href="https://go.dvasyliev.com/gh300"><img src="https://raw.githubusercontent.com/dvasyliev/courses-links/main/covers/gh300.png" width="150" alt="GH-300: Github Copilot – Complete Exam Preparation Guide"/></a>
</p>

#### Web Development Courses

<p>
  <a href="https://go.dvasyliev.com/react"><img src="https://raw.githubusercontent.com/dvasyliev/courses-links/main/covers/react.png" width="150" alt="React Crash Course: From Zero to Hero"/></a>
  <a href="https://go.dvasyliev.com/ai-chatbot"><img src="https://raw.githubusercontent.com/dvasyliev/courses-links/main/covers/ai-chatbot.png" width="150" alt="React.js AI Chatbot built with ChatGPT, Gemini AI and DeepSeek"/></a>
  <a href="https://go.dvasyliev.com/nextjs"><img src="https://raw.githubusercontent.com/dvasyliev/courses-links/main/covers/nextjs.png" width="150" alt="Next.js Crash Course: Build a Full-Stack App in a Weekend"/></a>
  <a href="https://go.dvasyliev.com/nodejs"><img src="https://raw.githubusercontent.com/dvasyliev/courses-links/main/covers/nodejs.png" width="150" alt="Node.js Crash Course: Build a REST API in a Weekend"/></a>
</p>

[See more courses →](https://www.dvasyliev.com/courses)
<!-- COURSES:END -->

## Contributing

Have a question, found a bug or have an idea? [Open an issue](https://github.com/dvasyliev/frontend-harness/issues). Pull requests are welcome.

After you clone the repo, run `npm install` once. It turns on git checks for your commits. Commit messages follow [Conventional Commits](https://www.conventionalcommits.org), for example `fix(frontend-harness): ...`. Versions and the changelog are made from these messages, so do not change them by hand. Commit rules: [CLAUDE.md](CLAUDE.md). How the plugin is built: [plugin's CLAUDE.md](plugins/frontend-harness/CLAUDE.md).

## License

[MIT](LICENSE) © Dmytro Vasyliev

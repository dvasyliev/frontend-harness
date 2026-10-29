# Hooks

Claude Code hooks in `.claude/hooks/`, set in `.claude/settings.json`. A red result blocks you until it is fixed.

- `session-start.sh` (session start, resume or clear): reports whether dependencies are installed, whether a dev server already runs, and how many files are uncommitted.
- `guard-commands.sh` (before every Bash command): blocks force push and skipping git hooks (`--no-verify`, `SKIP_VERIFY`).
- `format-lint-file.sh` (after every edit): the `fileChecks` in `.claude/harness.json` (format, lint) on the edited file.
- `check-all.sh` (end of every turn): the `checks` in `.claude/harness.json`; skipped when only `.md` files changed or the same code already passed. `npm run check` runs them all.

Git hooks in `.githooks/` (turned on by `npm install`) check commit messages and run the end-to-end tests before a push, when their modules are installed.

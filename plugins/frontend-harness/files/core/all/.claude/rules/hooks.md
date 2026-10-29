# Hooks

Claude Code hooks in `.claude/hooks/`, set in `.claude/settings.json`. A red result blocks you until it is fixed.

- `session-start.sh` (session start, resume or clear): reports whether dependencies are installed, whether a dev server already runs, and how many files are uncommitted.
- `guard-commands.sh` (before every Bash command): blocks force push and skipping git hooks (`--no-verify`, `SKIP_VERIFY`).
- `format-lint-file.sh` (after every edit): the `fileChecks` in `.claude/harness.json` (format, lint) on the edited file.
- `check-all.sh` (end of every turn): the `checks` in `.claude/harness.json`; skipped when only `.md` files changed or the same code already passed. `npm run check` runs them all.

Git hooks in `.githooks/`, from the installed modules: secrets and staged code before a commit, the commit message, the end-to-end tests before a push, `npm install` after a pull. The harness and `npm install` turn them on, unless the project runs its git hooks from elsewhere (husky).

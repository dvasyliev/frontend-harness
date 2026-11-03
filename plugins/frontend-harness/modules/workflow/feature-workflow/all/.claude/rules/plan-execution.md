# Plan execution

How to carry out a plan from `superpowers:writing-plans`, whatever it is for: a feature, the fixes of an audit. A sentence marked with a module (such as "With `unit`") applies only when that module is in the harness modules listed in `.claude/rules/harness.md`.

Do not ask how to carry out the plan; choose:

- **Default:** do every task yourself in this session (`superpowers:executing-plans`).
- **Plan long enough that its later tasks would run on a compacted conversation, or a risky change that needs a review after each task:** use `superpowers:subagent-driven-development`: one subagent per task, in order, with a review after each. Skip its worktree setup and work on `main`; each implementer commits only its own files.

## Subagents

Subagents that implement a task do not run `npm run check`; the Stop hook does. With `unit`, they run only the unit tests of the files they touch (`npx vitest run <files>`). With `e2e`, the subagent on the end-to-end task runs only its spec files, never `npm run verify`, which runs once after the last task.

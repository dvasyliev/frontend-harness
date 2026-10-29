# Building a feature

For every user-facing feature, go through the steps below in order. Work on `main`; no branches, worktrees or PRs, even when a skill suggests them.

Ask every question that has ready answer options (including "apply this?" after a proposal) with `AskUserQuestion`, never as plain text at the end of a reply. This holds inside `superpowers:brainstorming` too, even where it says to ask open questions in text; only a question with no sensible options stays in text.

A step or sentence marked with a module (such as "With `e2e`") applies only when that module is in the harness modules listed in `.claude/harness.md`; skip it otherwise.

## Spec

Start from the feature's spec in `docs/superpowers/specs/`, if it has one. Note what existing code is reused and what the feature replaces.

Specs and plans go where superpowers puts them, in the docs language given in `.claude/harness.md`: a spec (from `superpowers:brainstorming` or written by hand) in `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`, a plan in `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md` with the `writing-plans` header and a `**Spec:**` line pointing to its spec.

Then decide what the request needs:

- **Intent unclear** (vague or garbled request, several readings): ask with `AskUserQuestion` before anything else, as many questions as it takes, with a recommended option first. Never ask what the code or existing patterns already answer.
- **Intent clear, but a real design choice is open:** use `superpowers:brainstorming`.
- **Intent and design both clear:** go straight to the plan.

## Plan

Use `superpowers:writing-plans`. List each scenario's user steps with the expected outcome on `- expect:` lines.

With `next-rules`: before changing any code, measure each page the feature will touch as `performance.md` says; these are the "before" numbers for the browser check.

If `superpowers:brainstorming` produced a written spec, show the plan and wait for the user's approval. Otherwise start at once. Either way, do not ask how to carry out the plan; choose:

- **Default:** do every task yourself in this session (`superpowers:executing-plans`).
- **Plan long enough that its later tasks would run on a compacted conversation, or a risky change that needs a review after each task:** use `superpowers:subagent-driven-development`: one subagent per task, in order, with a review after each. Skip its worktree setup and work on `main`; each implementer commits only its own files.

Never run implementer subagents in parallel: they share one working tree on `main`. With `e2e`: make the end-to-end tests the plan's last task, so the final review that both skills end with covers them; that review is the feature's review. The browser check stays with you, not the subagents. Ask the user only about what the spec leaves open, not about how to execute.

## Unit tests first (with `unit`)

Use `superpowers:test-driven-development`: write the tests, watch them fail with `npm test`, then implement.

## Browser check (with `e2e`)

With the `playwright-cli` skill, drive the feature on the running dev server and confirm the `- expect:` outcomes.

With `next-rules`: then measure each page the feature touches as `performance.md` says (time cold and warm, HTML size, cards sent), and give the before and after numbers in the final message.

### Screenshots

Every screenshot stays in the conversation and is re-read on every later turn, so take few and small ones.

- Check behaviour with `playwright-cli snapshot` (text), not screenshots. Search it instead of reading it whole when you look for one thing.
- Take a screenshot only to judge how something looks: layout, colours, spacing.
- Screenshot the element in question (`playwright-cli screenshot e5`), not the whole page. Never use `--hires`.
- Fix the window size before screenshots: `playwright-cli resize 1280 800` for desktop, `playwright-cli open --mobile` for phone.
- One screenshot per state you need to judge. Do not re-take one to confirm a change a snapshot already shows.

## End-to-end tests (with `e2e`)

Write them for the feature's happy paths only, one per main scenario.

While working, run only the feature's own spec files (`npx playwright test tests/x/y.spec.ts`). Commits after each task are fine; run the whole suite with `npm run verify` once, before the last commit.

## Improve the harness

Invoke the `improve-harness` skill.

## Subagents

Subagents that implement a task run only the unit tests of the files they touch (`npx vitest run <files>`), plus the spec file on the end-to-end task. They do not run `npm run check` or `npm run verify`; the Stop hook and the end-to-end step cover those.

---
name: feature-workflow
description: Use when building any user-facing feature, from the request to the last commit - spec, plan, tests first, browser check, end-to-end tests and improving the harness.
---

# Building a feature

Go through the steps below in order.

A step or sentence marked with a module (such as "With `e2e`") applies only when that module is in the harness modules listed in `.claude/rules/harness.md`; skip it otherwise.

## Spec

Start from the feature's spec in `docs/superpowers/specs/`, if it has one. Note what existing code is reused and what the feature replaces.

Specs and plans go where superpowers puts them, in the docs language given in `.claude/rules/harness.md`: a spec (from `superpowers:brainstorming` or written by hand) in `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`, a plan in `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md` with the `writing-plans` header and a `**Spec:**` line pointing to its spec.

Then decide what the request needs:

- **Intent unclear** (vague or garbled request, several readings): ask with `AskUserQuestion` before anything else, as many questions as it takes, with a recommended option first. Never ask what the code or existing patterns already answer.
- **Intent clear, but a real design choice is open:** use `superpowers:brainstorming`.
- **Intent and design both clear:** go straight to the plan.

## Plan

Use `superpowers:writing-plans`. List each scenario's user steps with the expected outcome on `- expect:` lines.

If `superpowers:brainstorming` produced a written spec, show the plan and wait for the user's approval. Otherwise start at once. Either way, carry it out as `.claude/rules/plan-execution.md` says.

With `e2e`: make the end-to-end tests the plan's last task, so the final review that both ways of carrying it out end with covers them; that review is the feature's review. The browser check stays with you, not the subagents.

Ask the user only about what the spec leaves open, not about how to execute.

## Unit tests first (with `unit`)

Use `superpowers:test-driven-development`: write the tests, watch them fail with `npm test`, then implement.

## Browser check (with `e2e`)

With the `playwright-cli` skill, drive the feature on the running dev server and confirm the `- expect:` outcomes.

`@playwright/cli` is a devDependency of the project: run every command as `npx playwright-cli <command>`, where the skill writes `playwright-cli <command>`. Never install it globally, even when the skill says to.

Open a browser of your own, named after the feature (`npx playwright-cli -s=<feature> open`), and pass the same `-s` to every command; the default session is shared with every other agent and with the user. Close it when done (`npx playwright-cli -s=<feature> close`).

### Screenshots

Every screenshot stays in the conversation and is re-read on every later turn, so take few and small ones.

- Check behaviour with `npx playwright-cli snapshot` (text), not screenshots. Search it instead of reading it whole when you look for one thing.
- Take a screenshot only to judge how something looks: layout, colours, spacing.
- Screenshot the element in question (`npx playwright-cli screenshot e5`), not the whole page. Never use `--hires`.
- Fix the window size before screenshots: `npx playwright-cli resize 1280 800` for desktop, `npx playwright-cli open --mobile` for phone.
- One screenshot per state you need to judge. Do not re-take one to confirm a change a snapshot already shows.

## End-to-end tests (with `e2e`)

Write them for the feature's happy paths only, one per main scenario.

While working, run only the feature's own spec files (`npx playwright test tests/x/y.spec.ts`). Commits after each task are fine; run the whole suite with `npm run verify` once, before the last commit. After every run, read its log for errors as `tests-e2e.md` says; a run that passes but logs an error the feature caused is not done.

## Improve the harness

Invoke the `improve-harness` skill.

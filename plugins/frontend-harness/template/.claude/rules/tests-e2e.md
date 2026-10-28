---
paths:
  - "tests/**"
  - "playwright.config.ts"
---

# End-to-end tests

- End-to-end tests live in `tests/<feature>/<scenario>.spec.ts`, one per file, written with the `playwright-cli` skill starting from `tests/seed.spec.ts`. Assertions come from the plan's `- expect:` lines. Use `getByRole`, `getByLabel`, `getByTestId`, never CSS selectors.
- `playwright.config.ts` reuses the running dev server (port from `PORT`, else the `port` in `.claude/harness.json`) and starts one only if none is running.

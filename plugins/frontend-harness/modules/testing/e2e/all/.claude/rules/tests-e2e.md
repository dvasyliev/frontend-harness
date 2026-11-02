---
paths:
  - "tests/**"
  - "playwright.config.ts"
---

# End-to-end tests

- End-to-end tests live in `tests/<feature>/<scenario>.spec.ts`, one per file, written with the `playwright-cli` skill starting from `tests/seed.spec.ts`. Assertions come from the plan's `- expect:` lines. Use `getByRole`, `getByLabel`, `getByTestId`, never CSS selectors.
- Specs import `test` and `expect` from `tests/fixtures.ts`, not `@playwright/test`: after every `goto`, `reload` and `goBack` it waits until React has taken over every link, button and field, so no click lands before React handles it. After every `goto` it also checks the page with axe (WCAG 2.1 A and AA). A menu or dialog a test opens is not covered: check it with `AxeBuilder` in the test.
- `playwright.config.ts` reuses the running dev server (port from `PORT`, else the `port` in `.claude/harness.json`) and starts one only if none is running.
- The `pre-push` git hook runs `npm run verify`; the push is cancelled if it fails.

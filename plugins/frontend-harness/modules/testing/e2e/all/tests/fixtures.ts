import { test as base, type Page } from "@playwright/test";

export * from "@playwright/test";

// A click that lands before React has taken over a control does nothing, and
// React can take over a page late: server-rendered parts (each streamed
// Suspense block on its own) hydrate after the load event. So every page load
// waits until React has props on every control. The hidden server action id
// inputs are React's own and never get props.
const allHydrated = () =>
  [
    ...document.querySelectorAll(
      "a[href], button, input:not([type=hidden]), select, textarea, [tabindex]",
    ),
  ].every((el) => Object.keys(el).some((k) => k.startsWith("__reactProps$")));

const thenHydrated =
  <A extends unknown[], R>(page: Page, load: (...args: A) => Promise<R>) =>
  async (...args: A) => {
    const response = await load(...args);
    await page.waitForFunction(allHydrated);
    return response;
  };

// Use this test in every spec instead of the one from @playwright/test.
export const test = base.extend({
  // Not `use`: the React hooks lint rule would take it for a hook.
  page: async ({ page }, provide) => {
    page.goto = thenHydrated(page, page.goto.bind(page));
    page.reload = thenHydrated(page, page.reload.bind(page));
    page.goBack = thenHydrated(page, page.goBack.bind(page));
    await provide(page);
  },
});

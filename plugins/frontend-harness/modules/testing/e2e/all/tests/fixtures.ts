import AxeBuilder from "@axe-core/playwright";
import { expect, test as base, type Page } from "@playwright/test";

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

// Checks the page as it is now for accessibility problems (WCAG 2.1 A and AA).
// Call it once a menu or dialog a test opens is on screen. The focus guards
// that Floating UI and Base UI put around a popup are skipped: they hold focus
// only for a moment and must be aria-hidden, which axe takes for a problem
// (floating-ui/floating-ui#2758).
/** @public Kept for specs that open menus or dialogs, even while none does. */
export const expectAccessible = async (page: Page) => {
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude("[data-floating-ui-focus-guard]")
    .exclude("[data-base-ui-focus-guard]")
    .analyze();
  expect(axe.violations).toEqual([]);
};

// Every page a test opens is checked.
const thenAccessible =
  <A extends unknown[], R>(page: Page, load: (...args: A) => Promise<R>) =>
  async (...args: A) => {
    const response = await load(...args);
    await expectAccessible(page);
    return response;
  };

// Use this test in every spec instead of the one from @playwright/test.
export const test = base.extend({
  // Not `use`: the React hooks lint rule would take it for a hook.
  page: async ({ page }, provide) => {
    page.goto = thenAccessible(page, thenHydrated(page, page.goto.bind(page)));
    page.reload = thenHydrated(page, page.reload.bind(page));
    page.goBack = thenHydrated(page, page.goBack.bind(page));
    await provide(page);
  },
});

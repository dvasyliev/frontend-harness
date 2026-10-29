import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Starting point for generated end-to-end tests: opens the home page and checks it
// for accessibility problems (WCAG 2.1 A and AA).
test("seed", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/");
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
});

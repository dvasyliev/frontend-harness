import { readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// The dev server port: PORT if set, else the `port` in .claude/harness.json.
const { port } = JSON.parse(readFileSync(".claude/harness.json", "utf8")) as { port: number };
const baseURL = `http://localhost:${process.env.PORT ?? port}`;

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: { baseURL, trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Reuse the dev server when one already listens on that port; never start a second.
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
  },
});

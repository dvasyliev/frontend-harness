import { readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// The dev server port: PORT if set, else the `port` in .claude/harness.json.
const { port } = JSON.parse(readFileSync(".claude/harness.json", "utf8")) as { port: number };
const devPort = process.env.PORT ?? String(port);
const baseURL = `http://localhost:${devPort}`;

// The `dev` script fixes the harness port; on another PORT, run it with that port instead.
const { scripts } = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: { dev: string } };
const command =
  devPort === String(port)
    ? "npm run dev"
    : `npx ${scripts.dev.replace(/(--port|-p)[ =]\d+/, `$1 ${devPort}`)}`;

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  // The tests never retry, so a trace is kept for every failure instead.
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Reuse the dev server when one already listens on that port; never start a second.
  webServer: {
    command,
    url: baseURL,
    reuseExistingServer: true,
  },
});

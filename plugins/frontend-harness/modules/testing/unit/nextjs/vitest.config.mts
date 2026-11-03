import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname),
      // Next.js checks `import "server-only"` when it builds; tests run outside it.
      "server-only": "next/dist/compiled/server-only/empty.js",
    },
  },
  test: {
    environment: "jsdom",
    // Unit tests sit next to the unit. tests/ holds the Playwright end-to-end tests.
    include: ["{app,lib}/**/*.spec.{ts,tsx}"],
  },
});

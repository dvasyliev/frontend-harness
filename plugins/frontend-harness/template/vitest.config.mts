import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname{{ '' if stack == 'next' else ', "src"' }}) },
  },
  test: {
    environment: "jsdom",
    // Unit tests sit next to the unit. tests/ holds the Playwright end-to-end tests.
    include: ["{{ '{app,lib}' if stack == 'next' else 'src' }}/**/*.spec.{ts,tsx}"],
  },
});

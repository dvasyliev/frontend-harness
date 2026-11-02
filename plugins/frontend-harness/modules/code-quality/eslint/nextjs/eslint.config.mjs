import { defineConfig, globalIgnores } from "eslint/config";
import boundaries from "eslint-plugin-boundaries";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Type-aware rules (floating promises, misused async, etc.).
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      // No import cycles: modules that import each other, directly or through others.
      "import/no-cycle": "error",
    },
  },
  // File-size limit. Tests are exempt.
  {
    files: ["**/*.{ts,tsx,mts,mjs}"],
    ignores: ["**/*.spec.{ts,tsx}"],
    rules: {
      "max-lines": [
        "error",
        { max: 400, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  // File placement (.claude/rules/structure.md). Shared code is imported through
  // `@/`, never `../`. A route folder is private to its route: other routes,
  // shared components and lib/ may not import from it. lib/ imports nothing
  // from app/.
  {
    files: ["app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "shared", pattern: "app/components", partialMatch: false },
        { type: "api", pattern: "app/api", partialMatch: false },
        // A route group is not a route: each folder inside it is.
        {
          type: "route",
          pattern: "app/\\(*\\)/*",
          capture: ["group", "route"],
          partialMatch: false,
        },
        {
          type: "route",
          pattern: "app/*",
          capture: ["route"],
          partialMatch: false,
        },
        { type: "lib", pattern: "lib", partialMatch: false },
      ],
    },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../*"],
              message: "Import through `@/` instead of `../`.",
            },
          ],
        },
      ],
    },
  },
  // Tests may import whatever they test.
  {
    files: ["app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    ignores: ["**/*.spec.{ts,tsx}"],
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "allow",
          policies: [
            {
              from: {
                element: { types: { anyOf: ["route", "shared", "lib"] } },
              },
              disallow: { to: { element: { type: "route" } } },
            },
            {
              from: { element: { type: "lib" } },
              disallow: {
                to: {
                  element: { types: { anyOf: ["shared", "api", "route"] } },
                },
              },
            },
          ],
        },
      ],
    },
  },
  // Must stay last: turns off rules that conflict with Prettier.
  prettier,
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Claude Code's own files, not the app's code.
    ".claude/**",
  ]),
]);

export default eslintConfig;

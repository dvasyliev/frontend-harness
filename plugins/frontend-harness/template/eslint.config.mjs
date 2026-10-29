{%- if framework == 'next' -%}
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
{%- else -%}
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier/flat";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  // Build output and Claude Code's own files, not the app's code.
  globalIgnores(["dist", ".claude/**"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      // Type-aware rules (floating promises, misused async, etc.).
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
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
  // Must stay last: turns off rules that conflict with Prettier.
  prettier,
]);
{%- endif %}

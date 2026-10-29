import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier/flat";
import { createNodeResolver, importX } from "eslint-plugin-import-x";
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
  // No import cycles: modules that import each other, directly or through others.
  // The resolver reads tsconfig.json and its references, so `@/` imports count too.
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "import-x": importX },
    settings: {
      "import-x/extensions": [".ts", ".tsx", ".js", ".jsx", ".mjs"],
      "import-x/parsers": { "@typescript-eslint/parser": [".ts", ".tsx"] },
      "import-x/resolver-next": [
        createNodeResolver({
          extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".json"],
          tsconfig: {
            configFile: `${import.meta.dirname}/tsconfig.json`,
            references: "auto",
          },
        }),
      ],
    },
    rules: { "import-x/no-cycle": "error" },
  },
  // Must stay last: turns off rules that conflict with Prettier.
  prettier,
]);

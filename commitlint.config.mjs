import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";

// The scope says what a commit changes: a plugin's folder name for plugins/<name>/,
// `marketplace` for .claude-plugin/, `repo` for everything else. A commit that changes
// several names them all, comma-separated (`feat(frontend-harness,marketplace): ...`).
const plugins = readdirSync(new URL("./plugins", import.meta.url), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);
const scopeOf = (path) =>
  path.startsWith("plugins/") ? path.split("/")[1] : path.startsWith(".claude-plugin/") ? "marketplace" : "repo";
const changed = () =>
  [...new Set(execSync("git diff --cached --name-only", { encoding: "utf8" }).split("\n").filter(Boolean).map(scopeOf))].sort();

const config = {
  extends: ["@commitlint/config-conventional"],
  plugins: [
    {
      rules: {
        "scope-matches-changes": ({ scope }) => {
          const want = changed();
          const got = (scope ?? "").split(",").sort();
          const ok = want.length === 0 || want.join(",") === got.join(",");
          return [ok, `scope must be (${want.join(",")}): what this commit changes`];
        },
      },
    },
  ],
  rules: {
    "scope-empty": [2, "never"],
    "scope-enum": [2, "always", [...plugins, "marketplace", "repo"]],
    "scope-matches-changes": [2, "always"],
  },
};

export default config;

#!/usr/bin/env node
// Copier task: writes everything modules.json drives into the project in the current folder.
// Usage: node apply.mjs <modules.json> <stack> '<modules JSON>' '<skip_checks JSON>'
import { execSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const [catalogPath, stackId, modulesArg, skipArg] = process.argv.slice(2);
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const stack = catalog.stacks[stackId];
if (!stack) fail(`unknown stack "${stackId}"`);
const skip = new Set(JSON.parse(skipArg || "[]"));
// Skills and MCP servers are kept as plain files next to modules.json, so they can be edited and updated there.
const library = join(dirname(catalogPath), "library");

const readJson = (path, fallback) => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fallback);
const writeJson = (path, data) => writeFileSync(path, JSON.stringify(data, null, 2) + "\n");

function fail(message) {
  console.error(`harness: ${message}`);
  process.exit(1);
}

// Selected modules plus the ones they require, in catalog order.
const wanted = new Set(JSON.parse(modulesArg));
for (const [id, m] of Object.entries(catalog.modules)) if (m.required) wanted.add(id);
for (const id of wanted) {
  const m = catalog.modules[id];
  if (!m) fail(`unknown module "${id}"`);
  if (m.stacks && !m.stacks.includes(stackId)) fail(`module "${id}" does not fit stack "${stackId}"`);
  for (const dep of m.requires ?? []) wanted.add(dep);
}
const modules = Object.entries(catalog.modules).filter(([id]) => wanted.has(id));
const collect = (key) => modules.flatMap(([, m]) => m[key] ?? []);
const merge = (key) => Object.assign({}, ...modules.map(([, m]) => m[key] ?? {}));

// What the previous run wrote, so a removed module's scripts, skills, plugins and servers go too.
const previous = { scripts: [], skills: [], plugins: [], mcp: [], ...readJson(".claude/harness.json", {}) };

// package.json: harness scripts are set, the project's own are kept.
const pkg = readJson("package.json");
const scripts = Object.fromEntries(
  Object.entries(merge("scripts")).map(([name, s]) => [name, s.run.replace("{srcDirs}", stack.srcDirs.join(" "))]),
);
pkg.scripts ??= {};
for (const name of previous.scripts) if (!(name in scripts)) delete pkg.scripts[name];
Object.assign(pkg.scripts, scripts);
writeJson("package.json", pkg);

// npm packages: install only what the project does not have yet.
const have = { ...pkg.dependencies, ...pkg.devDependencies };
const missing = [...new Set(collect("devDependencies"))].filter((p) => !(p in have));
if (missing.length && !process.env.HARNESS_NO_INSTALL) {
  execSync(`npm install --save-dev ${missing.join(" ")}`, { stdio: "inherit" });
}

// .claude/settings.json: the harness owns `hooks` and its plugins; every other key stays.
const settings = readJson(".claude/settings.json", {});
const hook = (script, extra = {}) => ({
  type: "command",
  command: `bash "$CLAUDE_PROJECT_DIR/.claude/hooks/${script}"`,
  ...extra,
});
settings.hooks = {
  SessionStart: [{ matcher: "startup|resume|clear", hooks: [hook("session-start.sh")] }],
  PreToolUse: [{ matcher: "Bash", hooks: [hook("guard-commands.sh", { statusMessage: "Checking command" })] }],
  PostToolUse: [
    { matcher: "Edit|Write", hooks: [hook("format-lint-file.sh", { timeout: 60, statusMessage: "Formatting and linting" })] },
  ],
  Stop: [{ hooks: [hook("check-all.sh", { timeout: 600, statusMessage: "Running checks" })] }],
};
const plugins = [...new Set(collect("plugins"))];
settings.enabledPlugins ??= {};
for (const p of previous.plugins) if (!plugins.includes(p)) delete settings.enabledPlugins[p];
for (const p of plugins) settings.enabledPlugins[p] = true;
settings.permissions ??= {};
settings.permissions.deny = [...new Set([...(settings.permissions.deny ?? []), "Read(./.env)", "Read(./.env.*)"])];
writeJson(".claude/settings.json", settings);

// .claude/skills: each module's skills are copied whole from library/skills, replacing the old copy.
const skills = Object.keys(merge("skills"));
for (const name of previous.skills) if (!skills.includes(name)) rmSync(`.claude/skills/${name}`, { recursive: true, force: true });
mkdirSync(".claude/skills", { recursive: true });
for (const name of skills) {
  const from = join(library, "skills", name);
  if (!existsSync(from)) fail(`skill "${name}" is missing from library/skills`);
  rmSync(`.claude/skills/${name}`, { recursive: true, force: true });
  cpSync(from, `.claude/skills/${name}`, { recursive: true });
}

// .mcp.json: the harness servers are set from library/mcp.json, the project's own are kept.
const serverDefs = readJson(join(library, "mcp.json"), {});
const servers = Object.fromEntries(
  [...new Set(collect("mcp"))].map((name) => {
    if (!serverDefs[name]) fail(`MCP server "${name}" is missing from library/mcp.json`);
    return [name, serverDefs[name]];
  }),
);
const mcp = readJson(".mcp.json", { mcpServers: {} });
for (const name of previous.mcp) if (!(name in servers)) delete mcp.mcpServers[name];
Object.assign(mcp.mcpServers, servers);
if (Object.keys(mcp.mcpServers).length) writeJson(".mcp.json", mcp);

// .claude/harness.json: what the hooks read, and what this run wrote.
const checks = collect("checks").filter((c) => !skip.has(c.name));
const fileChecks = collect("fileChecks").filter((c) => !skip.has(c.name));
writeJson(".claude/harness.json", {
  $comment: "Written by the harness template (tasks/apply.mjs). Do not edit; change the Copier answers instead.",
  stack: stackId,
  port: stack.port,
  modules: modules.map(([id]) => id),
  skipChecks: [...skip],
  checks,
  fileChecks,
  scripts: Object.keys(scripts),
  skills,
  plugins,
  mcp: Object.keys(servers),
});

// .claude/harness.md: the always-loaded summary CLAUDE.md imports.
const list = (entries, link) => entries.map(([name, text]) => `- ${link(name)}: ${text}`).join("\n");
const scriptDocs = Object.entries(merge("scripts")).map(([name, s]) => `npm run ${name}`.padEnd(24) + `# ${s.describe}`);
const githooks = merge("githooks");
const sections = merge("sections");
const md = [
  "# Harness",
  "",
  "Written by the harness template from `.claude/harness.json`; do not edit by hand.",
  "",
  "## Commands",
  "",
  "```bash",
  "npm run dev".padEnd(24) + `# http://localhost:${stack.port}`,
  ...scriptDocs,
  "```",
  "",
  "## Rules in `.claude/rules/`",
  "",
  list(Object.entries(merge("rules")), (n) => `\`${n}\``),
  "",
  "## Hooks",
  "",
  "Claude Code hooks in `.claude/hooks/`, set in `.claude/settings.json`. A red result blocks you until it is fixed.",
  "",
  "- `session-start.sh` (session start, resume or clear): reports whether dependencies are installed, whether a dev server already runs, and how many files are uncommitted.",
  "- `guard-commands.sh` (before every Bash command): blocks force push and skipping git hooks (`--no-verify`, `SKIP_VERIFY`).",
  `- \`format-lint-file.sh\` (after every edit): ${fileChecks.map((c) => c.name).join(", ")} on the edited file.`,
  `- \`check-all.sh\` (end of every turn): ${checks.map((c) => c.name).join(", ")}; skipped when only \`.md\` files changed or the same code already passed.`,
  ...(Object.keys(githooks).length
    ? ["", "Git hooks in `.githooks/`, turned on by `npm install`:", "", list(Object.entries(githooks), (n) => `\`${n}\``)]
    : []),
  "",
  "## Skills in `.claude/skills/`",
  "",
  list(Object.entries(merge("skills")), (n) => `\`${n}\``),
  ...Object.entries(sections).flatMap(([title, body]) => ["", `## ${title}`, "", body]),
  "",
].join("\n");
writeFileSync(".claude/harness.md", md);

// Hooks must be executable, and git must use .githooks/ even before the next npm install.
for (const dir of [".claude/hooks", ".githooks"]) {
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) chmodSync(`${dir}/${f}`, 0o755);
}
try {
  execSync("git config core.hooksPath .githooks", { stdio: "ignore" });
} catch {
  // Not a git repo yet; `npm install` runs `prepare` later.
}

console.log(`harness: ${modules.map(([id]) => id).join(", ")} on ${stackId}`);

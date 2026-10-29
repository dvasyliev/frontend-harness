#!/usr/bin/env node
// Copier task: writes everything modules.json drives into the project in the current folder.
// Usage: node apply.mjs <modules.json> <framework> '<modules JSON>' '<skip_checks JSON>'
import { execSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const [catalogPath, frameworkId, modulesArg, skipArg] = process.argv.slice(2);
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const framework = catalog.frameworks[frameworkId];
if (!framework) fail(`unknown framework "${frameworkId}"`);
const skip = new Set(JSON.parse(skipArg || "[]"));
// Skills and MCP servers live in library/, laid out like a project (.claude/skills, skills-lock.json, .mcp.json)
// so `npx skills add|update -a claude-code` and `claude mcp add --scope project` work there.
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
  if (m.frameworks && !m.frameworks.includes(frameworkId)) fail(`module "${id}" does not fit framework "${frameworkId}"`);
  for (const dep of m.dependencies?.modules ?? []) wanted.add(dep);
}
const modules = Object.entries(catalog.modules).filter(([id]) => wanted.has(id));
// Each group (the linter) takes exactly `pick` of its modules. Copier renders a module's
// templates from the answers, so a missing one is an error here, not a silent default.
for (const [group, g] of Object.entries(catalog.groups ?? {})) {
  const members = Object.entries(catalog.modules).filter(([, m]) => m.group === group).map(([id]) => id);
  const chosen = members.filter((id) => wanted.has(id));
  if (chosen.length !== g.pick) fail(`choose ${g.pick} ${group} of ${members.join(", ")} (default for ${frameworkId}: ${g.default?.[frameworkId]})`);
}
const collect = (key) => modules.flatMap(([, m]) => m[key] ?? []);
const merge = (key) => Object.assign({}, ...modules.map(([, m]) => m[key] ?? {}));
// The same, for what a module lists under `dependencies`.
const collectDep = (key) => modules.flatMap(([, m]) => m.dependencies?.[key] ?? []);
const mergeDep = (key) => Object.assign({}, ...modules.map(([, m]) => m.dependencies?.[key] ?? {}));
const commands = collectDep("commands");
const rules = mergeDep("rules");
const githooks = mergeDep("githooks");

// What the previous run wrote, so a removed module's scripts, files, skills, plugins and servers go too.
const previous = { scripts: [], files: [], skills: [], plugins: [], mcp: [], setupFiles: [], ...readJson(".claude/harness.json", {}) };

// package.json: harness scripts are set, the project's own are kept.
const pkg = readJson("package.json");
const scripts = Object.fromEntries(
  Object.entries(merge("scripts")).map(([name, s]) => [name, s.run.replace("{srcDirs}", framework.srcDirs.join(" "))]),
);
pkg.scripts ??= {};
for (const name of previous.scripts) if (!(name in scripts)) delete pkg.scripts[name];
Object.assign(pkg.scripts, scripts);
writeJson("package.json", pkg);

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
const plugins = [...new Set(collectDep("plugins"))];
settings.enabledPlugins ??= {};
for (const p of previous.plugins) if (!plugins.includes(p)) delete settings.enabledPlugins[p];
for (const p of plugins) settings.enabledPlugins[p] = true;
settings.permissions ??= {};
settings.permissions.deny = [...new Set([...(settings.permissions.deny ?? []), "Read(./.env)", "Read(./.env.*)"])];
writeJson(".claude/settings.json", settings);

// .claude/skills: the modules' skills from skills.json that fit the framework. One with `install` comes from its own
// repo and is installed at the end, with the npm packages; the others are the harness's own, copied whole from library/.claude/skills.
const skillCatalog = readJson(join(dirname(catalogPath), "skills.json"));
for (const name of collectDep("skills")) if (!skillCatalog.skills[name]) fail(`unknown skill "${name}"`);
const skills = [...new Set(collectDep("skills"))].filter((name) => skillCatalog.skills[name].frameworks.includes(frameworkId));
const lock = readJson("skills-lock.json", null);
for (const name of previous.skills) {
  if (skills.includes(name)) continue;
  rmSync(`.claude/skills/${name}`, { recursive: true, force: true });
  if (lock?.skills) delete lock.skills[name];
}
if (lock) writeJson("skills-lock.json", lock);
mkdirSync(".claude/skills", { recursive: true });
for (const name of skills) {
  if (skillCatalog.skills[name].install) continue;
  const from = join(library, ".claude", "skills", name);
  if (!existsSync(from)) fail(`skill "${name}" is missing from library/.claude/skills`);
  rmSync(`.claude/skills/${name}`, { recursive: true, force: true });
  cpSync(from, `.claude/skills/${name}`, { recursive: true });
}

// Templates: Copier renders them; one missing here means copier.yml `_exclude` and modules.json disagree.
const setupFiles = commands.flatMap((c) => c.creates);
const templates = [
  ...Object.keys(rules).map((name) => `.claude/rules/${name}`).filter((path) => !setupFiles.includes(path)),
  ...collectDep("configs"),
];
for (const path of templates) if (!existsSync(path)) fail(`template "${path}" was not rendered; check _exclude in copier.yml`);

// Files: copied whole from library/ to the same path.
const values = { port: String(framework.port), css: framework.css, srcDirs: framework.srcDirs.join(" ") };
const files = [
  ...collectDep("hooks").map((name) => `.claude/hooks/${name}`),
  ...Object.keys(githooks).map((name) => `.githooks/${name}`),
  ...new Set(collectDep("files")),
];
for (const path of previous.files ?? []) if (!files.includes(path)) rmSync(path, { force: true });
for (const path of files) {
  const from = join(library, path);
  if (!existsSync(from)) fail(`file "${path}" is missing from library/`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, readFileSync(from, "utf8").replace(/\{(port|css|srcDirs)\}/g, (_, key) => values[key]));
}

// A module's `commands` (run at the end) write their own files and MCP servers; `creates` lists those files.
for (const path of previous.setupFiles) if (!setupFiles.includes(path)) rmSync(path, { recursive: true, force: true });

// .mcp.json: the harness servers are set from library/.mcp.json (except those a setup command writes), the project's own are kept.
const serverDefs = readJson(join(library, ".mcp.json"), { mcpServers: {} }).mcpServers;
const mcpNames = [...new Set(collectDep("mcp"))];
const fromSetup = new Set(modules.flatMap(([, m]) => (m.dependencies?.commands ? (m.dependencies.mcp ?? []) : [])));
const servers = Object.fromEntries(
  mcpNames.filter((name) => !fromSetup.has(name)).map((name) => {
    if (!serverDefs[name]) fail(`MCP server "${name}" is missing from library/.mcp.json`);
    return [name, serverDefs[name]];
  }),
);
const mcp = readJson(".mcp.json", { mcpServers: {} });
for (const name of previous.mcp) if (!mcpNames.includes(name)) delete mcp.mcpServers[name];
Object.assign(mcp.mcpServers, servers);
if (Object.keys(mcp.mcpServers).length) writeJson(".mcp.json", mcp);
else rmSync(".mcp.json", { force: true });

// .claude/harness.json: what the hooks read, and what this run wrote.
const checks = collect("checks").filter((c) => !skip.has(c.name));
const fileChecks = collect("fileChecks").filter((c) => !skip.has(c.name));
writeJson(".claude/harness.json", {
  $comment: "Written by the harness template (tasks/apply.mjs). Do not edit; change the Copier answers instead.",
  framework: frameworkId,
  port: framework.port,
  modules: modules.map(([id]) => id),
  skipChecks: [...skip],
  checks,
  fileChecks,
  scripts: Object.keys(scripts),
  skills,
  files,
  plugins,
  mcp: mcpNames,
  setupFiles,
});

// .claude/harness.md: the always-loaded summary CLAUDE.md imports.
const list = (entries, link) => entries.map(([name, text]) => `- ${link(name)}: ${text}`).join("\n");
const scriptDocs = Object.entries(merge("scripts")).map(([name, s]) => `npm run ${name}`.padEnd(24) + `# ${s.describe}`);
const sections = merge("sections");
const md = [
  "# Harness",
  "",
  "Written by the harness template from `.claude/harness.json`; do not edit by hand.",
  "",
  "## Commands",
  "",
  "```bash",
  "npm run dev".padEnd(24) + `# http://localhost:${framework.port}`,
  ...scriptDocs,
  "```",
  "",
  "## Rules in `.claude/rules/`",
  "",
  list(Object.entries(rules), (n) => `\`${n}\``),
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
  list(skills.map((n) => [n, skillCatalog.skills[n].describe]), (n) => `\`${n}\``),
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

console.log(`harness: ${modules.map(([id]) => id).join(", ")} on ${frameworkId}`);

// npm packages last, so every file above is written even when the install fails.
// Install only what the project does not have yet.
const have = { ...pkg.dependencies, ...pkg.devDependencies };
const frameworkDeps = modules.flatMap(([, m]) => m.dependencies?.frameworkDevDependencies?.[frameworkId] ?? []);
const missing = [...new Set([...collectDep("devDependencies"), ...frameworkDeps])].filter((p) => !(p in have));
if (missing.length && !process.env.HARNESS_NO_INSTALL) {
  try {
    execSync(`npm install --save-dev ${missing.join(" ")}`, { stdio: "inherit" });
  } catch {
    fail(`npm install failed; install these by hand: ${missing.join(" ")}`);
  }
}

// Skills from their own repos, only the ones the project does not have yet; `npx skills update` updates them later.
const toInstall = skills.filter((n) => skillCatalog.skills[n].install && !existsSync(`.claude/skills/${n}`));
if (!process.env.HARNESS_NO_INSTALL) {
  for (const name of toInstall) {
    const command = skillCatalog.skills[name].install;
    try {
      execSync(command, { stdio: "inherit" });
    } catch {
      fail(`installing skill "${name}" failed; run by hand: ${command}`);
    }
  }
}

// Module commands, only those whose files are not all there yet.
if (!process.env.HARNESS_NO_INSTALL) {
  for (const command of commands) {
    if (command.creates.every((path) => existsSync(path))) continue;
    try {
      execSync(command.run, { stdio: "inherit" });
    } catch {
      fail(`command failed; run by hand: ${command.run}`);
    }
  }
}

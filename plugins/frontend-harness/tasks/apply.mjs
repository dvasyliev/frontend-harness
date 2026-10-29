#!/usr/bin/env node
// Copier task: writes everything the catalog drives into the project in the current folder.
// Usage: node apply.mjs <catalog dir> <framework> '<modules JSON>' '<skip_checks JSON>'
import { execSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const [catalogDir, frameworkId, modulesArg, skipArg] = process.argv.slice(2);
const readJson = (path, fallback) => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fallback);
const writeJson = (path, data) => writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
const catalog = readJson(join(catalogDir, "modules.json"));
const framework = catalog.frameworks[frameworkId];
if (!framework) fail(`unknown framework "${frameworkId}"`);
const skip = new Set(JSON.parse(skipArg || "[]"));
// Files the harness copies whole: plain folders (skills/, hooks/, githooks/), not laid out like a project.
const library = join(catalogDir, "..", "library");
const noInstall = Boolean(process.env.HARNESS_NO_INSTALL);

function fail(message) {
  console.error(`harness: ${message}`);
  process.exit(1);
}

// Selected modules plus the ones they need, in catalog order.
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
const collectDep = (key) => modules.flatMap(([, m]) => m.dependencies?.[key] ?? []);

// The catalogs a module names entries from.
const kinds = {
  skills: { file: "skills.json", key: "skills" },
  hooks: { file: "hooks.json", key: "hooks" },
  githooks: { file: "githooks.json", key: "githooks" },
  rules: { file: "rules.json", key: "rules" },
  files: { file: "files.json", key: "files" },
  mcp: { file: "mcp.json", key: "servers" },
  plugins: { file: "plugins.json", key: "plugins" },
};
// chosen[kind] = [[name, entry], ...]: the modules' entries that fit the framework.
const chosen = {};
for (const [kind, k] of Object.entries(kinds)) {
  const entries = readJson(join(catalogDir, k.file))[k.key];
  chosen[kind] = [...new Set(collectDep(kind))]
    .map((name) => {
      if (!entries[name]) fail(`unknown ${kind} entry "${name}" (not in ${k.file})`);
      return [name, entries[name]];
    })
    .filter(([, e]) => !e.frameworks || e.frameworks.includes(frameworkId));
}
// `output`: the path (or paths) an entry writes in the project.
const entries = Object.entries(chosen).flatMap(([kind, list]) => list.map(([name, e]) => ({ kind, name, e })));
const output = (x) => [x.e.output ?? []].flat();
const installs = entries.filter((x) => x.e.install);
const created = installs.flatMap(output);
for (const x of entries) {
  if ((x.e.copy || x.e.template) && typeof x.e.output !== "string") fail(`${x.kind} entry "${x.name}" needs one output path`);
  if (x.e.install || x.e.copy || x.e.template || x.e.server || x.kind === "plugins") continue;
  const missing = output(x).filter((path) => !created.includes(path));
  if (!output(x).length || missing.length) fail(`${x.kind} entry "${x.name}" has no install, copy or template, and no install outputs ${missing.join(", ") || "it"}`);
}

// What the previous run wrote, so what no module needs any more goes too.
const previous = { scripts: [], paths: [], plugins: [], mcp: [], ...readJson(".claude/harness.json", {}) };

// package.json: harness scripts are set, the project's own are kept.
const pkg = readJson("package.json");
const scripts = Object.fromEntries(
  Object.entries(merge("scripts")).map(([name, s]) => [name, s.run.replace("{srcDirs}", framework.srcDirs.join(" "))]),
);
pkg.scripts ??= {};
for (const name of previous.scripts) if (!(name in scripts)) delete pkg.scripts[name];
Object.assign(pkg.scripts, scripts);
writeJson("package.json", pkg);

// Paths: copied entries and what installs create. One no module needs any more is removed.
const copies = entries.filter((x) => x.e.copy);
const paths = [...new Set([...copies.map((x) => x.e.output), ...created])];
const lock = readJson("skills-lock.json", null);
for (const path of previous.paths) {
  if (paths.includes(path)) continue;
  rmSync(path, { recursive: true, force: true });
  if (lock?.skills && path.startsWith(".claude/skills/")) delete lock.skills[path.slice(".claude/skills/".length)];
}
if (lock) writeJson("skills-lock.json", lock);

// Copy: library/<copy> to the entry's output, whole; a file has {port}, {css} and {srcDirs} replaced.
const values = { port: String(framework.port), css: framework.css, srcDirs: framework.srcDirs.join(" ") };
for (const x of copies) {
  const from = join(library, x.e.copy);
  if (!existsSync(from)) fail(`${x.kind} entry "${x.name}": library/${x.e.copy} is missing`);
  rmSync(x.e.output, { recursive: true, force: true });
  mkdirSync(dirname(x.e.output), { recursive: true });
  if (statSync(from).isDirectory()) cpSync(from, x.e.output, { recursive: true });
  else writeFileSync(x.e.output, readFileSync(from, "utf8").replace(/\{(port|css|srcDirs)\}/g, (_, key) => values[key]));
}

// Template: Copier renders template/<template> at the same path; one missing here means copier.yml `_exclude` and the catalog disagree.
for (const x of entries.filter((x) => x.e.template)) {
  if (x.e.template !== x.e.output) fail(`${x.kind} entry "${x.name}": Copier writes a template to its own path, so output must be "${x.e.template}"`);
  if (!existsSync(x.e.output)) fail(`template "${x.e.template}" was not rendered; check _exclude in copier.yml`);
}

// .claude/settings.json: the harness owns `hooks` and its plugins; every other key stays.
const settings = readJson(".claude/settings.json", {});
settings.hooks = {};
for (const [, { output, event, matcher, timeout, statusMessage }] of chosen.hooks) {
  const command = { type: "command", command: `bash "$CLAUDE_PROJECT_DIR/${output}"`, timeout, statusMessage };
  (settings.hooks[event] ??= []).push({ ...(matcher && { matcher }), hooks: [command] });
}
const plugins = chosen.plugins.map(([name]) => name);
settings.enabledPlugins ??= {};
for (const p of previous.plugins) if (!plugins.includes(p)) delete settings.enabledPlugins[p];
for (const p of plugins) settings.enabledPlugins[p] = true;
settings.permissions ??= {};
settings.permissions.deny = [...new Set([...(settings.permissions.deny ?? []), "Read(./.env)", "Read(./.env.*)"])];
writeJson(".claude/settings.json", settings);

// .mcp.json: a server given as `server` is set here (one with `install` writes itself); the project's own are kept.
const mcpNames = chosen.mcp.map(([name]) => name);
const mcp = readJson(".mcp.json", { mcpServers: {} });
for (const name of previous.mcp) if (!mcpNames.includes(name)) delete mcp.mcpServers[name];
for (const [name, e] of chosen.mcp) if (e.server) mcp.mcpServers[name] = e.server;
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
  paths,
  plugins,
  mcp: mcpNames,
});

// .claude/harness.md: the always-loaded summary CLAUDE.md imports.
const list = (kind) => chosen[kind].map(([name, e]) => `- \`${name}\`: ${e.describe}`).join("\n");
const scriptDocs = Object.entries(merge("scripts")).map(([name, s]) => `npm run ${name}`.padEnd(24) + `# ${s.describe}`);
const sections = merge("sections");
const hookDocs = (text) =>
  text.replace("{checks}", checks.map((c) => c.name).join(", ")).replace("{fileChecks}", fileChecks.map((c) => c.name).join(", "));
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
  list("rules"),
  "",
  "## Hooks",
  "",
  "Claude Code hooks in `.claude/hooks/`, set in `.claude/settings.json`. A red result blocks you until it is fixed.",
  "",
  ...chosen.hooks.map(([, e]) => `- \`${basename(e.output)}\` ${hookDocs(e.describe)}`),
  ...(chosen.githooks.length ? ["", "Git hooks in `.githooks/`, turned on by `npm install`:", "", list("githooks")] : []),
  "",
  "## Skills in `.claude/skills/`",
  "",
  list("skills"),
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
if (missing.length && !noInstall) {
  try {
    execSync(`npm install --save-dev ${missing.join(" ")}`, { stdio: "inherit" });
  } catch {
    fail(`npm install failed; install these by hand: ${missing.join(" ")}`);
  }
}

// Install commands: each runs when a path in its `output` is missing (a plugin, which has no output file, runs every time).
if (!noInstall) {
  for (const x of installs) {
    const paths = output(x);
    if (paths.length && paths.every((path) => existsSync(path))) continue;
    try {
      execSync(x.e.install, { stdio: "inherit" });
    } catch {
      fail(`installing ${x.kind} entry "${x.name}" failed; run by hand: ${x.e.install}`);
    }
  }
}

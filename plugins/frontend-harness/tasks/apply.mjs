#!/usr/bin/env node
// Copier task: writes everything the catalog drives into the project in the current folder.
// Usage: node apply.mjs <catalog dir> <framework> '<modules JSON>' '<skip_checks JSON>' <docs_language>
import { execSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const [catalogDir, frameworkId, modulesArg, skipArg, docsLanguage] = process.argv.slice(2);
const readJson = (path, fallback) => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fallback);
const writeJson = (path, data) => writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
const catalog = readJson(join(catalogDir, "modules.json"));
const framework = catalog.frameworks[frameworkId];
if (!framework) fail(`unknown framework "${frameworkId}"`);
const skip = new Set(JSON.parse(skipArg || "[]"));
// The entries' inputs: plain folders (skills/, hooks/, githooks/, rules/, files/), not laid out like a project.
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
// Each group (the linter) takes exactly `pick` of its modules; a missing one is an error, not a silent default.
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
  if (x.e.input && typeof x.e.output !== "string") fail(`${x.kind} entry "${x.name}" needs one output path`);
  if (x.e.install || x.e.input || x.e.server || x.kind === "plugins") continue;
  const missing = output(x).filter((path) => !created.includes(path));
  if (!output(x).length || missing.length) fail(`${x.kind} entry "${x.name}" has no install or input, and no install outputs ${missing.join(", ") || "it"}`);
}

// What the previous run wrote, so what no module needs any more goes too.
const previous = { scripts: [], paths: [], plugins: [], mcp: [], ...readJson(".claude/harness.json", {}) };

// package.json: harness scripts are set, the project's own are kept.
const pkg = readJson("package.json");
const scripts = Object.fromEntries(
  Object.entries(merge("scripts")).map(([name, s]) => [name, s.command.replace("{srcDirs}", framework.srcDirs.join(" "))]),
);
pkg.scripts ??= {};
for (const name of previous.scripts) if (!(name in scripts)) delete pkg.scripts[name];
Object.assign(pkg.scripts, scripts);
writeJson("package.json", pkg);

// Paths: the inputs' outputs and what installs create. One no module needs any more is removed,
// except a merged file the project has edited.
const inputs = entries.filter((x) => x.e.input);
const paths = [...new Set([...inputs.map((x) => x.e.output), ...created])];
const basePath = (path) => join(".claude/harness-base", path);
const edited = (path) => existsSync(basePath(path)) && existsSync(path) && readFileSync(path, "utf8") !== readFileSync(basePath(path), "utf8");
const notes = [];
const lock = readJson("skills-lock.json", null);
for (const path of previous.paths) {
  if (paths.includes(path)) continue;
  if (edited(path)) notes.push(`${path}: no module needs it any more, but the project edited it, so it stays`);
  else rmSync(path, { recursive: true, force: true });
  rmSync(basePath(path), { force: true });
  if (lock?.skills && path.startsWith(".claude/skills/")) delete lock.skills[path.slice(".claude/skills/".length)];
}
if (lock) writeJson("skills-lock.json", lock);

// Inputs: a folder is copied as it is; a file has its Jinja filled in (tasks/render.py), then reaches its output by `mode`.
for (const x of inputs) if (!existsSync(join(library, x.e.input))) fail(`${x.kind} entry "${x.name}": library/${x.e.input} is missing`);
const isFile = (x) => statSync(join(library, x.e.input)).isFile();
const fileInputs = inputs.filter(isFile);
let rendered = {};
try {
  const request = JSON.stringify({
    context: { framework: frameworkId, modules: modules.map(([id]) => id), docs_language: docsLanguage },
    files: Object.fromEntries(fileInputs.map((x) => [x.e.output, join(library, x.e.input)])),
  });
  const script = join(catalogDir, "..", "tasks", "render.py");
  rendered = JSON.parse(execSync(`uv run --quiet --no-project --with jinja2 python "${script}"`, { input: request, encoding: "utf8" }));
} catch (error) {
  fail(`filling in the Jinja failed: ${error.message}`);
}
const write = (path, text) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
};
for (const x of inputs) {
  const path = x.e.output;
  if (!isFile(x)) {
    rmSync(path, { recursive: true, force: true });
    mkdirSync(dirname(path), { recursive: true });
    cpSync(join(library, x.e.input), path, { recursive: true });
    continue;
  }
  const next = rendered[path];
  const mode = x.e.mode ?? "override";
  if (mode === "merge" && existsSync(path)) {
    const current = readFileSync(path, "utf8");
    if (!existsSync(basePath(path))) {
      // The project had this file before the harness: leave it for the skill to merge.
      if (current !== next) {
        notes.push(`${path}: the project already had it; merge the harness version by hand (saved as ${basePath(path)}.new)`);
        write(`${basePath(path)}.new`, next);
        continue;
      }
    } else if (current !== readFileSync(basePath(path), "utf8")) {
      // Project edits and harness changes: three-way merge, as git merges branches.
      write(`${basePath(path)}.next`, next);
      try {
        execSync(`git merge-file -L project -L last-install -L harness "${path}" "${basePath(path)}" "${basePath(path)}.next"`, { stdio: "ignore" });
      } catch {
        notes.push(`${path}: merge conflicts; resolve the <<<<<<< markers`);
      }
      rmSync(`${basePath(path)}.next`);
      write(basePath(path), next);
      continue;
    }
  }
  write(path, next);
  if (mode === "merge") write(basePath(path), next);
}

// .claude/settings.json: the harness owns `hooks` and its plugins; every other key stays.
const settings = readJson(".claude/settings.json", {});
settings.hooks = {};
for (const [name, { output, config }] of chosen.hooks) {
  const { event, matcher, hook } = config;
  if (hook.type === "command" && !hook.command.includes(output)) fail(`hook "${name}": its command does not run its output ${output}`);
  (settings.hooks[event] ??= []).push({ ...(matcher && { matcher }), hooks: [hook] });
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
const list = (kind) => chosen[kind].map(([name, e]) => `- \`${name}\`: ${e.description}`).join("\n");
const scriptDocs = Object.entries(merge("scripts")).map(([name, s]) => `npm run ${name}`.padEnd(24) + `# ${s.description}`);
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
  ...chosen.hooks.map(([, e]) => `- \`${basename(e.output)}\` ${hookDocs(e.description)}`),
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
for (const note of notes) console.log(`harness: ${note}`);

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

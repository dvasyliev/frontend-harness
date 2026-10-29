#!/usr/bin/env node
// Writes the chosen modules (modules.json, files/) into the project in the current folder.
// Usage: node apply.mjs '{"framework": "nextjs", "modules": [...], "skipChecks": [...], "docsLanguage": "English"}'
// An answer left out keeps its value from the last run (.claude/harness.json).
import { execSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const root = join(import.meta.dirname, "..");
const readJson = (path, fallback) => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fallback);
const writeJson = (path, data) => writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
if (!existsSync("package.json")) fail("no package.json here; run this in the project folder");
const old = readJson(".claude/harness.json", {});
const answers = { modules: [], skipChecks: [], docsLanguage: "English", ...old, ...JSON.parse(process.argv[2] || "{}") };
const { version } = readJson(join(root, ".claude-plugin", "plugin.json"));
const catalog = readJson(join(root, "modules.json"));
const frameworkId = answers.framework;
const framework = catalog.frameworks[frameworkId];
if (!framework) fail(`unknown framework "${frameworkId}"`);
const skip = new Set(answers.skipChecks);
const noInstall = Boolean(process.env.HARNESS_NO_INSTALL);

function fail(message) {
  console.error(`harness: ${message}`);
  process.exit(1);
}

// Selected modules plus the required ones, in catalog order, with exactly one linter.
const wanted = new Set(answers.modules);
for (const [id, m] of Object.entries(catalog.modules)) if (m.required) wanted.add(id);
for (const id of wanted) {
  const m = catalog.modules[id];
  if (!m) fail(`unknown module "${id}"`);
}
const modules = Object.entries(catalog.modules).filter(([id]) => wanted.has(id));
const linters = Object.entries(catalog.modules).filter(([, m]) => m.linter).map(([id]) => id);
if (modules.filter(([, m]) => m.linter).length !== 1) fail(`choose one linter of ${linters.join(", ")} (default for ${frameworkId}: ${framework.linter})`);
const collect = (key) => modules.flatMap(([, m]) => m[key] ?? []);

// JSON the modules add to the project's own files: objects by key, arrays by item.
// `unmerge` takes back what the previous run added (a value the project changed since stays),
// so what no module needs any more goes. `merge` keeps a value the project set differently:
// it is listed in `kept` and dropped from `add`, so it stays the project's.
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
function merge(target, add, kept = [], at = "") {
  for (const [k, v] of Object.entries(add)) {
    if (Array.isArray(v)) target[k] = [...(target[k] ?? []), ...v.filter((x) => !(target[k] ?? []).some((y) => same(x, y)))];
    else if (isObject(v)) merge((target[k] ??= {}), v, kept, `${at}${k}.`);
    else if (k in target && !same(target[k], v)) {
      kept.push({ key: at + k, project: target[k], harness: v });
      delete add[k];
    } else target[k] = v;
  }
  return target;
}
function unmerge(target, added) {
  for (const [k, v] of Object.entries(added)) {
    if (!(k in target)) continue;
    if (Array.isArray(v)) target[k] = target[k].filter((x) => !v.some((y) => same(x, y)));
    else if (isObject(v)) unmerge(target[k], v);
    else if (same(target[k], v)) delete target[k];
    if (isObject(target[k]) || Array.isArray(target[k])) if (!Object.keys(target[k]).length) delete target[k];
  }
}

// Files: files/<module>/all/ and files/<module>/<framework>/, each written at the same path in the project.
const files = {};
for (const [id] of modules) {
  for (const dir of ["all", frameworkId]) {
    const base = join(root, "files", id, dir);
    if (!existsSync(base)) continue;
    for (const d of readdirSync(base, { recursive: true, withFileTypes: true })) {
      if (d.isFile() && d.name !== ".DS_Store") files[relative(base, join(d.parentPath, d.name))] = join(d.parentPath, d.name);
    }
  }
}
const installs = collect("install");
const paths = [...new Set([...Object.keys(files), ...installs.flatMap((i) => i.creates ?? [])])];

// What the previous run wrote, so what no module needs any more goes too.
// A harness.json from before `merged` lists the scripts, plugins and permissions it set instead.
const previous = {
  paths: [],
  mcp: [],
  merged: {
    "package.json": { scripts: Object.fromEntries((old.scripts ?? []).map((name) => [name, readJson("package.json").scripts?.[name]])) },
    ".claude/settings.json": { enabledPlugins: Object.fromEntries((old.plugins ?? []).map((p) => [p, true])), permissions: old.permissions ?? {} },
  },
  ...old,
};

// Paths no module needs any more are removed, except a file the project has edited.
const basePath = (path) => join(".claude/harness-base", path);
const edited = (path) => existsSync(basePath(path)) && existsSync(path) && readFileSync(path, "utf8") !== readFileSync(basePath(path), "utf8");
// A folder a removed file leaves empty goes too.
const prune = (dir) => {
  for (; dir !== "." && existsSync(dir) && !readdirSync(dir).length; dir = dirname(dir)) rmSync(dir, { recursive: true });
};
const notes = [];
const lock = readJson("skills-lock.json", null);
for (const path of previous.paths) {
  if (paths.includes(path)) continue;
  if (edited(path)) notes.push(`${path}: no module needs it any more, but the project edited it, so it stays`);
  else rmSync(path, { recursive: true, force: true });
  rmSync(basePath(path), { force: true });
  prune(dirname(path));
  prune(dirname(basePath(path)));
  if (lock?.skills && path.startsWith(".claude/skills/")) delete lock.skills[path.slice(".claude/skills/".length)];
}
if (lock) writeJson("skills-lock.json", lock);

// Each file keeps the project's edits: .claude/harness-base/ holds what the harness wrote last,
// and the harness changes since then are merged into the project's version, as git merges branches.
const write = (path, text) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
};
for (const [path, source] of Object.entries(files)) {
  const next = readFileSync(source, "utf8");
  const current = existsSync(path) ? readFileSync(path, "utf8") : next;
  if (current !== next && existsSync(basePath(path))) {
    if (current !== readFileSync(basePath(path), "utf8")) {
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
  } else if (current !== next && !previous.paths.includes(path)) {
    // The project had this file before the harness: leave it for the skill to merge.
    notes.push(`${path}: the project already had it; merge the harness version by hand (saved as ${basePath(path)}.new)`);
    write(`${basePath(path)}.new`, next);
    continue;
  }
  write(path, next);
  write(basePath(path), next);
}

// package.json scripts and .claude/settings.json: the modules' keys are set, the project's own are kept.
const scripts = Object.assign({}, ...modules.map(([, m]) => m.scripts ?? {}));
const merged = {
  "package.json": { scripts: Object.fromEntries(Object.entries(scripts).map(([name, s]) => [name, s.command.replace("{srcDirs}", framework.srcDirs.join(" "))])) },
  ".claude/settings.json": modules.reduce((settings, [, m]) => merge(settings, m.settings ?? {}), {}),
};
for (const [path, add] of Object.entries(merged)) {
  const json = readJson(path, {});
  unmerge(json, previous.merged[path] ?? {});
  const kept = [];
  writeJson(path, merge(json, add, kept));
  for (const k of kept) notes.push(`${path}: the project's ${k.key} stays ${JSON.stringify(k.project)}; the harness one is ${JSON.stringify(k.harness)}`);
}

// .mcp.json: a server whose module went is removed (the installs add them); the project's own are kept.
const mcpNames = collect("mcp");
const mcp = readJson(".mcp.json", { mcpServers: {} });
for (const name of previous.mcp) if (!mcpNames.includes(name)) delete mcp.mcpServers[name];
if (Object.keys(mcp.mcpServers).length) writeJson(".mcp.json", mcp);
else rmSync(".mcp.json", { force: true });

// .claude/harness.json: what the hooks read, and what this run wrote.
const checks = collect("checks").filter((c) => !skip.has(c.name));
const fileChecks = collect("fileChecks").filter((c) => !skip.has(c.name));
writeJson(".claude/harness.json", {
  $comment: "Written by the frontend-harness plugin (tasks/apply.mjs). Do not edit; change the answers with the frontend-harness skill.",
  version,
  framework: frameworkId,
  modules: modules.map(([id]) => id),
  skipChecks: [...skip],
  docsLanguage: answers.docsLanguage,
  port: framework.port,
  checks,
  fileChecks,
  paths,
  merged,
  mcp: mcpNames,
});

// .claude/harness.md: the always-loaded summary CLAUDE.md imports.
const md = [
  "# Harness",
  "",
  "Written by the frontend-harness plugin from `.claude/harness.json`; do not edit by hand.",
  "",
  ...(paths.includes("AGENTS.md") ? ["@../AGENTS.md", ""] : []),
  `Harness modules: ${modules.map(([id]) => id).join(", ")}. Specs and plans are written in ${answers.docsLanguage}.`,
  "",
  "## Commands",
  "",
  "```bash",
  "npm run dev".padEnd(24) + `# http://localhost:${framework.port}`,
  ...Object.entries(scripts).map(([name, s]) => `npm run ${name}`.padEnd(24) + `# ${s.description}`),
  "```",
  "",
].join("\n");
writeFileSync(".claude/harness.md", md);

// Hooks must be executable, and git must use .githooks/ (when a module brings git hooks)
// even before the next npm install; without them, git goes back to the project's own hooks.
// A project whose git hooks live elsewhere (husky) keeps them there.
for (const dir of [".claude/hooks", ".githooks"]) {
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) chmodSync(`${dir}/${f}`, 0o755);
}
try {
  const hooksPath = execSync("git config core.hooksPath || true", { encoding: "utf8" }).trim();
  if (!existsSync(".githooks")) {
    if (hooksPath === ".githooks") execSync("git config --unset core.hooksPath");
  } else if (!hooksPath || hooksPath === ".githooks") execSync("git config core.hooksPath .githooks", { stdio: "ignore" });
  else notes.push(`git runs its hooks from ${hooksPath}, so the harness git hooks in .githooks/ do not run; call them from there`);
} catch {
  // Not a git repo yet; `npm install` runs `prepare` later.
}

console.log(`harness ${version}: ${modules.map(([id]) => id).join(", ")} on ${frameworkId}`);
for (const note of notes) console.log(`harness: ${note}`);

// npm packages last, so every file above is written even when the install fails.
// Install only what the project does not have yet.
const pkg = readJson("package.json");
const have = { ...pkg.dependencies, ...pkg.devDependencies };
const frameworkDeps = modules.flatMap(([, m]) => m.frameworkDevDependencies?.[frameworkId] ?? []);
const missing = [...new Set([...collect("devDependencies"), ...frameworkDeps])].filter((p) => !(p in have));
if (missing.length && !noInstall) {
  try {
    execSync(`npm install --save-dev ${missing.join(" ")}`, { stdio: "inherit" });
  } catch {
    fail(`npm install failed; install these by hand: ${missing.join(" ")}`);
  }
}

// Install commands: each runs when a path it creates is missing (one that creates none, every time).
if (!noInstall) {
  for (const i of installs) {
    if (i.creates?.every((path) => existsSync(path))) continue;
    try {
      execSync(i.command, { stdio: "inherit" });
    } catch {
      fail(`install failed; run by hand: ${i.command}`);
    }
  }
}

#!/usr/bin/env node
// Releases each plugin with commits since its last <plugin>-vX.Y.Z tag: raises the version in its
// plugin.json from the Conventional Commits (breaking: major, or minor below 1.0; feat: minor;
// anything else: patch), adds them to its CHANGELOG.md, commits only those two files and tags it.
// Usage: node scripts/release.mjs [plugin ...]   (no plugin: every plugin with unreleased commits)
// Prints one line per plugin it released.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const plugins = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync("plugins", { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

for (const plugin of plugins) {
  const dir = `plugins/${plugin}`;
  const manifest = `${dir}/.claude-plugin/plugin.json`;
  const current = JSON.parse(readFileSync(manifest, "utf8")).version;
  const tag = `${plugin}-v${current}`;
  if (!git("tag", "--list", tag)) throw new Error(`${plugin}: no tag ${tag} to count commits from; tag the commit that set ${current}`);

  // Commits since the last release that change this plugin: "<hash> <subject>" and whether the body breaks.
  const hashes = git("log", "--format=%h", `${tag}..HEAD`, "--", dir).split("\n").filter(Boolean);
  if (!hashes.length) continue;
  const commits = hashes.map((hash) => {
    const subject = git("log", "-1", "--format=%s", hash);
    const breaking = /^[a-z]+(\([^)]*\))?!:/.test(subject) || /^BREAKING[ -]CHANGE:/m.test(git("log", "-1", "--format=%b", hash));
    const type = subject.match(/^([a-z]+)/)?.[1];
    const text = subject.replace(/^[a-z]+(\([^)]*\))?!?:\s*/, "");
    return { hash, type, breaking, text };
  });

  const [major, minor, patch] = current.split(".").map(Number);
  const breaking = commits.some((c) => c.breaking);
  const next =
    breaking && major > 0 ? `${major + 1}.0.0`
    : breaking || commits.some((c) => c.type === "feat") ? `${major}.${minor + 1}.0`
    : `${major}.${minor}.${patch + 1}`;

  // plugin.json: only the version changes, so the file keeps its layout.
  writeFileSync(manifest, readFileSync(manifest, "utf8").replace(`"version": "${current}"`, `"version": "${next}"`));

  // CHANGELOG.md: the new release on top.
  const group = (title, list) => (list.length ? [`### ${title}`, "", ...list.map((c) => `- ${c.text} (${c.hash})`), ""] : []);
  const section = [
    `## ${next} (${new Date().toISOString().slice(0, 10)})`,
    "",
    ...group("Breaking", commits.filter((c) => c.breaking)),
    ...group("Features", commits.filter((c) => !c.breaking && c.type === "feat")),
    ...group("Fixes", commits.filter((c) => !c.breaking && c.type === "fix")),
    ...group("Other", commits.filter((c) => !c.breaking && c.type !== "feat" && c.type !== "fix")),
  ].join("\n");
  const changelog = `${dir}/CHANGELOG.md`;
  const old = existsSync(changelog) ? readFileSync(changelog, "utf8").replace(/^# Changelog\n\n/, "") : "";
  writeFileSync(changelog, `# Changelog\n\n${section}\n${old}`);

  // Commit only these two files, so nobody else's staged or unstaged work comes along.
  git("add", manifest, changelog);
  git("commit", "-m", `chore(${plugin}): release v${next}`, "--", manifest, changelog);
  git("tag", "-a", `${plugin}-v${next}`, "-m", `${plugin} v${next}`);
  console.log(`${plugin} ${current} -> ${next}`);
}

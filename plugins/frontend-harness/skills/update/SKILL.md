---
name: update
description: Use when the user wants to update the frontend harness in this project to the plugin's current version.
---

# Update the harness

## Get the newest plugin

Skip this when `$HARNESS_TEMPLATE` is set or the plugin runs from a local checkout (`--plugin-dir`: this skill's base directory is not under `~/.claude/plugins/cache/`).

1. Run `claude plugin marketplace update frontend-harness`: the plugin updates only from the marketplace's local copy, which nothing else refreshes.
2. Find the one scope this project runs the plugin from: `local` when `.claude/settings.local.json` enables `frontend-harness@frontend-harness`, else `project` when `.claude/settings.json` does, else `user` when `~/.claude/settings.json` does. Run `claude plugin update frontend-harness@frontend-harness --scope <scope>` for that scope only: another scope serves other projects, whose harness files would then lag behind their plugin. When no settings file enables it, skip this step; never install the plugin here.
3. If it updated, this session still runs the old version's skills. Take the new version's folder (`~/.claude/plugins/cache/frontend-harness/frontend-harness/<new version>/`) as the template, read its `skills/update/SKILL.md` and follow that from "Update the project files", not this file.

## Update the project files

Follow the `setup` skill (`../setup/SKILL.md`, next to this skill's folder) as an **update**:

- Stop if `.claude/harness.json` is missing: the project has no harness yet; offer `/frontend-harness:setup`.
- Keep the installed framework, modules and answers. Do not ask about them again; ask only about modules that are new since the installed `version`, about the ones a renamed or removed module needs (setup's step 1), and about `libraries` sections with no answer yet (setup's step 2).
- Run setup's step 3 with only the answers that change (none, most of the time), then its merge steps and step 4.
- Tell the user the version it went from and to, and what changed in the project. If the plugin was updated, tell them to run `/reload-plugins` (or restart Claude Code) to get its new skills.

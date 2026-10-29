---
name: update
description: Use when the user wants to update the frontend harness in this project to the plugin's current version.
---

# Update the harness

Follow the `setup` skill (`../setup/SKILL.md`, next to this skill's folder) as an **update**:

- Stop if `.claude/harness.json` is missing: the project has no harness yet; offer `/frontend-harness:setup`.
- Keep the installed framework, modules and answers. Do not ask about them again; ask only about modules that are new since the installed `version`, and about the ones a renamed or removed module needs (setup's step 1).
- Run setup's step 3 with only the answers that change (none, most of the time), then its merge steps and step 4.
- Tell the user the version it went from and to, and what changed in the project.

# frontend-harness

A Claude Code marketplace, `frontend-harness`: `.claude-plugin/marketplace.json` lists the plugins in `plugins/<name>/`. A plugin's `README.md` says how to use it; its `CLAUDE.md`, when it has one, how it is built.

## Commits

- Conventional Commits whose scope says what the commit changes: the plugin's folder name for `plugins/<name>/`, `marketplace` for `.claude-plugin/`, `repo` for everything else. A commit that changes several names them all, comma-separated: `feat(frontend-harness,marketplace): ...`.
- Keep one plugin per commit; change two plugins together only when it is one change.
- Mark a change that breaks the projects using a plugin with `!`: `feat(frontend-harness)!: ...`.
- `npm install` turns on the git hooks in `.githooks/`: `commit-msg` checks the message with commitlint (`commitlint.config.mjs`, including that the scope matches the staged files), `pre-commit` runs `plugins/<name>/.githooks/pre-commit` of each changed plugin that has one, then `claude plugin validate` on the marketplace and on each plugin the commit changes, and `pre-push` releases (below).

## Plugins

- New plugin: `plugins/<name>/` with its `.claude-plugin/plugin.json`, and an entry in `marketplace.json` (`name`, `source: ./plugins/<name>`, `description`).
- Releases happen on push; never raise a version or edit a `CHANGELOG.md` by hand. `pre-push` runs `scripts/release.mjs`: each plugin with commits since its last `<plugin>-vX.Y.Z` tag gets a new version in its `plugin.json` (a breaking commit: major, or minor below 1.0; `feat`: minor; anything else: patch), those commits in its `CHANGELOG.md`, a `chore(<plugin>): release vX.Y.Z` commit and a tag. Then it stops the push: push again, and the release commits and tags go with it (`push.followTags`).
- Projects get a plugin's changes only with a new version (`claude plugin update`), so push when a change should reach them.

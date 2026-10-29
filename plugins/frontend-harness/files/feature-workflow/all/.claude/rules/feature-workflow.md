# Feature workflow

- For every user-facing feature, use the `feature-workflow` skill before writing any code.
- Work on `main`; no branches, worktrees or PRs, even when a skill suggests them.
- Ask every question that has ready answer options (including "apply this?" after a proposal) with `AskUserQuestion`, never as plain text at the end of a reply. This holds inside `superpowers:brainstorming` too, even where it says to ask open questions in text; only a question with no sensible options stays in text.
- Never run implementer subagents in parallel: they share one working tree on `main`.

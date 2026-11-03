---
name: audit
description: Use when the user wants to check the project's existing code (often written before the harness) against the rules and best practices of the installed harness modules, see where it breaks them, and choose what to fix.
argument-hint: "[module ...]"
---

# Audit the code

The harness rules are for new code; code written before the harness stays as it was until someone asks. This skill is that ask: it checks the existing code against the modules the user picks, reports what breaks their rules, asks what to fix, and fixes it.

**Template:** `$HARNESS_TEMPLATE` if set, else this plugin's folder: two folders up from this skill's base directory. `<template>/modules.json` gives each module's `audit`: the rule files and skill folders, at their paths in the project, it checks code against. Each path is one **area** (such as `structure.md`); in `.claude/rules/libraries.md` each job section is an area of its own (the `title`s in `<template>/modules/best-practices/libraries/sections.json`, such as "Forms"), and its other sections are read as context.

## Questions

Ask as `../../references/questions.md` (from this skill's base directory) says. Here each question names its area (shortened to fit the header) and each option its finding number and folder.

## 1. Look at the project

1. If `.claude/harness.json` is missing, the project has no harness yet: ask whether to run `/frontend-harness:setup` now or stop.
2. If its `version` is older than the template's, the project may lack the rules this skill checks and follows: ask whether to run `/frontend-harness:update` first or stop.
3. Run `git status --short`. If anything is uncommitted, stop and tell the user: the fixes are committed area by area, and the changes may be another agent's.
4. If `docs/superpowers/specs/` has an audit spec (`*-audit-design.md`) with unticked areas, ask whether to go on with it (step 6) or start a new audit.
5. The modules to offer: those in `.claude/harness.json` `modules` that have an `audit` in the catalog. If there are none, say so and stop.

## 2. Choose modules

Modules named after the command (`$ARGUMENTS`) that are installed and have an `audit` are the ones to audit; name any other as skipped. With no names, ask which modules to audit, a multiple choice: the module id as label, its areas in a few words as description (such as "structure: where files go, nesting, imports"; for libraries "code that does a library's job by hand or with another library", not the list of libraries), in catalog order. With one module, do not ask; say which it is.

## 3. Find the problems

Run one subagent per chosen module, in parallel. Give each:

- The module's `audit` paths. A path missing in the project is skipped and named in the report.
- The whole project to check, but `node_modules`, build output and generated files. The source folders (`frameworks.<framework>.srcDirs` in the catalog) are where app code should live: components, pages or logic outside them are a structure finding (tests, configs and scripts are not). A rule's `paths:` says which kind of files it is about; files of that kind elsewhere (tests named `*.test.ts` or in `__tests__/`) are findings of that rule, not out of scope.
- The task: read each area's rules, check the code against them, and return the findings. A finding is one kind of problem in one area: the area, where (folders, with the number of files), what is wrong (the rule it breaks, in a sentence) and the fix. Group the same problem in many files into one finding. A libraries finding is code that does a section's job other than the section says: with another library or by hand where it names a library, or with a library where it names only the platform. A library comes with conditions ("when a form has many fields"); code where they do not hold is no finding. A fix that needs a library not yet in `package.json` says so ("adds react-hook-form").
- Another way to fix a finding only when a reasonable developer could really pick it: it costs or changes something different (a smaller change, a rule changed instead of the code). Do not make one up to fill a choice.
- Leave out what the checks already catch (the linter, `knip`, `jscpd`, types), and matters of taste.

Then merge across modules: findings about the same code with the same fix become one, under the area fixed first. Where their fixes contradict (a hand-made store from one area, the data library from another), keep the one the rules support best, under its own area, and say in the report which was dropped and why.

## 4. Report

Write the report in chat, in the user's language. Areas go in the order they will be fixed: structure first (its fixes move files the other areas name), the rest in the order of their modules in the catalog and of each module's `audit`, libraries last, in the order of `sections.json`.

```markdown
## Audit: <n> problems in <m> areas

### <area> (<module>): <count>

| # | Where | What is wrong | Fix |
|---|---|---|---|
| 1 | `src/pages/` (12 files) | ... | ... (or: <the other way>, only when there is one) |

Skipped: <paths missing in the project>
```

Every area gets its own table with the header and `|---|` rows; a table without them does not render. Headings, column names and text are in the user's language. Number the findings across the whole report. With no findings, say so and stop.

## 5. Ask what to fix

1. **What:** one question per area, one option per finding (its number and a short label as label, its fix as description, with "adds <library>" when it needs a new one). Areas with one finding each are grouped into one question. Libraries areas come last.
2. **How:** only for a chosen finding with another way, one question: the fix first with "(recommended)", then the other way. Every other finding is fixed the one way the report gives.

Nothing chosen: the report is the result; stop.

Otherwise write the chosen findings as the **audit spec**, `docs/superpowers/specs/YYYY-MM-DD-audit-design.md`: one `- [ ]` line per area in the report's order, under it each chosen finding with where, the fix and the chosen way. Commit it.

## 6. Fix

The fixes keep what the user can do in the app; how it loads and looks may change where a rule asks for it (batches, skeletons, caching). One area at a time, in the order of the audit spec; libraries one library at a time. For each area:

1. **With `feature-workflow`** (it brings superpowers): plan the area with `superpowers:writing-plans`, the audit spec as its spec, against the code as it is now (an earlier area may have moved it); one task per finding, a finding over about 15 files split by folder or route. Write the plan's path on the area's line, then carry it out as `.claude/rules/plan-execution.md` says. **Without it:** make the fixes yourself and commit them.
2. Run `npm run check`. If it fails, say in a line what broke and ask: fix it (recommended), undo the area (`git revert` its commits, newest first; never `git reset`) and go on with the next, or stop here.
3. Tick the area in the audit spec (an undone one with "(undone)" after it) and commit that.

With `e2e`: after the last area, run `npm run verify` once; moved pages can break in ways the types do not catch.

Going on later: start at the first unticked area of the audit spec; a plan already written there goes on from where its execution stopped.

At the end, tell the user in short: what was fixed, the commits, the findings left unfixed, and the installed modules left out of this audit.

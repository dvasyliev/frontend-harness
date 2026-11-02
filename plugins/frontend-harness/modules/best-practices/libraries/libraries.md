---
paths:
  - "src/**"
  - "app/**"
  - "lib/**"
---

# Libraries

When to use what the platform gives and when to reach for a library. The platform here means the browser, CSS, React, the framework and the server runtime.

## How to choose

Go through these in order and stop at the first that fits.

1. **Logic specific to this app** (its data rules, permissions, domain calculations): write it. No library knows it.
2. **The platform solves the whole job:** use it. It adds no dependency and no download.
3. **The platform solves only part of it, and the rest needs workaround code:** use a library.
4. **Generic logic is written, or is about to be written, more than once:** use a library, if the logic is hard to get right (focus, keyboard, positioning, rollback, caching, validation). If the repeat is a few simple lines, a shared helper is enough.

A job from a section below uses that section's choice. For a job not listed, ask the user before adding a library. A library must have a stable release at least two years old (or come from a team with that record), a release in the last six months, wide use, TypeScript types and support for the project's React version.

## Using a library

- When Context7 is not available, read the library's official docs.
- Add a library when the first code needs it.
- These rules are for new code. Do not rewrite old code to match them until the user asks for that specific rewrite. Then do it one library at a time.

<!-- sections -->
## Working on the platform alone

No library for these unless the rules above change:

- Lazy loading and "end of list in view": `IntersectionObserver`.
- Sideways rows: CSS scroll snap.
- A time limit on a request: `AbortSignal.timeout()`.
- Long lists that are slow to draw: `content-visibility: auto`, measured first.

---
paths:
  - "app/**"
  - "lib/**"
---

# Page loading (Next.js)

Caching APIs (`"use cache"`, `cacheLife`, `cacheTag`) follow the Next.js docs bundled in `node_modules/next/dist/docs/`.

## Show the page at once

- Await only what the top of the page needs; every other part streams in behind its own skeleton.
- Shared layouts await nothing. Data they share reaches client components as promises.
- Navigation is instant: the shell and skeletons come from the prefetch, the data streams in after.
- A list's first batch comes with the page; the next batches come from an API route.

## Cache

- Set each cache lifetime by how often that data changes: short for data that changes outside the app, long for data that barely changes. Cache an expensive aggregate as a whole, not only its parts.
- After a write, expire the cache tag of what changed instead of shortening the cache for everyone.

## Measure

Before changing a page, and again before calling the change done:

- Time it twice, signed in: `curl -w "ttfb=%{time_starttransfer} total=%{time_total} size=%{size_download}"`. The first call is cold, the second warm. In dev a code edit can empty the cache, so cold numbers there are rough.
- Check in the browser that the top of the page shows before the slow parts, and that navigation is instant.
- Count what the page sends: items rendered and HTML size. Give the numbers before and after the change in the final message.
- Targets: warm page under 1 s, HTML under ~300 KB, no media requests through an optimizing proxy.

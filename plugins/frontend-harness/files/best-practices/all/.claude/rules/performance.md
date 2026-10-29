---
paths:
  - "src/**"
  - "app/**"
  - "lib/**"
---

# Performance

Every feature and every change to a page keeps these rules and those in `page-loading.md`. Check them while building, and measure as `page-loading.md` says before calling the work done.

General React performance (no request waterfalls, parallel fetching, small props, bundle size, re-renders) follows the `vercel-react-best-practices` skill. These files add only what it leaves out.

## Load lists in batches

A list here is any repeated set of items: a row, a grid, a feed, a table.

- The first batch is about one screen of items. Load the next batch when the end of the list comes into view.
- Data already in memory is still rendered batch by batch. Never render hundreds of items at once.
- The next batches come from an API. A client component never gets the whole collection.
- Fetch the next batch after the last item shown (a cursor), not by offset, so an item that leaves the list does not make another get skipped.
- Filter and sort on the server, in the same order for every batch. Changing a filter starts again from the first batch.
- When the data source answers in fixed pages, use its page as the batch.
- After a write (an item added or removed), the list starts again from the new first batch and drops what it had loaded and hidden.
- Counts and totals come from the server, never from the number of items loaded so far.

## Ask data sources for as little as possible

- Fetch only what is shown: a first page for a preview, the whole set only where all of it is used.
- Do not load data only to discard it. Skip what the caller already knows.

## Media

- When the media host already serves the needed sizes, load from it directly, with the size in the URL, not through an optimizing proxy.
- Only the first screen loads eagerly; the rest stays lazy.

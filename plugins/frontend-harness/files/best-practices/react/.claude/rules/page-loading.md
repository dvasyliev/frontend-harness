---
paths:
  - "src/**"
---

# Page loading (React + Vite)

The app renders in the browser, so a page is as fast as the JavaScript it loads first and its first requests.

## Show the page at once

- Each route is its own chunk (`React.lazy` or the router's lazy routes); a page never waits for another page's code.
- Render the page's frame at once, with a skeleton for each part whose data is still loading; never a blank screen or one spinner for the whole page.
- Start a page's requests together and early (in the route's loader if the router has one, else at the top of the page), not one component after another as they mount.
- Prefetch the code and data of a likely next page (on link hover or when the link comes into view), so navigation is instant.

## Cache

- Keep data already fetched while the user moves between pages; refetch it in the background instead of showing a skeleton again.
- After a write, refetch only what changed, not every list on the page.

## Measure

Before changing a page, and again before calling the change done:

- Run `npm run build` and note the size (gzip) of the JavaScript the page loads first.
- With the `chrome-devtools` MCP server, record a performance trace of the page: when its main content shows (LCP), cold (a fresh load) and warm (navigating from another page), and the requests made before it.
- Count the items rendered. Give the numbers before and after the change in the final message.
- Targets: main content under 1 s warm, JavaScript loaded first under ~200 KB gzip, no media requests through an optimizing proxy.

# Structure

Where a new or moved file goes in a Next.js App Router project. Follow these rules for new and moved files; do not move existing files unless asked.

## Next.js docs

Next.js ships its docs in `node_modules/next/dist/docs/01-app/`; with an older version that has none, use nextjs.org/docs. They explain how folders and special files work; this rule only says which of their options this project uses. Read the section named below before doing what it covers. Find a file by name and a section by its heading, because paths carry number prefixes.

Sections of `project-structure`:

- Where project files go: "Split project files by feature or route". The shared `lib/` stays at the project root.
- Files inside a route: "Colocation" and "Private folders".
- A special file: "Routing Files" and "Component hierarchy", then the file with its name in the `file-conventions` folder (`global-error` is in `error`, `global-not-found` in `not-found`). The app always has `not-found`, `error` and `global-error` at the root, in its own language; below a layout that must stay on screen, add `error` and `not-found` too.
- Grouping routes: "Route groups", then `route-groups`. Add a group only when some routes need their own layout or skeleton ("Opting specific segments into a layout", "Opting for loading skeletons on a specific route"), and keep one root layout.
- A slot, or a modal with its own address: "Parallel and Intercepted Routes", then `parallel-routes` and `intercepting-routes`.
- Icons, share images, robots and sitemaps: "Metadata file conventions".

## Where a file goes

Decide by who imports it. A route's subroutes count as that route, except for `/`: its own files go in a `home` topic of `app/components/`.

- **One route uses it:** keep it in that route, next to its `page.tsx`: components in a `_components` folder, other code (helpers, server actions) in a `_lib` folder, even for one file. Besides these two, a route folder holds only special files, subroutes, `@slot` and `(group)` folders, and tests. Do not extract code before a second user appears.
- **Two or more routes use it:** move it in the same change: components to a topic subfolder of `app/components/`, other code to `lib/`. Generic pieces with no app data (buttons, dialogs, carousels, skeletons) go in the `ui` topic. Test: it would work unchanged in an app about something else.
- **Data fetching, external APIs and shared types** go in the root `lib/`, even for one route, split into topic subfolders once it grows. A hook or `fetch` that calls the app's own API routes from the browser is part of the components that use it and goes where they go.

Before adding a component, search the shared folder for one that already does it.

## Folders

- **Files that belong together** (one component and its parts, or 3+ files on one topic) go in a subfolder named after them. Apart from a route's `_components` and `_lib` and the topics of `app/components/`, do not create a folder for a single file.
- At most 3–4 levels of nested folders. Route segments (`app/<route>/[id]`) do not count, since the URL sets them.
- Next.js still reads special file names in a folder without the `_` prefix, such as `app/components/`: never name a file there after a convention in "Routing Files" or "Metadata file conventions" (`page.tsx`, `error.tsx`, `icon.tsx`).

## Tests and imports

- A test sits next to its file and moves with it.
- Import shared code through the project's path alias (such as `@/`); use `./` only for the same folder or a folder inside it.

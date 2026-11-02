# Structure

Where a new or moved file goes in a Next.js App Router project. Follow these rules for new and moved files; do not move existing files unless asked.

## Next.js docs

What each folder and special file does is in the docs the installed Next.js ships in `node_modules/next/dist/docs/01-app/`, when it ships them. Read the matching one before adding a special file, a route group or any other routing folder; the rules below only say what this project picks from them. Search by name, since the paths carry number prefixes.

- Folders, files and ways to organize a project: `project-structure`.
- Route groups and the `src` folder: `route-groups`, `src-folder`.
- One special file or routing pattern: the file with its name in the `file-conventions` folder.

## Where a file goes

Decide by who imports it.

- **One route uses it:** put it in that route, next to its `page.tsx`: components in a `components` folder, other code in a `lib` folder, even for one file, without the `_` prefix. Besides these, a route folder holds only Next.js special files and subroutes. This is the default; do not extract code before a second user appears.
- **Two or more routes use it:** move it to `app/components/` in the same change, inside a topic subfolder named after what it is about.
- **Generic pieces with no app data** (buttons, dialogs, carousels, skeletons) go in the `ui` topic. Test: it would work unchanged in an app about something else.
- **Data fetching, external APIs, server-only logic and shared types** go in `lib/`, split into topic subfolders once it grows.

Before adding a component, search the shared folder for one that already does it.

## Folders

- **Files that belong together** (one component and its parts, or 3+ files on one topic) go in a subfolder named after them. Apart from a route's `components` and `lib`, do not create a folder for a single file.
- At most 3–4 levels of nested folders. Route segments (`app/<route>/[id]`) do not count, since the URL sets them.

## Tests and imports

- A test sits next to its file and moves with it.
- Import shared code through the project's path alias (such as `@/`); use `./` only for the same folder or a folder inside it.

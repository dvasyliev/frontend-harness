# Structure

Where a new or moved file goes in a React + Vite project. Follow these rules for new and moved files; do not move existing files unless asked.

## Where a file goes

Decide by who imports it.

- **One page uses it:** put it in that page's folder. This is the default; do not extract code before a second user appears.
- **Two or more pages use it:** move it to `src/components/` in the same change, inside a topic subfolder named after what it is about.
- **Generic pieces with no app data** (buttons, dialogs, carousels, skeletons) go in the `ui` topic. Test: it would work unchanged in an app about something else.
- **Data fetching, external APIs and shared types** go in `src/lib/`, split into topic subfolders once it grows.

Before adding a component, search the shared folder for one that already does it.

## Folders

- **Files that belong together** (one component and its parts, or 3+ files on one topic) go in a subfolder named after them. Do not create a folder for a single file.
- At most 3–4 levels of nested folders.

## Tests and imports

- A test sits next to its file and moves with it.
- Import shared code through the project's path alias (such as `@/`); use `./` only inside the same folder.

# Changelog

## 0.38.2 (2026-11-04)

### Fixes

- keep expectAccessible from failing knip before a spec uses it (77d69cf)

## 0.38.1 (2026-11-04)

### Other

- describe both ways to update the plugin (39ef43f)

## 0.38.0 (2026-11-04)

### Features

- fetch the newest plugin before updating a project (4d5aa1a)

## 0.37.3 (2026-11-04)

### Fixes

- fix harness files in the template first during an audit (3816956)

## 0.37.2 (2026-11-03)

### Fixes

- skip popup focus guards in the e2e accessibility check (aa5a933)

## 0.37.1 (2026-11-03)

### Fixes

- keep only hooks and inline API calls with their components (1a78d66)

## 0.37.0 (2026-11-03)

### Features

- check open menus and dialogs with expectAccessible in e2e tests (375791a)

### Fixes

- load the unit test rule only for unit tests (e1a2640)
- forbid ../ imports in Next.js e2e tests too (666449e)

## 0.36.1 (2026-11-03)

### Fixes

- ask about each module on its own in the audit (2fb1033)

## 0.36.0 (2026-11-03)

### Features

- add audit skill for code written before the harness (fdf8dcf)

### Fixes

- run playwright-cli from the project, never globally (26588f5)

## 0.35.1 (2026-11-03)

### Fixes

- give every agent a browser of its own (13e56bc)

## 0.35.0 (2026-11-03)

### Features

- turn on typed links in Next.js projects (106f1f1)

## 0.34.2 (2026-11-03)

### Fixes

- point the changelog at the commits in this repo (b5656fc)

## 0.34.1 (2026-11-03)

### Other

- match the plugin description to the README (2ef74fa)

## 0.34.0 (2026-11-03)

### Features

- let Next.js projects use server-only (4179ccd)

### Other

- install from the public frontend-harness marketplace (3c74012)

## 0.33.0 (2026-11-03)

### Features

- require the root error and not-found pages (c5c9a35)
- use private folders in routes and cover route groups (31d0e61)
- name the Next.js docs sections in the structure rule (86467aa)
- point the Next.js structure rule at the bundled docs (7d53dac)
- check every page with axe in the e2e fixture (7626cb6)

### Fixes

- treat each folder in a route group as a route (8957aa2)
- cover saves, a sleeping Mac and improve-harness (4046e7d)
- let a write show at once in the data-loading rule (dd2e17b)

## 0.32.0 (2026-11-02)

### Features

- settle libraries in one question, add a libraries skill (8b2e75e)
- ask which library each job uses (4da65b8)

### Fixes

- shorten the libraries question (c2ab725)
- recommend Base UI toasts when components use it (b2c593a)

## 0.31.0 (2026-10-29)

### Features

- wait for React before each end-to-end click, keep failure traces (b9a381e)

## 0.30.0 (2026-10-29)

### Features

- give each project its own dev server port (ec0b8a9)

## 0.29.3 (2026-10-29)

### Fixes

- keep a file waiting to be merged on a second run (0ed2d2c)
- keep knip out of .claude (d699305)

## 0.29.2 (2026-10-29)

### Other

- releases happen on push (ffad77a)
- tag releases as frontend-harness-vX.Y.Z (d02d27c)


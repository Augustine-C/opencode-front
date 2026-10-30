# OpenCode v2.2.0 GUI plugin migration

This document records the released snapshot. The subsequent [native GUI plugin adaptation](native-gui-plugins.md) replaces its renderer-only desktop limitation.

Pinned upstream: `1097e2668b1e08ad63bdf0b1c4860b9bc01e420c` (`v2.2.0`). Root version: `2.2.0+0`; release mapping: `2.2.0.0`. Project, CI and release runtime: Bun 1.4.4.

## Result

Replaced the port's custom browser plugin SDK, host, JSONC importer, ZIP loader, slot mounts and panel compatibility bridge with upstream's official GUI plugin runtime. Removed their obsolete examples and tests. CodeArts Proxy declares through `Plugin.define` and registers with official `compose`, then uses official settings, commands, menus, styles and panel contributions. Its old native preference store and previous browser options migrate through upstream builtin storage helpers; legacy panel ids remain mapped. No saved configuration is deleted and gateway keys stay in memory.

Imported `gui-plugins` in place of `gui-extensions`, the GUI-only `plugin` SDK plus its RPC re-export, and `patchmark` for session rendering. Backend, TUI, CLI and managed desktop implementations remain excluded. Matched dependency catalogs and replaced the old Pierre trees patch with upstream's beta.6 patch. The plugin package manifest is a declared frontend-only overlay.

Preserved existing-service attachment, build information, project tab grouping and floating search/history navigation. Upstream now owns server project identities and migration from old directory records; the old directory inventory adapter is removed. The project test now checks the real official registry's migration, server isolation, hide and reuse behavior. New upstream panes, tabs, voice and GUI features retain upstream contracts.

The thin shell does not supply the upstream desktop main-process bridge for external `./gui-experimental` installation. Bundled renderer plugins work in both web and desktop; no external installer or main-process plugin support is claimed. Old browser manifests are incompatible and no second plugin runtime is retained.

## Validation

- `bun install --linker=hoisted`, followed by `bun install --frozen-lockfile --linker=hoisted`: repeat install reports no changes.
- Exact-commit `upstream:record` and audit: 3,423 pristine files, 39 declared overlays, no errors. Final plan has no changes, collisions or missing roots.
- `bun run check`: all type checks and 32 tests / 157 assertions pass.
- `bun run build`: production/PWA build passes. Existing CSS highlight, chunk-size and shared dynamic import warnings remain.
- `node scripts/desktop-stage.cjs 2.2.0.0`: version staging passes without launching a desktop app.
- Production Chromium connection keeper: invalid credentials, cancellation, timeout, mixed content and pairing recovery pass; real official CodeArts settings render, old native preferences migrate, editing/enabling persists across reload, and the previous settings route is absent. Zero page errors.
- Fixture Chromium grouping, history and version keepers pass, including filtering/IME/keyboard, folded group state, clicked project/instance/worktree creation, paginated search cancellation and safe version links. Zero page errors.

The removed custom runtime's tests are superseded by the official upstream host and its own test suite; they are not retained as false coverage of the new host. The port tests retain CodeArts legacy preference parsing, gateway request authentication/validation and owner disposal, tab grouping, history navigation and frontend import boundaries. The connection keeper exercises actual host activation and preference migration in the production renderer.

## Performance and limits

See `upstream-v2.2.0-benchmarks.json` for raw samples. The session-tab reducer workload (20,000 preview/open/close cycles) changed from 3.754 ms to 5.345 ms median in this run. Upstream added pane placement and selection logic; this is about 1.6 ms more for the complete synthetic workload. No port-owned work was added to timeline rows. Group-popup medians after migration are 32.5 / 32.5 / 32.3 ms at 20 / 100 / 500 sessions; history first-match median is 25.85 ms. The browser fixtures use simulated data and are not live transcript, provider, native IPC or desktop performance evidence.

No backend, gateway or running app was started, stopped, upgraded or restarted. Browser tests use synthetic service responses and credentials. Native platform builds are verified by release CI, not by local staging. The primary checkout and its pre-existing bun.lock change remain untouched.

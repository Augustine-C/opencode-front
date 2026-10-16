# OpenCode v2.0.31 sync

The frontend follows upstream Git tag **v2.0.31**, commit `22728d67461260d56bb9796b9b8f36e1de47202e`, checked against all upstream V2 tags on 2026-10-17. The tag page dates it to October 16. The previous baseline was v2.0.29. This source sync is included in OpenCode Front [2.0.31.0](releases/2.0.31.0.md). The root/Electron package version is `2.0.31+0`.

## Imported changes

The read-only plan selected 3,264 files, with 63 changed, five added and one removed relative to the old inventory. It found no target collisions or missing import roots. The frontend drawer patch adds one more selected file, bringing the final inventory to **3,265 files**: 3,217 pristine imports and 48 declared overlays.

The imported changes include:

- Optional changed-file summaries and expandable diffs after completed turns, controlled by Settings → Preferences → Timeline → Changed files, off by default.
- Previous/next session navigation with Alt/Option+Up/Down and unread-session navigation with Shift added.
- Voice delegation presentation, missing-project-folder feedback, settings-page error containment, attachment drop handling, and side-panel layout/animation fixes.
- File-tree styling, artifact media display, animated counts and dialog behavior fixes.
- Matching client/protocol/schema contracts, including provider configuration migration metadata and configuration-schema generation sources.

Eleven changed overlays were reviewed and merged: three package manifests, the English dictionary, side-region/session layout mounts, settings model/general UI, and both tab components. The port retains its frontend-only scripts, browser plugin configuration forms, session navigation, panel slots and project grouping. Shortcut traversal uses the displayed grouped order, including folded groups, as existing tab cycling does. The tab-order keeper now checks unread filtering, both wrap directions, and no-match behavior.

Dependency catalog versions did not change. The frontend patch policy now includes upstream's `@corvu/drawer@0.2.4` patch, preventing a close requested before the opening frame from leaving the drawer stuck. Backend/core/CLI, managed desktop implementations and the unrelated MCP client patch remain outside this port's import scope. Imported GUI main-process files remain dormant.

## Validation

- `bun run upstream:record` and `bun run check` passed: boundary audit, type checks, **90 tests / 519 assertions**.
- `bun run build` passed and generated production/PWA assets. Existing stylesheet, dynamic-import and bundler warnings remain.
- `bun install` passed. `bun install --frozen-lockfile` still fails on Bun 1.3.14's repeated resolution of the patched Ghostty Git dependency, a previously recorded limitation; the client build workflow already uses non-frozen installation. No dependency version was changed to work around it.
- Production Chromium keepers passed for connection validation, credential correction, timeout/cancel behavior, mixed-content feedback, pairing recovery, plugin JSONC preview/cancel/import, grouped-session browsing/filtering/IME/responsive layout and paginated history search. No page errors were reported. Keeper scripts now identify the JSONC input separately from the ZIP installer and wait for asynchronous focus restoration and connection persistence.
- `git diff --check` passed.

Before session edits, production adapter bundles and the production tab reducers were measured. The same workloads were repeated after importing. Navigation opening stayed around 32 ms at 20/100/500 cached sessions; history first-match medians were 25.60 ms before and 25.65 ms after, including two animation frames. Reducer medians were 6.43 ms and 7.15 ms for 20,000 cycles, with checksum 720000 in every sample. The reducer source is unchanged. These samples are subject to browser scheduling and do not establish a performance improvement or regression. [Raw measurements](plans/measurements/upstream-2.0.31.json) include all samples and scope limits.

Browser checks used disposable profiles, static frontend previews and simulated HTTP responses. Real connected-session transcript rendering, new turn-diff requests against an older backend, packaged macOS/Windows execution and physical mobile devices remain unverified. No existing backend or running user application was started, stopped, upgraded or restarted.

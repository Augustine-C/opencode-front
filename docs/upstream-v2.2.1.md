# OpenCode v2.2.1 sync

This document records the released snapshot. The subsequent [native GUI plugin adaptation](native-gui-plugins.md) replaces its renderer-only desktop limitation.

Upstream `v2.2.1`, exact commit `3ebcf9a32c7b28f658cfee80775448929361727a`. Port version `2.2.1+0`, release `2.2.1.0`. Bun remains exactly 1.4.4 for project, CI and release jobs.

## Changes

Sync the default model picker and integrations dialog, experimental long-message folding, quote highlighting, background-shell output pills, `/reload`, goal UI, media handling and experimental client API grouping. Include upstream fixes for plugin server event streams, desktop zoom boundaries and side-panel close performance. Backend capabilities still depend on the already connected service; the frontend does not install or upgrade it.

The initial import plan contained 139 changed, 19 added and 4 removed files. Update frontend patch selection to Solid 1.9.17 and Vite 8.2.4 and use their exact upstream patches. Final scope: 3,479 files, including 3,440 pristine imports and 39 declared overlays. The final exact-commit plan has no changes, collisions or missing roots.

Merge the session screen/search overlays with quote highlights, folded-message search expansion and stable panel-close geometry. Preserve port history navigation, project tab grouping, service attachment and English/localized custom strings. CodeArts Proxy and its official GUI registration are unchanged. Retain the frontend-only plugin package overlay rather than restoring backend/TUI dependencies.

## Validation

All commands use Bun 1.4.4:

- `bun install --linker=hoisted` passes; repeat `bun install --frozen-lockfile --linker=hoisted` reports no changes.
- `bun run upstream:record --source ../opencode --ref 3ebcf9a32c7b28f658cfee80775448929361727a` and boundary audit pass.
- `bun run check` passes every type check and 32 tests / 157 assertions.
- `bun run build` produces production/PWA assets. Existing highlight CSS, chunk-size and shared dynamic import warnings remain nonfatal. Installation reports upstream KaTeX 0.18.11's deprecation notice; this sync retains the selected upstream dependency.
- `node scripts/desktop-stage.cjs 2.2.1.0` confirms SemVer/four-part release mapping. The CodeArts source ZIP passes archive integrity checks; its packaging matches the release workflow.
- Production Chromium connection keeper passes credentials, cancellation, timeout, mixed content and pairing recovery; actual CodeArts settings, native-store migration and persistence across reload pass.
- Production fixture Chromium group, history and version keepers pass folded status, filtering/IME/keyboard, clicked project/instance/worktree creation, paginated history search cancellation/retry and version links. All browser keepers report zero page errors.

## Performance and limits

Before/after runs use the same production fixture, Bun runtime and Chromium executable. Group-popup medians at 20/100/500 sessions: 32.30/32.60/31.80 ms before and 32.60/32.50/32.70 ms after. History first-match median: 25.95 to 25.90 ms. Session-tab reducer median: 5.194 to 5.227 ms for 20,000 preview/open/close cycles. Small frame/scheduling differences do not establish a meaningful regression. Raw samples are in `upstream-v2.2.1-benchmarks.json`.

Browser tests use synthetic service responses, credentials and transcript data. Live-service v2.2.1 features, full provider sessions and external native IPC remain unverified locally. The thin shell still runs bundled renderer plugins and does not implement upstream's external GUI-installation bridge. Native macOS/Windows archives are verified by release CI. No backend, gateway or running user app was started, stopped, upgraded or restarted. The primary checkout's existing bun.lock remains untouched.

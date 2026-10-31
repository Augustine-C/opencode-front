# OpenCode v2.2.5 sync

Upstream v2.2.5 at `9bbb8ce18c80f099e0e448775f59d965ead40a21`; port `2.2.5+0`, release `2.2.5.0`. Bun remains exactly 1.4.4 in local validation, PR/platform checks and release setup through package.json.

Import 251 changed, 10 added and 3 removed files across the retained frontend/GUI/native host scope. Keep upstream persistent PTYs, quote-send actions, HTTP-safe UUIDs, model/provider setup improvements, worktree shortcuts, notification preferences, timeline/layout and scrolling fixes. Preserve existing-service attachment, project grouping/history navigation, CodeArts, and the official main/renderer plugin host.

## Conflict resolution

Follow the user's upstream-first preference: retain the complete upstream About version-copy interaction, tooltip, clipboard fallback, error toast and timer cleanup. Keep independent frontend/upstream/service provenance below that upstream version line. A production browser keeper verifies the clipboard content, Copied tooltip and port version section together.

The plugin manifest conflict is an upstream change to previously excluded TUI peers (0.7.0 to >=0.8.0), not newly required GUI dependencies. Preserve the deliberate GUI/RPC-only import boundary and its existing GUI peer constraints. The upstream root catalog still receives its 0.8.0 pins and Solid Start update. Do not import theme/TUI workspaces or backend implementations to satisfy unused peer declarations.

All other overlay merges are clean. Upstream native embeds now listen to display changes; extend the test-only Electron screen double with EventEmitter so the production native host keeper exercises that implementation unchanged.

## Validation

Bun 1.4.4; Node 24.22.0; production Chrome fixtures. Exact-commit inventory record: 3,480 pristine imports, 45 overlays, zero errors. Full `bun run check` passes all typechecks, 74 tests / 283 assertions, and native main-host IPC/storage/lifecycle/service-isolation/embeds checks. `bun run build`, repeated frozen hoisted install (no changes), desktop staging for 2.2.5.0 and official CodeArts source packaging pass.

Production browser connection/CodeArts, project groups, history, version provenance, About clipboard and official GUI plugin keepers pass with no page errors. GUI keeper covers native calls/state, disable persistence, revision changes, unchanged-revision input retention, service/storage isolation, removal and web isolation.

Group popup medians at 20/100/500 sessions: 32.40/32.50/31.80 ms before, 32.00/32.40/32.70 ms after. History first-match median: 25.85 to 26.55 ms. These small differences are within frame/scheduling noise; raw results in upstream-v2.2.5-benchmarks.json. These are synthetic fixtures, not live-provider or full-transcript evidence. Native Electron window compositing, real plugins/provider sessions and SSH/WSL are not established by browser doubles; archived native macOS validation runs in CI.

No user backend/application lifecycle or authentication changes. Preserve the primary checkout's unrelated bun.lock. Upstream's GUI-package AGENTS mentions lint:changed, but that script and root lint infrastructure are outside this frontend port; the available required boundary/type/test/build checks above were run without changing pristine source to silence upstream lint.

# OpenCode v2.2.2 sync

Upstream `v2.2.2`, exact commit `098aa7fd6e02b03d6fc410f0b052038c7d4c5e81`. Initial sync: port version `2.2.2+0`, release `2.2.2.0`. Follow-up `2.2.2+1` / `2.2.2.1` also derives the SSH/WSL CLI target from this provenance rather than the old 2.2.1 literal; the independent main-plugin IPC keeper verifies that contract. Bun remains exactly 1.4.4 for local checks, CI and publication. Effect and the CodeArts peer requirement move to the upstream 4.0.6 pin.

## Changes

Import unified quote comments and browser annotations, optional quote comments anchored beside their source, the opt-in keyboard-first question dock, redesigned todo/composer pills, Go usage-limit reset details, side-panel tab menus and visible close buttons, Markdown heading links, inbox ordering and searchable-dialog refinements. Preserve upstream cached-timeline ownership, per-session plugin links/actions and directory-switch retention.

The initial import plan contains 242 changed and 13 added files, with no removals, collisions or missing roots. Seven declared overlays are reviewed; the only three-way conflict is the session-screen cached timeline. Retain upstream PluginLinks and per-session actions while mounting SessionNavigationActions inside the active timeline. Preserve project groups, history/search navigation, service attachment, CodeArts and the complete official native main/renderer host released in 2.2.1.1. No parallel plugin loader is introduced. Final inventory: 3,518 files, including 3,473 pristine imports and 45 declared overlays. The final exact-commit plan is empty.

## Validation

All project commands use Bun 1.4.4, with Node 24.22.0 for native/browser keepers.

- Boundary audit, every type check, 74 tests / 283 assertions, and the production main-host keeper pass. The latter covers raw schema-checked IPC, calls/events, cancellation, SQLite persistence, revision changes, removal, enable persistence, service isolation/stale replies, and embed ownership/cleanup.
- Production frontend/native build and desktop staging pass; package metadata maps to release 2.2.2.0. Repeat frozen hoisted install reports no changes.
- Production Chromium official GUI keeper passes native calls/state, settings, enable persistence, unchanged-revision input retention, changed revisions, service/storage switching, removal and web isolation, with no page errors.
- Connection/CodeArts keeper passes configuration, native-store migration and reload persistence. Group/history/version keepers pass filtering, keyboard/IME, creation ownership, cancellation/retry and provenance links, with no page errors.
- Before/after production fixture medians at 20/100/500 sessions: 32.50/32.50/32.10 ms to 32.40/32.80/31.80 ms. History first-match median: 25.95 to 26.10 ms. Small differences are within the browser frame/scheduling floor; these measurements do not establish full-transcript performance. Raw reports are in upstream-v2.2.2-benchmarks.json.

Browser services and transcript data are synthetic. Real provider sessions, vendor plugin installation, native embed compositing, OS dialogs/permissions and live SSH/WSL remain outside this evidence. Actual archived macOS preload/plugin execution is checked by the existing CI keeper on each PR/tag. No user backend or local desktop application is launched or restarted; unrelated primary-checkout bun.lock is preserved.

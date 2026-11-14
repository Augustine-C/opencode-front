# OpenCode v2.3.0 sync

Upstream v2.3.0 at `a6b15d33daf6ab7d35569f6d711fdb630b9f04e7`; port version `2.3.0+0`. Bun remains 1.4.4. Release tag: `2.3.0.0`.

Imported the selected frontend, shared UI, client/protocol/schema, official GUI SDK, built-in plugins and desktop host sources. The import plan has no collisions or missing roots. Preserved existing-service attachment, CodeArts Proxy, version information, Effect 4.1 record compatibility and the compact project sidebars.

Rebased project tab grouping onto the upstream section-aware tab renderer. Native customized sections retain their headers, footers, row labels and avatar policy; port project grouping retains its single/sidebar-layered modes, collapse state, group ordering and native row owners. Layered mode takes precedence over the upstream sidebar organization setting. Kept the 38px toolbar, independently persisted project/session widths and native-frame collapse/reopen controls.

Updated package versions, matching catalog dependencies (including strobe 0.34.0), the MCP client patch, lockfile and source attribution. The GUI-only plugin package still omits the unimported theme/TUI peers.

The existing history keeper exposed an earlier missing ownership guard: changing instances while keeping the same session id left Find open with stale state. The production search controller now closes through its existing state machine on the session ownership key changing, cancelling pending reveals; the production screen passes that key. The same keeper fails before this fix and passes afterward.

## Validation

- `bun run check`: upstream boundary audit, app/CodeArts/tooling/desktop type checks, 76 tests with 298 assertions, and native plugin lifecycle/IPC/SQLite/cancellation/embed integration checks pass.
- `bun run build`: production/PWA and desktop bundles pass; inherited CSS and chunk/import warnings remain.
- Upstream inventory: 3,799 pristine files and 81 declared overlays; no audit errors.
- Production browser keepers: grouped navigation, single/layered sidebars, project layout preference persistence and native-frame layout pass. Coverage includes project/session icon ownership, title alignment without an empty avatar gutter, column resizing/persistence, instance scoping, compact mode and collapse/reopen.
- History keeper: loaded/paginated search, stable match identity, cancellation, failure/retry, same-id cross-instance switch and focus restoration pass.
- Reviewed the layered screenshot; project and session header/title insets align. Browser desktop verification uses the real host bridge fixture and simulated HTTP data, not a physical Windows/macOS window or a live service.

Strobe timeline benchmarking was attempted before and after import but cannot start because this frontend-only checkout excludes `packages/app/e2e/utils/mock-server`. No timeline performance improvement is claimed. `git diff --check` is clean outside the pristine upstream MCP patch, whose context lines retain upstream space/tab indentation.

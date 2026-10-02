# Validation

Validated locally on 2026-10-01 with Bun 1.3.14 on macOS.

- `bun run check`: application and plugin SDK type checks passed; 12 focused tests passed (42 assertions).
- `bun run build`: production Vite build and inherited PWA generation passed. Upstream CSS `::highlight` optimization warnings, large chunks, and existing mixed static/dynamic import warnings remain.
- Browser production preview: connection screen and plugin manager rendered; importing `examples/plugins.jsonc` enabled both installed plugins without an endpoint request. See `screenshots/plugin-manager.jpg`.
- Desktop shell: launched and rendered the production connection screen at `oc://renderer/`. This verifies the thin desktop runtime, not a signed installer or native SSH/browser tooling.
- Development server: startup passed with the final installed dependencies. An additional browser preview was declined; the production UI import test above provides the UI verification.
- `opencode service status` reported `stopped`. No backend was started or restarted. Live authenticated sessions, model execution, remote TLS/CORS configurations, permission flows, PTY streams, and provider-specific status endpoints therefore remain unverified against a running service in this task.
- Original `opencode-dev/opencode_v2` checkout remained clean. Shared protocol/client schemas and production timeline implementation were copied unchanged. Only external session extension slots and panel mounting were added to the session screen and summary.

The tests exercise cleanup of slots/commands/listeners, failed setup rollback, interrupted async setup, plugin reload options, JSONC parsing, configuration aliases and namespace directives, slot takeover/degradation, panel ownership, persistence namespaces, and host-disposal cancellation. They do not replace live backend integration or production session performance measurements.

Project inventory discovery was also validated on 2026-10-01: `bun run check` passed 17 tests (55 assertions), and `bun run build` passed with the existing upstream warnings. The added tests cover first-entry inventory, saved order and expansion, duplicate paths, reactive updates after closing a project, restored closed preferences, and independent local/remote inventories. Live GUI verification of this change remains unperformed because browser access to the local preview was denied earlier in this session.

Optional project tab grouping passed `bun run check` (22 tests, 72 assertions) and `bun run build` on 2026-10-01. Added coverage checks stable grouped ordering, separate servers, draft/restored directory resolution, worktrees, nested repositories, global projects, Windows paths, keyboard adjacency, and reordering with hidden tabs. The production styles provide distinct vertical/horizontal presentations. Live visual and drag interaction checks remain unperformed because the local browser preview was denied earlier.

Upstream attribution and MIT alignment were verified against the local OpenCode v2 snapshot on 2026-10-01. Root and UI licenses match upstream byte-for-byte; all workspace manifests declare MIT. `bun run check` passed (22 tests), `bun run build` passed, and the generated `dist/LICENSE` and `dist/NOTICE` match the source notices exactly.

Plugin controls were integrated into root client settings on 2026-10-01. `bun run check` passed 24 tests (78 assertions), including restoring the frontend plugin settings URL for single/multiple servers and rejecting server/project-scoped variants. `bun run build` passed with the existing upstream warnings. The command palette uses the settings page while the shell is mounted and falls back to the styled dialog before connection. Live visual, file-picker, and settings-navigation checks remain unperformed because the local browser preview was denied earlier.

The opt-in `panel-demo` example passed application/SDK type checks, the existing 24 tests, and the production build on 2026-10-01. It is registered in the frontend catalog and demonstrates command/launcher entry points, configurable panel title/presentation, interactive sample state, and responsive full-screen layout. These checks do not verify its rendered appearance or live interactions; local browser preview access was denied earlier.

## Native plugin panel tabs (2026-10-01)

Plugin panels now use the existing session side-pane tab strip alongside Review, Context, and files; narrow screens use the session view navigation. Maximizing a plugin expands the workspace pane while preserving the native tabs. Panel rendering is scoped to its owning plugin.

`bun run check` passed application/SDK type checks and 26 tests with 102 assertions. New integration tests exercise the actual plugin host, reactive tab bridge, session tab reducers, and tab derivation: opening/reopening, native close and SDK close, preserving file previews, owner/session isolation, targeted maximize, disabling owners, and removing stale restored tabs. `bun run build` completed successfully.

Before session edits, `packages/app/performance/session-tabs.ts` was bundled with browser resolution and production conditions, then the frozen baseline artifact ran seven samples of 20,000 tab changes/readbacks. The baseline median was 18.205792 ms; the candidate median was 19.013916 ms (about 4.4% or 0.81 ms more per 20,000 operations). All samples retained checksum 592000. This benchmark covers production tab derivation, not browser rendering, transcript performance, or live backend integration. Bun emitted a tsconfig directory warning while bundling both artifacts, but both bundles completed and executed successfully.

Rendered appearance and live browser interactions remain unverified: local browser preview access was denied earlier. No app/server restart or backend mutation was performed.

## Integrated panel entry points (2026-10-01)

The example no longer renders a prompt-footer launcher or an expand button in its content. Its registered panel appears in the existing desktop Add tab menu and mobile More menu. The session pane toolbar owns the maximize/restore icon. `showLauncher: false` now hides the native menu entry while retaining the command-palette action.

`bun run check` passed application/SDK type checks and 29 tests with 129 assertions; `bun run build` passed. New coverage checks menu registration without opening a panel, reopening a closed tab, owner isolation, duplicate/failed setup rollback, reload/disable/disposal cleanup, and stale generation callbacks and cleanup handles. The production tab benchmark recorded before these session edits measured a median 18.744291 ms versus 18.935583 ms after (20,000 operations; checksum 592000 in every sample). This measures tab derivation only; the menu/toolbar rendering changes are not timed. Live visual appearance and menu interactions remain unverified because browser preview access was denied earlier. No app or server was restarted.

## Import policy and extension adapters (2026-10-03)

The pinned import inventory contains 2,471 targets: 2,423 pristine upstream files and 48 declared overlay files. The source commit remains `84c9be93a56304a108f1a22df0c5d62c26d5b6ca`; no upstream version upgrade was performed. `upstream:check` audits source identities and declared local namespaces and is now included in the root check. The read-only plan against the pinned source produced no changes, collisions, or missing roots. Recording against that exact source succeeded after checking the port against the candidate inventory.

Session panel state/rendering, project group presentation and CSS, grouped status indicators, and project discovery now have explicit port-owned adapter modules. The original titlebar tab CSS matches upstream again. Existing session tab/review geometry, keyboard navigation, drag machinery, and transcript rendering remain with their original owners.

`bun run check` passed application, SDK, and maintenance-tool type checks and 35 tests with 154 assertions. Added coverage exercises import selection/exclusions, explicit fixture retention, undeclared modifications, missing imports/adapters, local namespaces, overlay-aware candidate changes/removals, invalid/overlapping rules, Git-compatible binary hashing, and the shared reactive panel projection across selection, sessions, maximize, and disable. `bun run build` passed with inherited upstream warnings.

The production tab derivation benchmark recorded before session edits measured a median 18.508500 ms versus 17.828750 ms afterward, for 20,000 operations per sample. Every sample retained checksum 592000. These measurements do not benchmark the new menu/group rendering or establish a browser performance improvement. Bun emitted its existing tsconfig directory warning while producing both successful benchmark bundles.

Live visual and drag/menu interaction verification remains pending because preview access was denied earlier. No app/backend was restarted, and the original upstream checkout was not modified. Automatic three-way merging and a full upstream-version integration test are outside this change; the new plan is an explicit review report.

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

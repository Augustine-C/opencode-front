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

# Validation

Validated locally on 2026-10-01 with Bun 1.3.14 on macOS.

- `bun run check`: application and plugin SDK type checks passed; 12 focused tests passed (42 assertions).
- `bun run build`: production Vite build and inherited PWA generation passed. Upstream CSS `::highlight` optimization warnings, large chunks, and existing mixed static/dynamic import warnings remain.
- Browser production preview at that time: connection screen and plugin manager rendered; importing `examples/plugins.jsonc` enabled both then-catalogued examples without an endpoint request. See `screenshots/plugin-manager.jpg`. In release 2.0.26.2, those example adapters moved to a separate source archive and are no longer part of the application catalog.
- Desktop shell: launched and rendered the production connection screen at `oc://renderer/`. This verifies the thin desktop runtime, not a signed installer or native SSH/browser tooling.
- Development server: startup passed with the final installed dependencies. An additional browser preview was declined; the production UI import test above provides the UI verification.
- `opencode service status` reported `stopped`. No backend was started or restarted. Live authenticated sessions, model execution, remote TLS/CORS configurations, permission flows, PTY streams, and provider-specific status endpoints therefore remain unverified against a running service in this task.
- Original `opencode-dev/opencode_v2` checkout remained clean. Shared protocol/client schemas and production timeline implementation were copied unchanged. Only external session extension slots and panel mounting were added to the session screen and summary.

The tests exercise cleanup of slots/commands/listeners, failed setup rollback, interrupted async setup, plugin reload options, JSONC parsing, configuration aliases and namespace directives, slot takeover/degradation, panel ownership, persistence namespaces, and host-disposal cancellation. They do not replace live backend integration or production session performance measurements.

Project inventory discovery was also validated on 2026-10-01: `bun run check` passed 17 tests (55 assertions), and `bun run build` passed with the existing upstream warnings. The added tests cover first-entry inventory, saved order and expansion, duplicate paths, reactive updates after closing a project, restored closed preferences, and independent local/remote inventories. Live GUI verification of this change remains unperformed because browser access to the local preview was denied earlier in this session.

Optional project tab grouping passed `bun run check` (22 tests, 72 assertions) and `bun run build` on 2026-10-01. Added coverage checks stable grouped ordering, separate servers, draft/restored directory resolution, worktrees, nested repositories, global projects, Windows paths, keyboard adjacency, and reordering with hidden tabs. The production styles provide distinct vertical/horizontal presentations. Live visual and drag interaction checks remain unperformed because the local browser preview was denied earlier.

Upstream attribution and MIT alignment were verified against the local OpenCode v2 snapshot on 2026-10-01. Root and UI licenses match upstream byte-for-byte; all workspace manifests declare MIT. `bun run check` passed (22 tests), `bun run build` passed, and the generated `dist/LICENSE` and `dist/NOTICE` match the source notices exactly.

Plugin controls were integrated into root client settings on 2026-10-01. `bun run check` passed 24 tests (78 assertions), including restoring the frontend plugin settings URL for single/multiple servers and rejecting server/project-scoped variants. `bun run build` passed with the existing upstream warnings. The command palette uses the settings page while the shell is mounted and falls back to the styled dialog before connection. Live visual, file-picker, and settings-navigation checks remain unperformed because the local browser preview was denied earlier.

The opt-in `panel-demo` example passed application/SDK type checks, the existing 24 tests, and the production build on 2026-10-01. At that time it was registered in the frontend catalog and demonstrated command/launcher entry points, configurable panel title/presentation, interactive sample state, and responsive full-screen layout. In release 2.0.26.2, it and `third-party-status` move to the separate source module in [`examples/frontend-plugins`](../examples/frontend-plugins/README.md). These earlier checks do not verify the extracted module's current rendered appearance or live interactions.

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

## Upstream v2.0.22 (2026-10-03)

The latest remote `v2` tag was verified as `v2.0.22`, commit `527f0b931d1f9b3ebd34e106c51b31ce5db5b075`. Both source tags were fetched into an isolated bare repository; the original `opencode-dev/opencode_v2` checkout remained clean. The inventory now records 3,198 imported targets, with 3,155 pristine files and 43 declared overlays. The new `gui-extensions` root retains the upstream renderer features and SDK. Its main entries are not loaded by the thin desktop shell.

Browser plugins now publish panels and menu entries through the native GUI SDK. Project inventory discovery, grouped horizontal/vertical tabs, settings, named slots, existing plugin configuration, and persisted `plugin-panel:` keys are retained. The old app session tab helpers were removed with upstream; the existing panel regression suite now drives the real browser plugin host and the new production bridge against a native-layout contract fixture. Tests cover preview preservation, native/SDK close, stable panel descriptors, reopening, owner/session isolation, disabling an owner, delayed layout/location readiness, and narrow-screen selection/close fallback. Withdrawing a menu registration removes its native entry while its open panel remains usable. A mutation that omitted native `select` was confirmed to fail the preview-preservation test, then reverted. Sidebar slots wrap the new native side-pane sidebar.

`bun run check` passed the import audit, all type checks, and 37 tests (166 assertions). `bun run build` completed with inherited CSS/import/chunk warnings and generated PWA assets. Root and redistributed MIT notices retain upstream attribution and identify the new source commit.

Before session edits, the production benchmark was changed to a common reducer workload, because upstream removed the old tab-derivation API. Frozen pre-upgrade and candidate bundles each ran seven samples of 20,000 file-tab preview/open/close cycles after warmup. The baseline median was 7.907333 ms and the candidate median 7.062750 ms; every sample retained checksum 720000. This measures reducer work only, not rendered UI, transcript performance, or backend latency, and small timing differences are not a speed guarantee.

Rendered desktop/mobile interactions and live backend compatibility remain unverified because browser preview access was denied earlier in this chat. No app or backend was restarted or otherwise managed.

## CodeArts Proxy installed gateway verification (2026-10-03)

The user installed the locally packaged desktop build. The running gateway executable is under `/Applications/CodeArts Proxy.app`; its SHA-256 matches the packaged binary, and installed bundle signature verification passes. Live `GET /api/overview` returns HTTP 200 and passes the browser adapter's response parser. Both benefit and package queries succeed independently, and the GUI displays their actual limits, used/remaining values, package name and validity dates, login state, default model, authentication state, and telemetry state.

The existing web frontend at `127.0.0.1:4444` was verified against this installed gateway: manual refresh, clearing previous values for an invalid endpoint, recovery after restoring the correct endpoint, accepting an OpenAI `/v1` base URL, closing/reopening the native plugin tab, and maximizing the panel all work. Without clicking refresh, the displayed query time advanced from 01:46:25 to 01:47:32 (Asia/Singapore), confirming automatic polling. Quota cards were visually checked side by side in the maximized panel.

The installed endpoint returns the expected local-origin CORS headers and `Cache-Control: no-store`. An unrelated website origin receives HTTP 403; the desktop renderer's `oc://renderer` OPTIONS preflight receives HTTP 204. Gateway API key authentication is disabled in the current installation, so enabled-key authentication remains covered by the earlier Rust test rather than this live check. Actual Electron/mobile renderer interactions remain unverified. No application or backend was started, stopped, or restarted during this verification.

## CodeArts Proxy plugin page interactions (2026-10-03)

The web plugin settings page and overview panel were exercised against the installed gateway. Settings shows the adapter and correct enabled/disabled state. Disabling removes both its open native panel tab and the Add tab menu contribution; re-enabling restores the menu and successfully loads a fresh overview. The plugin was left enabled after verification. Manual refresh, side-pane presentation and maximize/restore were exercised again; the current page's captured error log was empty.

At a temporary 390 × 844 browser viewport, the More menu opens the plugin, account details wrap, quota cards stack, and selecting Session returns to the conversation. The overview container measured 340px for both clientWidth and scrollWidth, with no horizontal overflow. The normal browser viewport was restored. These are responsive web checks, not physical-device or Electron runtime checks. Validation screenshots remain local temporary artifacts rather than repository fixtures. No code fixes or app/backend restarts were needed.

## Upstream v2.0.23 and v2.0.24 (2026-10-08)

The port is pinned to v2.0.24, commit `e7a34f09bfd9134dfade5a8ddb843f7030bc9a69`, incorporating both releases since v2.0.22. The inventory records 3,210 imports: 3,167 pristine and 43 overlays. The initial plan had 796 changes, 173 additions and 161 removals, with no local collisions or missing roots. Ten overlay conflicts were resolved; browser plugin adapters and existing panel tests now follow the new host APIs, MenuItem registry and panel callback props. Two custom IconButton mounts now render JSX icons. See [release analysis and sync details](upstream-v2.0.24.md).

`bun run check` passes all type checks and 40 tests with 199 assertions; `bun run build` passes and generates PWA assets. A clean frozen-lockfile dependency installation succeeds. The production session-tab reducer benchmark measured a median 13.490 ms before and 12.456 ms after, across seven samples of 20,000 preview/open/close cycles, retaining checksum 720000 in every sample. This is reducer work only, not a browser-rendering or backend benchmark.

Headless Chromium against a temporary static production preview verified the connection screen, settings icon, plugin manager and Example panel enable/disable. At 390 × 844, document clientWidth and scrollWidth both measured 390px. The page error log was empty. These checks used an isolated browser profile without service credentials. Live session execution, native plugin maximize/restore in a connected session, and Electron interactions remain unverified. No existing app or backend was restarted, started, stopped or upgraded; only a temporary static asset server was used for validation.

## Native CodeArts Proxy GUI extension (2026-10-08)

CodeArts Proxy moved from the browser-plugin catalog to `packages/codearts-proxy-extension`, a standalone native renderer definition using `Extension.define`, `Extension.compose`, `Panel`, `MenuItem`, `Command`, `SettingsPage`, `Style`, native context and a declared global preference store. It has no app or browser-plugin SDK imports. The upstream GUI sources remain pristine; the existing root overlay mounts a port-owned native composition list. Saved browser-plugin enablement, endpoint and interval import once; API keys stay in memory. Its previous tab key is declared through `Panel.legacy`. The custom browser-panel fullscreen toolbar is not used by the native example.

`bun run check` passes all type checks and 42 tests with 209 assertions. Existing external API contract tests moved with their implementation; two native tests cover legacy preference migration and actual in-flight gateway fetch cancellation/key cleanup on owner disposal. `bun run build` passes and generates PWA assets.

Headless Chromium exercised the production frontend with upstream v2.0.24 service fixtures intercepted in the browser and a fixture overview response; no real OpenCode backend or gateway was started or changed. It verified migrated native settings with no background gateway request, native Add tab opening, zero/unknown/partial quota presentation, explicit-key manual refresh, automatic polling, cancellation of polling for more than one interval after close, reopening, mobile menu selection and return to Session, and native disable removing the panel/tab and menu. Gateway keys were absent from persisted browser data. At 390 × 844 the overview clientWidth and scrollWidth were both 372px; the page error log was empty. The existing mobile navigation can extend beyond its viewport, but the native menu and overview were exercised. Temporary screenshots and browser scripts remain outside the repository.

These are fixture-backed browser checks, not live CodeArts Proxy account/usage verification or Electron integration. Runtime installation through external `.ocdx` renderer bundles is not supported by the current upstream loader; the extension is bundled here and documented for source/build-time integration into another OpenCode v2 build.

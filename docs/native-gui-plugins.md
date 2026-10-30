# Official native GUI plugin adaptation

This follow-up is based on OpenCode v2.2.1 at `3ebcf9a32c7b28f658cfee80775448929361727a`. It replaces the renderer-only desktop limitation recorded in the v2.2.0/v2.2.1 release notes. The follow-up is included in port version `2.2.1+1` (release `2.2.1.1`).

## Architecture

The desktop now imports the official main-process host, bundle evaluator, lifecycle, IPC schemas, enable manager, SQLite storage/migrations, native embeds/corner rendering and renderer bridge. Official GUI built-ins retain their main entries. CodeArts Proxy is registered in the same official catalog and its existing renderer/settings/preferences migration remains intact.

`packages/desktop/src/front` adapts the existing Electron shell to these modules. It binds a host to a configured HTTP service, transports the official Bridge operations over isolated Electron IPC, scopes callers to the main window/frame, validates requests with the upstream schemas, preserves structured failure codes and cancellation, and carries state/events/availability/GUI revisions back to windows. The renderer does not fetch or evaluate a second independent set of GUI bundles.

Main lists `plugin.list`, reads `plugin.gui` and follows `plugin.updated` through the official host. External packages are installed/configured on the existing service through its standard `opencode.json` workflow. The official Extensions UI manages GUI enable/disable/reload. There is no frontend ZIP/manifest importer, custom SDK, slot runtime or parallel GUI loader. The rejected renderer-only prototype is not included.

Selecting another configured HTTP service withdraws old GUI/IPC contributions, aborts its requests and disposes its host before starting the next. Native callbacks are removed on disposal. Main-process plugin storage and enable preferences are scoped per service; renderer `Store.global` retains upstream's device-wide semantics. Plugin-contributed SSH/WSL endpoints keep the host that owns their connection alive. Endpoints remain configured services: the app does not automatically start a backend.

Project grouping, clicked-project draft creation, history navigation/search and independent build information remain port overlays. The native source changes are declared in `upstream/import-rules.json`; the exact import inventory now contains 3,505 files (3,460 pristine and 45 overlays).

## Distribution adaptations

The sandboxed renderer receives the official GUI bridge through a context-isolated preload. Node integration remains off. The native host is bundled separately from the web build and staged with its resource-bearing Lighthouse dependency graph. Packaging uses the same exact Electron pin as development (44.9.1); Bun remains 1.4.4. There is no bundled OpenCode backend.

The upstream binary updater main entry is omitted because this distribution has its own release artifacts. Other main entries and the external plugin APIs remain present. CLI-dependent native features use an installed `opencode` executable (target v2.2.1); `OPENCODE_FRONT_CLI` can specify its path. This change does not install or upgrade that executable. An actual CLI installation and live SSH/WSL acceptance are separate from the GUI-host integration checks.

## Validation

- `bun run check`: import audit, app/CodeArts/native/tooling type checks, 74 tests / 283 assertions, plus the independent main-host integration keeper.
- `bun run build`: production/PWA assets and the bundled main host succeed. Desktop staging includes preload/native host. The staged Lighthouse package and dependency graph load successfully in Node.
- The main keeper exercises the real upstream host/evaluator, real SQLite and production raw IPC request handlers against disposable HTTP/SSE fixtures. Main setup, calls, state/events, cancellation, enable persistence, reload/removal, embed ownership/cleanup and source switching with delayed old responses pass.
- The same main keeper passes under Electron 44.9.1's Node 24.22.0 runtime using `ELECTRON_RUN_AS_NODE=1`. This starts no desktop application or renderer.
- Production Chromium UI→main calls/state sync, official settings, disable persistence, same-revision input retention, plugin updates, service/storage isolation, removal and web isolation pass with zero page errors or console errors. Electron window/IPC surfaces are boundary doubles; the official bridge and actual production main host run on either side.
- A separately built independent GUI bundle renders its side panel through upstream `RegionContent` and contributes the official `session.panel` menu item in the upstream session-host fixture. Zero page errors.
- Existing connection/CodeArts migration/persistence, project grouping, clicked-root draft creation, filtering/keyboard/IME, history and version-information keepers pass with zero page errors.

Reproduce the integration keepers with [the fixture instructions](../packages/app/performance/service-gui/README.md). Local logs are under the worktree's ignored `work/native-migration/` folder. The side-panel check used the exact upstream v2.2.1 session-host fixture, with provider order adapted to standalone mounting; that one-off harness is retained in `work/gui-harness/` for review.

No real third-party package was installed on the user's service. Real Electron native compositing, dialogs and OS permission behavior, full provider sessions, live SSH/WSL and signed macOS/Windows archive launch remain unverified by local validation. CI builds both desktop platforms before merge and verifies the archived macOS signatures, actual preload, GUI discovery and GUI→main state updates with an independently built plugin and a disposable service. No user backend, gateway or running app was started, stopped, upgraded or restarted. The primary checkout's unrelated `bun.lock` remains untouched.

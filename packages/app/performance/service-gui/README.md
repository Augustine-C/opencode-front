# Official native GUI plugin keeper

The independent official SDK bundle contributes a settings page, a session-side panel/menu and a main entry. Its main entry provides a schema-checked counter, cancellation and a native embed. It is a fixture, never bundled into the application.

From the root with the pinned Bun:

```sh
bun run test:desktop-plugins
bun run build
# Separate terminal, packages/app:
bun --bun ../../node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4444 --strictPort
# Root; set CHROMIUM_PATH to an installed Chromium:
node packages/app/performance/service-gui/keeper.mjs
```

The main keeper drives the production raw IPC request format, actual upstream main host/evaluator/lifecycle and real SQLite against a disposable HTTP/SSE fixture. It covers main IPC, state/events, cancellation, enable persistence, reload, removal, native embed routing/ownership/cleanup and service switching with a delayed old response.

The browser keeper uses the production app and official renderer bridge, relaying its native requests to that same production main host. It checks GUI→main calls and state updates, settings, disable persistence, unchanged-revision input retention, new revisions, service/storage isolation, removal and web isolation.

Native Electron surfaces are boundary doubles; no user app or backend is launched. These are not proof of real Electron window compositing, OS dialogs, a third-party package installation, provider sessions or SSH/WSL operation. Those remain desktop acceptance work. The existing native archive smoke check remains in release CI, which has not been dispatched for this held change.

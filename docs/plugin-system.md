# Frontend plugin API v1

The port keeps the upstream Solid frontend and generated v2 client. Plugins run in the renderer and customize named host boundaries. Both web and desktop use the same catalog, runtime, and configuration. This repository contains no OpenCode server or service manager.

## Compatibility boundary

OpenCode v2 TUI plugins use `define({ id, setup(context) })`, configuration `plugins: ["package", { "package": "package", "options": {} }]`, and `context.ui.slot(...)`. The frontend SDK intentionally follows those conventions. It also accepts JSONC, negative enablement directives (`-plugin.id`), `*`, and namespace selectors such as `acme.*`. Negative directives preserve existing options. The order of the first enablement controls contributions; the last replacement of a slot wins.

This is an adapter API, not binary TUI compatibility. OpenTUI JSX, terminal rendering, keymap scopes, markdown renderers, terminal themes, and filesystem-backed TUI storage cannot execute in a browser. Put reusable data logic in a shared module; publish separate TUI and browser renderers. Map exact TUI package declarations, including versions or paths, through the browser definition's `tui` array. Unknown positive package declarations appear in the import report. Importing config never downloads or executes a package. Other TUI configuration fields (theme, keybinds, layout) are not imported.

```tsx
import { define } from "@opencode/frontend-plugin"

export default define({
  id: "acme.queue",
  name: "Queue status",
  apiVersion: 1,
  tui: ["@acme/opencode-tui-queue@1.0.0"],
  setup(context) {
    context.ui.slot({
      append: "prompt.footer.status",
      render: (input) => <span>{input.sessionID ?? "New session"}</span>,
    })
    context.ui.panel.register({ name: "queue", title: "Queue" })
    context.ui.command({
      id: "details",
      title: "Open queue details",
      run: () => {
        context.ui.panel.open("queue")
      },
    })
    context.ui.slot({
      append: "session.panel",
      render: (input) =>
        input.name === "queue" ? (
          <section>
            <h2>Queue</h2>
            <button onClick={input.close}>Close</button>
          </section>
        ) : null,
    })
  },
})
```

Import the adapter into `packages/app/src/plugins/catalog.ts` and add it to `createCatalog`. Installed plugins appear in **Settings → Frontend plugins** and through the command palette. Before connecting, the connection screen's settings icon opens the same controls. External adapters must use the host's Solid runtime, with `solid-js` as a peer dependency. Source TSX imports are compiled by Vite. A separately published adapter should ship browser-compatible ESM; avoid bundling a second Solid runtime or importing Node APIs. This first release uses an explicit build-time catalog rather than a runtime marketplace.

## Slot contract

| Slot                   | Input                                                         | Host position                              |
| ---------------------- | ------------------------------------------------------------- | ------------------------------------------ |
| `app`                  | empty object                                                  | Application routes and auxiliary interface |
| `home.footer`          | empty object                                                  | Home page footer                           |
| `home.footer.status`   | empty object                                                  | Inside the home footer                     |
| `prompt.footer`        | sessionID, mode, showDetails                                  | Beneath every composer                     |
| `prompt.footer.status` | same as prompt footer                                         | Composer status information                |
| `prompt.footer.file`   | same as prompt footer                                         | Composer file information                  |
| `session.composer.top` | sessionID                                                     | Above the active session composer          |
| `session.header`       | sessionID                                                     | Above session content                      |
| `session.panel`        | sessionID, name, width, presentation, close, toggleFullscreen | An explicitly opened plugin panel          |
| `sidebar.content`      | sessionID                                                     | Native side-pane sidebar content           |
| `sidebar.footer`       | sessionID                                                     | Beneath the native side-pane sidebar       |

A slot supports exactly one of `prepend`, `append`, `before`, `after`, or `replace`. Additive contributions retain enablement order. At the same target, the last registered replacement wins. A replacement suppresses contributions under its dot-prefixed descendants; before/after siblings on that same boundary survive. An absent additive target falls back to its nearest mounted dot-prefixed ancestor; absent replacements are suppressed. Inactive routes naturally have unmounted slots. The host exposes resolution diagnostics through its API. Settings shows plugin enablement and errors without exposing slot-resolution counts.

Slots preserve the host layout: wrapping or replacing one boundary does not grant a contribution independent control over unrelated columns. `session.panel` opens as a closable, draggable tab alongside Review, Context, and files in the session side pane. It shares the pane’s resizing controls. On narrow screens it appears as a session view; the More menu opens registered panels and selects active plugin panels. Panels belong to their plugin and session: switching sessions shows only that session’s panels, closing a tab dismisses its panel, and disabling its owner removes all its panels. Only the owning plugin renders into a panel. The `width` input measures its actual content area. Fullscreen presentation maximizes the pane within the workspace while retaining the native tabs.

As of upstream v2.0.22, a port-owned bridge publishes browser plugin panels as native GUI SDK `Panel`/`MenuItem` contributions (updated for v2.0.24). Existing browser plugin API v1, configuration files, and persisted panel keys remain supported. Closing the selected mobile plugin view returns to the conversation.

## Context and lifecycle

- `client()` returns the authenticated generated v2 client for the selected service. It may be undefined. Call it when performing an action; retaining the result across a server switch would bind the plugin to the previous service.
- `connection()` returns service key, URL, and health. Home selects a service only when exactly one exists. A session route supplies its explicit service. No password is included in this object.
- `sessionID()` is the current route's session identity, or undefined on home/new-session screens.
- `data.listen(handler)` follows service changes and receives the existing service event stream. Its subscription is disposed automatically with the plugin. API calls and event payloads remain upstream v2 types.
- `storage.get/set` persist JSON under a plugin-specific localStorage namespace. Browser profiles and desktop renderer storage are independent. Namespace isolation prevents accidental collisions; it is not a security sandbox or cross-client synchronization.
- `ui.command` contributes a namespaced command to the existing command palette.
- `ui.panel.register({ name, title, presentation? })` adds a panel to the native **+ Add tab** menu and mobile **More** menu without opening it. It returns a cleanup function, and registrations are removed on disable, reload, failed setup, or host disposal. Panel names must be unique within one plugin. Closing an open tab leaves its menu entry available for reopening.
- `ui.panel.open(name, { presentation, title })` selects a plugin panel for the current session and returns false without an active session. `current/close` operate on that plugin's panel only.
- The host owns setup's Solid root, slot registrations, commands, and event subscriptions. `setup` may return a cleanup function or a promise resolving to one. Cleanup runs on disable, replacement, or host disposal. A failed setup rolls back contributions and is shown in the manager. Individual render failures are contained by a Solid error boundary.
- Use `context.signal` for fetch cancellation and return cleanup for timers, observers, and external listeners. An asynchronous setup completing after disable cannot register a stale claim or command; its returned cleanup still runs. Reactive computations created after an `await` need an explicitly owned Solid root, as with ordinary Solid code.

Plugins are trusted application code. The same-realm API does **not** sandbox packages or enforce permissions; a plugin can access the DOM, browser storage, networking, and the connected service's capabilities. A future untrusted plugin tier would require iframe/worker isolation with a declarative, permissioned RPC API. Do not claim a manifest or namespaced storage provides that isolation.

## Example plugins

Two source examples are published separately from the desktop app in the `opencode-front-example-plugins-<version>.zip` release asset. The module is under [`examples/frontend-plugins`](../examples/frontend-plugins/README.md). It contains a local session panel that demonstrates Solid state and plugin panel APIs, plus an opt-in status panel that demonstrates HTTP requests, polling, cancellation, and cleanup.

These examples are reference source and are not bundled with the application. The current frontend uses an explicit build-time catalog; to try one, import it into `packages/app/src/plugins/catalog.ts`, rebuild, and then enable it in **Settings → Frontend plugins**. Example configurations and integration notes are included in the separate module. The status adapter makes no request until an endpoint is configured and does not forward OpenCode authorization.

## CodeArts Proxy native GUI extension

CodeArts Proxy has moved out of this browser-plugin system into a standard OpenCode v2 renderer extension. Open **Settings → CodeArts Proxy**, enable it, and configure the proxy address and polling interval there. In a session, open **+ Add tab → CodeArts Proxy overview**, **More** on mobile, or the native command-palette action. It uses native panels, menus, commands, settings, styles and persisted stores directly, without the browser-plugin panel bridge.

Existing saved `codearts-proxy` browser-plugin enablement and options migrate once into its native preference store. The old JSONC example and browser catalog entry have been removed; do not add `codearts-proxy` to new browser-plugin configuration imports. If an old browser import lists it as unsupported, remove that entry from the browser config and manage it through its native settings page.

See the [native extension guide](../packages/codearts-proxy-extension/README.md) for its structure, source integration into another OpenCode v2 build, migration behavior and gateway requirements. Connection status remains in the built-in browser catalog. Third-party status and the generic panel demo are reference sources in the separate example module above.

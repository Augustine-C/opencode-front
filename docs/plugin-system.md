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
| `sidebar.content`      | sessionID                                                     | Top of the session summary                 |
| `sidebar.footer`       | sessionID                                                     | Bottom of the session summary              |

A slot supports exactly one of `prepend`, `append`, `before`, `after`, or `replace`. Additive contributions retain enablement order. At the same target, the last registered replacement wins. A replacement suppresses contributions under its dot-prefixed descendants; before/after siblings on that same boundary survive. An absent additive target falls back to its nearest mounted dot-prefixed ancestor; absent replacements are suppressed. Inactive routes naturally have unmounted slots. The host exposes resolution diagnostics through its API. Settings shows plugin enablement and errors without exposing slot-resolution counts.

Slots preserve the host layout: wrapping or replacing one boundary does not grant a contribution independent control over unrelated columns. `session.panel` opens as a closable, draggable tab alongside Review, Context, and files in the session side pane. It shares the pane’s resizing controls. On narrow screens it appears as a session view; the More menu selects among open plugin panels. Panels belong to their plugin and session: switching sessions shows only that session’s panels, closing a tab dismisses its panel, and disabling its owner removes all its panels. Only the owning plugin renders into a panel. The `width` input measures its actual content area. Fullscreen presentation maximizes the pane within the workspace while retaining the native tabs.

## Context and lifecycle

- `client()` returns the authenticated generated v2 client for the selected service. It may be undefined. Call it when performing an action; retaining the result across a server switch would bind the plugin to the previous service.
- `connection()` returns service key, URL, and health. Home selects a service only when exactly one exists. A session route supplies its explicit service. No password is included in this object.
- `sessionID()` is the current route's session identity, or undefined on home/new-session screens.
- `data.listen(handler)` follows service changes and receives the existing service event stream. Its subscription is disposed automatically with the plugin. API calls and event payloads remain upstream v2 types.
- `storage.get/set` persist JSON under a plugin-specific localStorage namespace. Browser profiles and desktop renderer storage are independent. Namespace isolation prevents accidental collisions; it is not a security sandbox or cross-client synchronization.
- `ui.command` contributes a namespaced command to the existing command palette.
- `ui.panel.open(name, { presentation, title })` selects a plugin panel for the current session and returns false without an active session. `current/close` operate on that plugin's panel only.
- The host owns setup's Solid root, slot registrations, commands, and event subscriptions. `setup` may return a cleanup function or a promise resolving to one. Cleanup runs on disable, replacement, or host disposal. A failed setup rolls back contributions and is shown in the manager. Individual render failures are contained by a Solid error boundary.
- Use `context.signal` for fetch cancellation and return cleanup for timers, observers, and external listeners. An asynchronous setup completing after disable cannot register a stale claim or command; its returned cleanup still runs. Reactive computations created after an `await` need an explicitly owned Solid root, as with ordinary Solid code.

Plugins are trusted application code. The same-realm API does **not** sandbox packages or enforce permissions; a plugin can access the DOM, browser storage, networking, and the connected service's capabilities. A future untrusted plugin tier would require iframe/worker isolation with a declarative, permissioned RPC API. Do not claim a manifest or namespaced storage provides that isolation.

## Third-party status example

The optional `third-party-status` plugin is installed but disabled by default. It performs no request without an explicitly supplied endpoint. Import:

```json
{
  "plugins": [
    "connection-status",
    {
      "package": "third-party-status",
      "options": {
        "endpoint": "https://your-service.example/status",
        "interval": 60000
      }
    }
  ]
}
```

The endpoint must allow the frontend origin through CORS and return `{ "label": "Build queue", "value": "3 pending" }`. It can serve quota, CI, deployments, or another status without changing the renderer. Use your own endpoint for provider-specific authentication and schema conversion. The plugin omits browser credentials and never forwards OpenCode authorization to the endpoint. Failures display **Status unavailable**, clear stale values, and continue polling; missing data is never displayed as zero. Refresh and open-panel commands appear in the command palette when enabled. Polling stops and in-flight requests are cancelled on disable.

## Example plugin panel

Enable **Example panel** in **Settings → Frontend plugins**, return to an existing session, then click **Example panel** below the message box. Alternatively, open the command palette with **⌘K** or **⌘⇧P** on macOS (**Ctrl+K** or **Ctrl+Shift+P** elsewhere) and choose **Open example plugin panel**. The demo requires an active session.

The panel shows sample build status, an interactive checklist with progress, notes, and the current session ID. It opens in the same tab strip as Review and Context. **Expand panel** maximizes the workspace pane; **Return to side panel** restores the chat alongside it. Wide panels place the checklist and notes side by side. **Reset example** resets the checklist and notes. State lasts until the plugin is disabled or the page is reloaded. The demo performs no network requests or backend changes.

The implementation is in `packages/app/src/plugins/builtin/panel-demo.tsx`. Import `examples/panel-demo.jsonc` for an explicit configuration:

```json
{
  "plugins": [
    "connection-status",
    {
      "package": "panel-demo",
      "options": {
        "title": "Project overview",
        "presentation": "panel",
        "showLauncher": true
      }
    }
  ]
}
```

`title` sets the panel heading, `presentation` accepts `panel` or `fullscreen`, and `showLauncher: false` hides the message-box shortcut while leaving the command-palette action available. Omitted options use the translated heading, a side panel, and a visible launcher. Configuration import replaces the enabled-plugin configuration, so include other plugins you want to retain.

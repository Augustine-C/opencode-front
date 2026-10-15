# Third-party status independent plugin

An independently packaged version of the `third-party-status` reference adapter from `examples/frontend-plugins`. It builds a self-contained ZIP that the host installs through **Settings → Frontend plugins** without rebuilding the application.

The plugin shows an opt-in status line in the Home and prompt footers, the sidebar footer, and an on-demand session panel. It polls a user-supplied HTTP endpoint, keeps request cancellation and polling cleanup tied to the plugin lifecycle, and disables itself cleanly.

After installing and enabling the ZIP, the status line appears in the footers once an endpoint is configured. Run **Open third-party status panel** in the command palette (inside a session) to open the panel, or **Refresh third-party status** to refresh immediately.

## Build

From a separate checkout, install the listed build dependencies before building:

```sh
cd third-party-status-plugin
bun install
bun run typecheck
bun run build
```

From this monorepo root, use `bun run --cwd examples/independent-plugin-third-party-status ...` for the same commands.

The output goes to `examples/independent-plugin-third-party-status/dist/`. The plugin imports Solid from the host's shared runtime facade, so Solid is not copied into the ZIP. Install only ZIPs from plugin authors you trust: the runtime executes plugin code in the host page and does not sandbox it. The manifest capability list communicates API requirements; it is not a security boundary.

Change `id`, `version`, or `capabilities` in `plugin.manifest.json` before publishing your own variant. Published packages must use a new SemVer version whenever package contents change.

## Options

Enable the plugin with a JSON or JSONC plugin configuration:

```json
{
  "plugins": [
    "connection-status",
    {
      "package": "example.third-party-status",
      "options": {
        "endpoint": "https://your-service.example/status",
        "interval": 60000
      }
    }
  ]
}
```

The endpoint must allow the frontend origin through CORS and return `{ "label": "Build queue", "value": "3 pending" }`. The plugin omits browser credentials and never forwards OpenCode authorization. It makes no request until an endpoint is supplied, and cancels its request and timer when disabled. `interval` is the poll interval in milliseconds; values below 5000 are clamped to 5000.

The samples use English copy to keep the API examples focused. Adapt the labels for your application before distributing them.

## Reloading during host development

When developing this plugin in the monorepo, run the host with `bun run dev` and build the standalone ZIP with `bun run --cwd examples/independent-plugin-third-party-status build`. In **Settings → Frontend plugins**, use **Reload local plugin ZIP** on an enabled plugin and select the new ZIP. This control is available only in the Vite development build.

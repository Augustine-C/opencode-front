# Panel demo independent plugin

An independently packaged version of the `panel-demo` reference adapter from `examples/frontend-plugins`. It builds a self-contained ZIP that the host installs through **Settings → Frontend plugins** without rebuilding the application.

The panel shows a session-scoped checklist, notes, a progress display, a configurable title and panel presentation, and a reset action. It makes no network request and no backend change. Checklist and notes state is in-memory per activation; the plugin does not use persistent storage.

After installing and enabling the ZIP, open a session and choose **+ Add tab → Project overview** (or **More** on mobile), or run **Open example plugin panel** in the command palette. The command is session-scoped and is not offered on the Home screen, where no session panel can open.

## Build

From a separate checkout, install the listed build dependencies before building:

```sh
cd panel-demo-plugin
bun install
bun run typecheck
bun run build
```

From this monorepo root, use `bun run --cwd examples/independent-plugin-panel-demo ...` for the same commands.

The output goes to `examples/independent-plugin-panel-demo/dist/`. The plugin imports Solid from the host's shared runtime facade, so Solid is not copied into the ZIP. Install only ZIPs from plugin authors you trust: the runtime executes plugin code in the host page and does not sandbox it. The manifest capability list communicates API requirements; it is not a security boundary.

Change `id`, `version`, or `capabilities` in `plugin.manifest.json` before publishing your own variant. Published packages must use a new SemVer version whenever package contents change.

## Options

Install the ZIP, choose **Configure** in **Settings → Frontend plugins**, edit the fields, then choose **Save and apply** and enable the plugin. No configuration file is needed for later edits. JSON/JSONC import remains available for existing workflows:

```json
{
  "plugins": [
    "connection-status",
    {
      "package": "example.panel-demo",
      "options": {
        "title": "Project overview",
        "presentation": "panel",
        "showLauncher": true
      }
    }
  ]
}
```

- `title` overrides the panel title shown in the tab and the **+ Add tab** menu.
- `presentation` selects `panel` (side panel) or `fullscreen`.
- `showLauncher` set to `false` hides the **+ Add tab** menu entry; the command palette command remains available in sessions.

The samples use English copy to keep the API examples focused. Adapt the labels for your application before distributing them.

## Reloading during host development

When developing this plugin in the monorepo, run the host with `bun run dev` and build the standalone ZIP with `bun run --cwd examples/independent-plugin-panel-demo build`. In **Settings → Frontend plugins**, use **Reload local plugin ZIP** on an enabled plugin and select the new ZIP. This control is available only in the Vite development build.

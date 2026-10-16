# Independent frontend plugin template

This template builds one self-contained ESM entry and a ZIP package. It imports Solid from the host's shared runtime facade, so Solid is not copied into the plugin. Build a ZIP after the host is already built to verify that module development does not require rebuilding the host.

The UI extends the existing session Side Panel. After installing and enabling the ZIP, open a session and choose **+ Add tab → Hello plugin**, or run **Open Hello panel** from the command palette. The panel shares the native tabs, resizing, closing, and session context with Review, Context, and files. Registration adds a menu entry without opening a tab; the connection screen has no session panel to display. The greeting counter, CSS, and image render inside this panel.

Independent packaging means the ZIP can be built and installed separately from the host. Keep custom panel content in the `session.panel` renderer and match `input.name`; use `context.ui.panel.register` for discovery and `context.ui.panel.open` to select it in the current session.

The template can be copied into a separate plugin repository. Its `types/plugin-sdk.d.ts` file is the compile-time SDK snapshot for API v1; it is type-only and adds no runtime dependency on the host repository. In a separate checkout, install the listed build dependencies before building:

```sh
cd my-plugin
bun install
bun run typecheck
bun run build
```

From this monorepo root, use `bun run --cwd examples/independent-plugin-template ...` for the same commands.

The output goes to `examples/independent-plugin-template/dist/`. Install only ZIPs from plugin authors you trust: the current runtime executes plugin code in the host page and does not sandbox it. The manifest capability list communicates API requirements; it is not a security boundary.

Change `id`, `version`, `capabilities`, `styles`, and `assets` in `plugin.manifest.json` before publishing. Published packages must use a new SemVer version whenever package contents change.

## Configuration

Install the ZIP, choose **Configure** in **Settings → Frontend plugins**, set the panel title, then choose **Save and apply** and enable the plugin. Later changes use the same form without another import. The `configuration.fields` declaration in `plugin.manifest.json` supplies the form; `setup` reads the resulting values from `context.options`. Viewing or editing the form does not execute plugin code.

## Reloading during host development

When developing this plugin in the monorepo, run the host with `bun run dev` and build the standalone ZIP with `bun run --cwd examples/independent-plugin-template build`. In **Settings → Frontend plugins**, use **Reload local plugin ZIP** on an enabled plugin and select the new ZIP from `examples/independent-plugin-template/dist/`. The development host assigns a local build identifier, activates a fresh plugin instance, and cleans up the previous instance without rebuilding the host. Rebuild and reload as often as needed; published packages should still use a new SemVer version for every content change.

This control is available only in the Vite development build. Production builds do not expose or accept development reloads.

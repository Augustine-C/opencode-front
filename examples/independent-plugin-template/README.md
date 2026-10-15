# Independent frontend plugin template

This template builds one self-contained ESM entry and a ZIP package. It imports Solid from the host's shared runtime facade, so Solid is not copied into the plugin. Build a ZIP after the host is already built to verify that module development does not require rebuilding the host.

The template can be copied into a separate plugin repository. Its `types/plugin-sdk.d.ts` file is the compile-time SDK snapshot for API v1; it is type-only and adds no runtime dependency on the host repository. In a separate checkout, install the listed build dependencies before building:

```sh
cd my-plugin
bun install
bun run typecheck
bun run build
```

From this monorepo root, use `bun run --cwd examples/independent-plugin-template ...` for the same commands.

The output goes to `examples/independent-plugin-template/dist/`. Install only ZIPs from plugin authors you trust: the current runtime executes plugin code in the host page and does not sandbox it. The manifest capability list communicates API requirements; it is not a security boundary.

Change `id`, `version`, `capabilities`, `styles`, and `assets` in `plugin.manifest.json` before publishing. Use a new SemVer version whenever package contents change.

# Upstream maintenance

The source version is pinned in `upstream.json`. Run `bun run upstream:plan --source <checkout> --ref <commit>` before importing, inspect every overlay and collision, update provenance, then run `upstream:record` at that exact commit. Run `bun run check` and `bun run build` before delivery. Preserve unrelated checkouts and lockfiles.

The import policy and inventory classify every file as pristine, a declared overlay or port-owned. GUI built-ins now live in `packages/gui-plugins`; the GUI SDK and RPC re-export are a partial import of `packages/plugin`. Server/core/TUI/main-process implementations are excluded. `packages/patchmark` supplies the upstream session markdown parser. Dependency patches must match the exact imported package versions.

The official `runtime/plugin` host owns plugin activation, storage and contributions. The CodeArts definition list is composed in `src/extensions/native.ts` and included through the `runtime/plugin/builtins.ts` overlay. Do not restore `packages/frontend-plugin`, `src/plugins`, custom slot mounts or the browser panel bridge. Keep the existing-service connection overlay, project grouping adapters, build information, and history navigation mounts. See [v2.2.0 migration](upstream-v2.2.0.md).

The Electron shell serves the web renderer and never activates upstream main entries or manages a service. Official external GUI bundle installation requires a separate upstream desktop bridge; do not represent bundled plugin support as an installation service.

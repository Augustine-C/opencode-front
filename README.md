# OpenCode Front

A frontend-only port of OpenCode v2 with the official OpenCode GUI plugin system. It attaches to an existing local or remote OpenCode service and preserves the upstream session, composer, review, file, model, permission, and terminal interface.

This repository is an independently maintained frontend-only port of [OpenCode v2](https://github.com/anomalyco/opencode), based on **2.2.0**, commit [`1097e26`](https://github.com/anomalyco/opencode/tree/1097e2668b1e08ad63bdf0b1c4860b9bc01e420c). Upstream frontend code, shared client/protocol/schema code, assets, utilities, and dependency patches are retained; the CodeArts Proxy GUI plugin, thin desktop shell, and project tab grouping are additions in this port. See [source provenance](docs/upstream.json) and [attribution notice](NOTICE).

## License and attribution

OpenCode Front is released under the **MIT License**, matching the upstream OpenCode license. The original `Copyright (c) 2025 opencode` notice and full upstream license text are preserved unchanged in [LICENSE](LICENSE), along with the retained [UI package license](packages/ui/LICENSE). This project's additions and modifications use the same MIT license. Third-party dependencies and assets retain their own licenses and notices.

The production web build used by both web and desktop includes `LICENSE` and `NOTICE` at its root. Preserve these notices when redistributing the source or build.

## Run the web frontend

Use Bun 1.4.4, matching the version pinned in `package.json` and used by CI and release builds.

```sh
bun install
bun run dev -- --host 127.0.0.1 --port 4444
```

Open `http://127.0.0.1:4444`. Enter the running service's address and password in the connection screen. Use the existing server picker/settings to add and switch connections. This project does not start, restart, upgrade, or stop the backend.

Optional initial service URL: copy `packages/app/.env.example` to `packages/app/.env.local` and set `VITE_OPENCODE_SERVER_URL`. Keep credentials out of environment files and URLs; enter them in the connection screen. Browser server settings, including its connection credential, use the upstream local persistence implementation. Do not share the browser profile.

For remote connections, use the service's reachable HTTPS address. The service must allow the web frontend's origin through its CORS configuration. An HTTPS-hosted web frontend cannot connect to a plain HTTP service because of browser mixed-content restrictions; use HTTPS or a locally accessible tunnel. SSH/native browser integration is not implemented in this thin shell; an externally managed SSH port forward can expose a remote service as a local HTTP endpoint. Service compatibility checks and authentication behavior come from upstream v2.

## Run the desktop frontend

```sh
bun run build
bun run desktop
```

For desktop development while Vite is running:

```sh
OPENCODE_FRONT_DEV_URL=http://127.0.0.1:4444 bun run desktop
```

Electron loads the same web build using `oc://renderer`, an origin already permitted by the v2 service. It uses a separate `opencode-front` profile, context isolation, and a sandboxed renderer. It has no bundled backend, sidecar, service manager, native SSH transport, native browser tooling, or auto-updater.

The **Build client** GitHub Action runs upstream boundary checks, type checks, and tests for pull requests without building or uploading artifacts. New commits to a pull request cancel its older check run. Branch pushes do not trigger the workflow. Release tags build and package macOS Apple Silicon (arm64) and Windows (x64) apps. Release tags follow `<OpenCode version>.<port revision>`, for example **`2.2.0.0`**; the last number increments for port fixes on the same upstream version. Electron's package version uses the equivalent SemVer **`2.2.0+0`**, while Windows file metadata keeps the four-part version. Pushing a release tag creates a GitHub release with the app archives, the `opencode-front-codearts-plugin-<version>.zip` source archive. Extract the app archive and launch `OpenCode-Front.app` on macOS or `OpenCode-Front.exe` on Windows. macOS builds are ad hoc signed and are not notarized. Gatekeeper may block first launch; after verifying the download came from this repository, clear its quarantine in Terminal with `xattr -dr com.apple.quarantine "/path/to/OpenCode-Front.app"`.

Ad hoc macOS builds disable hardened runtime through the signing tool's per-file options so the app and its helpers can load the bundled Electron libraries without a Team ID. Before uploading, the workflow extracts the release archive, verifies every Mach-O signature, rejects hardened runtime and explicit library validation flags, and checks that the app starts a renderer helper.

See the [2.0.32.1 release notes](docs/releases/2.0.32.1.md) and [OpenCode v2.1.4 sync details](docs/upstream-v2.1.4.md).

## Organize session tabs

In **Settings → General**, enable **Group tabs by project** beside the **Tabs** layout selector. The preference applies to both web and desktop and defaults to off. Tabs are ordered by OpenCode instance, then project. The same project name or path on different instances remains separate. Sidebar headings show only the instance name or project avatar/name; hover or focus reveals the collapse arrow and a click-to-expand/collapse hint.

Drag an instance heading with the mouse to reorder instance blocks, or a project heading to reorder projects within its instance. There are no ordering menus or keyboard ordering commands. These preferences persist across reloads and layout changes. Temporarily closed projects and instances retain their saved ordering, and newly opened groups append after known groups.

Click an instance or project heading to collapse or expand it. Collapse state is independent at both levels and saved across reloads. Selecting or opening a session, including through a keyboard shortcut, expands its instance and project; you can also fold the current group while continuing to use the session. Vertical headings stay visible while scrolling.

Hover or focus a project heading to reveal **+**. It opens a new session tab with that project's instance and root directory already selected, including when the project is folded. The button stays visible on touch devices. Grouped layouts use compact headings, conversation rows and spacing.

Horizontal layout uses one compact **Browse conversations** entry showing the current instance/project, rather than separate wide headings in the tab row. Open it to browse the grouped conversation list, collapse groups, drag their headings, or select a conversation. Escape or a click outside closes the list. The horizontal row keeps all conversation tabs available, with light spacing between groups; sidebar collapse preferences do not hide those tabs.

Grouped session tabs omit repeated project icons; running sessions retain their progress indicator, and unread activity or attention requests show a dot. Drafts and worktree sessions join their project, and different servers remain separate. Drag tabs within an expanded project to reorder them; keyboard cycling and numbered shortcuts retain the grouped order, including folded tabs.

## Customize the interface

The frontend uses the official v2.2.0 `@opencode/plugin/gui` SDK and plugin host. CodeArts Proxy is bundled through that host and contributes settings, commands and a session panel. Open **Settings → CodeArts Proxy** to configure it. Its existing native preferences and older browser-plugin configuration migrate once; gateway keys remain in memory. See [CodeArts Proxy](packages/codearts-proxy-extension/README.md).

The previous browser SDK, JSONC configuration importer, named slots, ZIP plugin loader and demo packages have been removed. Their manifests and archives cannot be installed in the official system. The old configuration is retained only as a source for CodeArts preferences migration.

Official external GUI bundles are discovered by the upstream desktop main-process bridge from the connected service. This frontend's web-based thin shell does not implement that main-process bridge; bundled GUI plugins run in both web and desktop. It does not claim external bundle installation or activate upstream main-process plugins.

## Search and browse conversation history

Click the search icon in an existing conversation, or press **Ctrl/Cmd+F**, to open a floating search box. On narrow screens the icon is in the floating controls above the composer. Matches in user and assistant text are highlighted; use the result buttons, Enter / Shift+Enter, or the arrow keys to switch matches. Escape, the close button, or a click outside dismisses search. Search covers loaded messages; **Load earlier messages** in the search box extends the searchable history without loading everything at once.

Short ticks in the conversation's left margin preview a sent prompt and its response on hover. Click the preview or click/drag the ticks to reveal that prompt; touch dragging works on narrow screens. When focused, the rail supports Up / Down, Home / End, and Page Up / Page Down. The history icon hides or shows the rail. The existing transcript control returns to the latest content. Navigation uses the virtualized timeline and excludes reverted prompts; toggling history or search keeps header controls in place.

## UX improvement roadmap

The [user experience optimization plan](docs/plans/README.md) has been implemented in focused source commits. See the [implementation and validation record](docs/plans/ux-results.md) for per-task evidence, reproducible measurements and pending live-service/macOS/Windows acceptance. These source changes are unreleased.

## Validate and build

```sh
bun run check
bun run build
```

The production static web files are in `packages/app/dist`. Serve them with an SPA fallback to `index.html`; hosting this frontend does not host an OpenCode service. The inherited PWA caches the static UI. Large syntax-highlighting chunks and CSS highlight warnings currently come from upstream.

The frontend and CodeArts plugin are type-checked. Focused tests cover gateway request disposal, legacy preferences, project identity migration, tab grouping and history navigation. Live backend connectivity requires a compatible running service.

## Layout

- `packages/app`: upstream Solid application and official GUI plugin host.
- `packages/plugin`: frontend-only official GUI SDK and RPC exports.
- `packages/gui-plugins`: upstream built-in GUI plugins.
- `packages/codearts-proxy-extension`: custom CodeArts Proxy plugin on the official SDK.
- `packages/session-ui`, `packages/ui`: upstream rendering and shared UI.
- `packages/client`, `packages/schema`, `packages/protocol`: shared v2 contract and generated client; no backend execution.
- `packages/util`: shared upstream utility sources used by the frontend.
- `packages/plugin-browser`: only the browser RPC schema referenced by the frontend.
- `scripts/desktop*`: thin Electron shell.

Upstream imports are declared in [import rules](upstream/import-rules.json) and pinned by a per-file [inventory](upstream/inventory.json). `bun run check` audits this boundary. Plugin panels and project grouping use the port-owned `packages/app/src/extensions` adapter layer. See the [maintenance workflow](docs/upstream-maintenance.md) for the read-only upgrade report and inventory recording commands.

The imported source is pinned to the upstream Git commit in `docs/upstream.json`. Future upstream ports should preserve `@opencode/client` generated files and update the app/UI/protocol snapshot together. GUI plugins use the official upstream SDK version.

The [CodeArts Proxy example](packages/codearts-proxy-extension/README.md) is a standard OpenCode v2 GUI renderer extension. Configure it under **Settings → CodeArts Proxy**; its panels and commands use the upstream extension SDK directly.

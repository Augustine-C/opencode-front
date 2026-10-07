# OpenCode Front

A frontend-only port of OpenCode v2 with a shared web/desktop UI plugin system. It attaches to an existing local or remote OpenCode service and preserves the upstream session, composer, review, file, model, permission, and terminal interface.

This repository is an independently maintained frontend-only port of [OpenCode v2](https://github.com/anomalyco/opencode), based on **2.0.24**, commit [`e7a34f0`](https://github.com/anomalyco/opencode/tree/e7a34f09bfd9134dfade5a8ddb843f7030bc9a69). The source was copied from the local `opencode-dev/opencode_v2` checkout. Upstream frontend code, shared client/protocol/schema code, assets, utilities, and dependency patches are retained; the browser plugin system, thin desktop shell, project discovery, and project tab grouping are additions in this port. See [source provenance](docs/upstream.json) and [attribution notice](NOTICE).

## License and attribution

OpenCode Front is released under the **MIT License**, matching the upstream OpenCode license. The original `Copyright (c) 2025 opencode` notice and full upstream license text are preserved unchanged in [LICENSE](LICENSE), along with the retained [UI package license](packages/ui/LICENSE). This project's additions and modifications use the same MIT license. Third-party dependencies and assets retain their own licenses and notices.

The production web build used by both web and desktop includes `LICENSE` and `NOTICE` at its root. Preserve these notices when redistributing the source or build.

## Run the web frontend

Requires Bun 1.3.14 or later (validated with 1.3.14).

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

Electron loads the same web build using `oc://renderer`, an origin already permitted by the v2 service. It uses a separate `opencode-front` profile, context isolation, and a sandboxed renderer. It has no bundled backend, sidecar, service manager, native SSH transport, native browser tooling, or auto-updater. This is a runnable desktop shell; signed installers and platform packaging are not included yet.

## Organize session tabs

In **Settings → General**, enable **Group tabs by project** beside the **Tabs** layout selector. The preference applies to both web and desktop and defaults to off. Vertical groups have sticky project headings and compact session rows; horizontal groups use compact project icons or initials, separators, and readable tab widths, with full project details on hover. Grouped session tabs omit repeated project icons; running sessions retain their progress indicator, and unread activity or attention requests show a dot. Drafts and worktree sessions join their project, and different servers remain separate. Drag tabs within a project to reorder them; keyboard cycling and numbered shortcuts follow the displayed order.

## Customize the interface

Open **Settings → Frontend plugins** to enable installed plugins or import a frontend/TUI JSON or JSONC configuration. The command palette opens the same settings page. Before connecting a service, the small settings icon on the connection screen opens the plugin controls.

For a panel preview, enable **Example panel**, open an existing session, and select **+ Add tab → Project overview** beside the Review / Context tabs (or **More → Project overview** on mobile). It opens as a tab alongside Review and Context, with sample status cards, an interactive checklist, notes, and the pane’s standard maximize control. No external endpoint is needed. Optional configuration is in [examples/panel-demo.jsonc](examples/panel-demo.jsonc).

The plugin SDK provides typed named slots, commands, session panels, the current service client, event subscriptions, persistent plugin storage, setup/cleanup, and render error isolation. A connection status plugin is enabled by default. An optional third-party status plugin demonstrates external status at several positions and a details panel.

TUI configuration can select explicitly installed browser adapters and reuse their options. Terminal JSX needs a browser renderer; arbitrary TUI packages cannot execute unchanged in the browser. Unsupported packages are reported. See the [plugin API and adapter guide](docs/plugin-system.md).

## Validate and build

```sh
bun run check
bun run build
```

The production static web files are in `packages/app/dist`. Serve them with an SPA fallback to `index.html`; hosting this frontend does not host an OpenCode service. The inherited PWA caches the static UI. Large syntax-highlighting chunks and CSS highlight warnings currently come from upstream.

The frontend and plugin SDK are type-checked. Focused tests cover lifecycle cleanup, interrupted setup, setup failure isolation, contribution resolution, configuration adaptation, and panel ownership. Live backend connectivity requires a compatible running service.

## Layout

- `packages/app`: upstream Solid application with frontend plugin host integration.
- `packages/frontend-plugin`: browser SDK, configuration adaptation, lifecycle, and slot resolution.
- `packages/session-ui`, `packages/ui`: upstream rendering and shared UI.
- `packages/client`, `packages/schema`, `packages/protocol`: shared v2 contract and generated client; no backend execution.
- `packages/util`: shared upstream utility sources used by the frontend.
- `packages/plugin-browser`: only the browser RPC schema referenced by the frontend.
- `scripts/desktop*`: thin Electron shell.

Upstream imports are declared in [import rules](upstream/import-rules.json) and pinned by a per-file [inventory](upstream/inventory.json). `bun run check` audits this boundary. Plugin panels and project grouping use the port-owned `packages/app/src/extensions` adapter layer. See the [maintenance workflow](docs/upstream-maintenance.md) for the read-only upgrade report and inventory recording commands.

The original `opencode-dev` checkout is unchanged. Future upstream ports should preserve `@opencode/client` generated files and update the app/UI/protocol snapshot together. The frontend plugin API has its own version independent of the service version.

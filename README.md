# OpenCode Front

A frontend-only port of OpenCode v2 with a shared web/desktop UI plugin system. It attaches to an existing local or remote OpenCode service and preserves the upstream session, composer, review, file, model, permission, and terminal interface.

The source snapshot is OpenCode **2.0.20**, commit `84c9be93a56304a108f1a22df0c5d62c26d5b6ca`, from the local `opencode-dev/opencode_v2` checkout. See [provenance](docs/upstream.json). Upstream MIT notices and required frontend dependency patches are retained.

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

## Customize the interface

Open **Frontend plugins** on the connection screen or at the bottom of the application. It is also available in the command palette. Enable installed plugins or import a frontend/TUI JSON or JSONC configuration.

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

The original `opencode-dev` checkout is unchanged. Future upstream ports should preserve `@opencode/client` generated files and update the app/UI/protocol snapshot together. The frontend plugin API has its own version independent of the service version.

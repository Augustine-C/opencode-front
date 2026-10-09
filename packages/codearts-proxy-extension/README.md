# CodeArts Proxy GUI extension

A standard OpenCode v2 **renderer extension**, using `@opencode/gui-extensions/sdk` directly. It has no dependency on `@opencode/frontend-plugin`, app imports, custom slots or the port's panel bridge. Targets the v2.0.24 SDK and the host's Solid runtime.

## Use in this frontend

Open **Settings → CodeArts Proxy** and enable the overview. Set the proxy address and refresh interval (seconds; default 60, minimum 5). Existing saved `codearts-proxy` browser-plugin configuration imports automatically once, including its enabled/disabled state, `baseURL` and interval. Other browser-plugin settings remain intact.

In an existing session, use **+ Add tab → CodeArts Proxy overview**, **More** on mobile, or the **Open CodeArts Proxy overview** command. Settings and refresh commands also appear in the palette. The overview displays the same account, gateway, benefit and package data as the earlier browser example. Native tabs retain session ownership and close/reopen behavior, and use the host's standard panel geometry. The port's custom browser-plugin fullscreen toolbar is not used.

The address and interval are persisted through a declared native `Store.global`. The gateway key stays in memory until the overview is disabled or the extension is disposed/reloaded. Closing the panel stops polling and cancels in-flight queries; the refresh command can still issue one query while it is closed. Disabling withdraws menus, commands and panels and clears the key. On mobile, opening uses the native panel selection behavior.

## Anatomy

- `src/index.ts`: `Extension.define`, declared preference store and English catalog.
- `src/renderer.tsx`: native `Panel`, `MenuItem`, `Command`, `SettingsPage` and `Style` contributions.
- `src/page.tsx`, `src/settings.tsx`: lazy UI using the native extension context.
- `src/model.ts`, `src/api.ts`: request lifetime, polling and response validation.
- `src/preferences.ts`: schema and one-time legacy configuration migration.

The frontend composes the package in `packages/app/src/extensions/native.ts` and passes that list to its existing native extension host. It is an explicit bundled extension, rather than a browser-plugin configuration entry.

## Use in another OpenCode v2 build

Include this package's source and dependencies in the build, then import its default definition into the renderer extension composition:

```ts
import codeartsProxy from "@opencode-front/codearts-proxy-extension"
import { Extension } from "@opencode/gui-extensions/sdk"

export const extensions = Extension.compose(codeartsProxy)
// Compose it together with that build's other renderer extension definitions.
```

The manifest supplies its renderer entry. There is no Electron main entry or IPC dependency, so it works in both web and desktop renderers. For direct source integration, place the folder under the upstream GUI extensions package and add the definition to its renderer composition. Use the host's SDK, UI and Solid packages; do not bundle a second Solid runtime. CSS `?inline` imports require the host's Vite processing.

This repository does not implement loading external GUI renderer bundles through `.ocdx`. The package is ready for source/build-time integration, not a claim of runtime marketplace installation.

## Gateway requirements

Use the CodeArts Proxy desktop gateway with `GET /api/overview`. Older desktop builds and the Node CLI do not expose the required account/usage response. The frontend does not install, start, stop or restart the gateway.

Addresses may be gateway roots or `/v1` URLs. Requests omit browser credentials, reject redirects, and send only an explicitly entered gateway key; OpenCode credentials are never forwarded. The gateway must allow the renderer origin through CORS. Missing quota data stays Unavailable, real zero usage stays zero, and benefit/package failures remain separate. The extension only reads status and usage.

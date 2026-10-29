# CodeArts Proxy GUI plugin

Uses the official OpenCode v2.2.0 `@opencode/plugin/gui` API. Its declaration is `Plugin.define`; its renderer contributes `SettingsPage`, `Command`, `MenuItem`, `Style` and a session panel. The host assigns `codearts-proxy` through official `compose` in `packages/app/src/extensions/native.ts`. Heavy UI remains lazy.

Open **Settings → CodeArts Proxy** and enable the overview. Configure the gateway address and refresh interval (default 60 seconds, minimum 5). In a session, select **+ Add tab → CodeArts Proxy overview** or its command. The host owns session panels and mobile selection.

The official built-in migration helpers copy existing `extension.codearts-proxy.preferences` to the new plugin store and import older `opencode-front.plugins.v1` options once. The old panel key `plugin-panel:codearts-proxy/overview` maps to the overview tab. Existing storage is not deleted. Legacy helpers are used because this plugin is bundled with the frontend; they are not part of the public external-bundle API.

Gateway keys remain in memory and clear on disposal or disabling. Closing the panel cancels polling and in-flight queries; the refresh command can query while closed. Requests use only explicitly entered gateway credentials, omit cookies, and reject redirects. The gateway must expose `GET /api/overview` and permit the renderer origin through CORS. Unknown quotas and partial upstream failures remain distinct from zero usage.

This package is integrated at build time with the official host in both web and the thin desktop shell. The release includes its source archive. External GUI installation requires the upstream desktop main-process plugin bridge, which this shell does not implement. It does not run a main-process plugin or manage the gateway/backend.

# Frontend plugin examples

This source module contains two reference adapters for the OpenCode Front frontend plugin API:

- `panel-demo` shows a local session panel, a command, panel registration, and Solid state.
- `third-party-status` shows an opt-in HTTP status panel with request cancellation and polling cleanup.

These examples ship as the separate `opencode-front-example-plugins-<version>.zip` asset on each desktop GitHub release. They are not imported into or bundled with the desktop application.

## Use in a source build

The current frontend loads trusted adapters from an explicit build-time catalog. To try the examples in a source checkout, import them from `examples/frontend-plugins/src` in `packages/app/src/plugins/catalog.ts`:

```ts
import type { Definition } from "@opencode/frontend-plugin"
import type { useLanguage } from "@/runtime/i18n/language"
import { panelDemo, thirdPartyStatus } from "../../../../examples/frontend-plugins/src"

export function createCatalog(_language: ReturnType<typeof useLanguage>): Definition[] {
  return [thirdPartyStatus(), panelDemo()]
}
```

Both adapters use `@opencode/frontend-plugin` and the host's `solid-js` runtime. Keep Solid as a host peer; do not bundle a second runtime. Importing an adapter makes it available in **Settings → Frontend plugins**; the user still chooses whether to enable it.

## Third-party status options

Enable the adapter with a JSON or JSONC plugin configuration:

```json
{
  "plugins": [
    "connection-status",
    {
      "package": "third-party-status",
      "options": {
        "endpoint": "https://your-service.example/status",
        "interval": 60000
      }
    }
  ]
}
```

The endpoint must allow the frontend origin through CORS and return `{ "label": "Build queue", "value": "3 pending" }`. The adapter omits browser credentials and never forwards OpenCode authorization. It makes no request until an endpoint is supplied, and cancels its request and timer when disabled.

## Example panel options

Enable `panel-demo` for a session and choose **+ Add tab → Project overview**, **More** on mobile, or **Open example plugin panel** in the command palette. The panel demonstrates a session-scoped checklist, notes, progress display, a configurable title and panel presentation, and a reset action. It makes no network request or backend change.

```json
{
  "plugins": [
    "connection-status",
    {
      "package": "panel-demo",
      "options": {
        "title": "Project overview",
        "presentation": "panel",
        "showLauncher": true
      }
    }
  ]
}
```

The samples use English copy to keep the API examples focused. Adapt their labels for your application before distributing them.

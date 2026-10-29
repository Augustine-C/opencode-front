# GUI plugins (v2.2.0)

The custom browser plugin SDK and loader were removed in v2.2.0. The frontend now imports the official `@opencode/plugin/gui` SDK and `packages/app/src/runtime/plugin` host. Old browser manifests, ZIP archives and JSONC plugin configuration do not run on the new host.

CodeArts Proxy is registered through official `compose` alongside upstream built-ins. See [the plugin guide](../packages/codearts-proxy-extension/README.md) for settings, lifecycle, storage migration and deployment limits. Settings, panels and commands all belong to the official host; there is no compatibility runtime for old plugins.

The thin shell runs renderer plugins bundled with this frontend. Loading external `./gui-experimental` bundles needs the upstream desktop main-process bridge and is not implemented here. Existing backend processes and credentials remain externally managed.

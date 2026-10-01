import { resolveSlots } from "@opencode/frontend-plugin/structure"
import { createContext, createEffect, createMemo, onCleanup, onMount, useContext, type ParentProps } from "solid-js"
import { createStore } from "solid-js/store"
import { useLocation } from "@solidjs/router"
import { createPluginHost } from "@opencode/frontend-plugin/host"
import { adaptConfig, type ResolvedPlugin } from "@opencode/frontend-plugin/config"
import { useGlobal } from "@/runtime/server/runtime"
import { ServerConnection } from "@/runtime/server/registry"
import { useCommand } from "@/shell/commands/command"
import { useLanguage } from "@/runtime/i18n/language"
import { useDialog } from "@opencode/ui/context/dialog"
import { decode64 } from "@/runtime/persistence/base64"
import { PluginManager } from "./manager"
import { connectionStatus } from "./builtin/connection-status"
import { createCatalog } from "./catalog"
import pkg from "../../package.json"

const Context = createContext<ReturnType<typeof createPlugins>>()
const configKey = "opencode-front.plugins.v1"
function createPlugins() {
  const global = useGlobal()
  const location = useLocation()
  const command = useCommand()
  const language = useLanguage()
  const dialog = useDialog()
  const [state, setState] = createStore({
    paths: [] as string[],
    config: [] as ResolvedPlugin[],
    unsupported: [] as string[],
  })
  const counts = new Map<string, number>()
  const route = createMemo(() => /^\/server\/([^/]+)\/session\/([^/]+)$/.exec(location.pathname))
  const server = createMemo(() => {
    const key = decode64(route()?.[1])
    if (key) return global.servers.list().find((item) => ServerConnection.key(item) === key)
    // Home has no selected service; a single configured server is unambiguous.
    const list = global.servers.list()
    return list.length === 1 ? list[0] : undefined
  })
  const current = () => {
    const conn = server()
    return conn ? global.ensureServerCtx(conn) : undefined
  }
  const host = createPluginHost({
    storage: localStorage,
    context: {
      app: { version: pkg.version, platform: navigator.userAgent.includes("Electron/") ? "desktop" : "web" },
      client: () => current()?.sdk.api,
      sessionID: () => route()?.[2],
      connection: () => {
        const conn = server()
        if (!conn) return
        const key = ServerConnection.key(conn)
        return { key, url: conn.http.url, healthy: global.servers.health[key]?.healthy ?? false }
      },
      data: {
        listen(handler) {
          // Resubscribe when selected service changes; events from another service cannot leak into this plugin.
          let stop: (() => void) | undefined
          createEffect(() => {
            stop?.()
            stop = current()?.sdk.event.listen(handler)
          })
          return () => stop?.()
        },
      },
    },
  })
  const resolution = createMemo(() => resolveSlots({ paths: new Set(state.paths), claims: host.state.claims }))
  const available = [connectionStatus(language), ...createCatalog(language)]
  available.forEach(host.register)
  let disposed = false
  async function apply(entries: ResolvedPlugin[]) {
    if (disposed) return
    for (const plugin of host.definitions()) await host.disable(plugin.id)
    for (const entry of entries) {
      if (disposed) return
      if (entry.enabled) await host.enable(entry.id, entry.options)
    }
  }
  // Serialize changes so an earlier asynchronous setup cannot overwrite the latest configuration.
  let pending = Promise.resolve()
  function save(entries: ResolvedPlugin[]) {
    localStorage.setItem(
      configKey,
      JSON.stringify({
        plugins: entries.map((entry) => ({
          package: `${entry.enabled ? "" : "-"}${entry.id}`,
          options: entry.options,
        })),
      }),
    )
    setState("config", entries)
    pending = pending.then(() => apply(entries))
    return pending
  }
  command.register("frontend-plugins", () => [
    {
      id: "plugins.manage",
      title: language.t("plugins.title"),
      category: language.t("plugins.title"),
      onSelect: () => dialog.show(() => <PluginManager plugins={api} />),
    },
    ...host.state.commands.map((entry) => ({
      id: `plugin.${entry.id}`,
      title: entry.title,
      category: language.t("plugins.title"),
      onSelect: () => {
        void Promise.resolve()
          .then(entry.run)
          .catch((error) => host.report(entry.plugin, error))
      },
    })),
  ])
  onMount(() => {
    try {
      const saved = localStorage.getItem(configKey)
      const result = adaptConfig(saved ? JSON.parse(saved) : { plugins: ["connection-status"] }, available)
      setState({ config: result.plugins, unsupported: result.unsupported })
      pending = apply(result.plugins)
    } catch (error) {
      host.report("configuration", error)
    }
  })
  onCleanup(() => {
    disposed = true
    void host.dispose()
  })
  const api = {
    host,
    state,
    resolution,
    sessionID: () => route()?.[2],
    mount(path: string) {
      counts.set(path, (counts.get(path) ?? 0) + 1)
      if (counts.get(path) === 1) setState("paths", [...counts.keys()])
      return () => {
        const count = (counts.get(path) ?? 1) - 1
        if (count) {
          counts.set(path, count)
          return
        }
        counts.delete(path)
        setState("paths", [...counts.keys()])
      }
    },
    toggle(id: string, enabled: boolean) {
      if (disposed) return
      const existing = state.config.find((entry) => entry.id === id)
      return save(
        existing
          ? state.config.map((entry) => (entry.id === id ? { ...entry, enabled } : entry))
          : [...state.config, { id, package: id, options: {}, enabled }],
      )
    },
    importConfig(value: unknown) {
      const result = adaptConfig(value, available)
      setState("unsupported", result.unsupported)
      return save(result.plugins)
    },
    open: () => dialog.show(() => <PluginManager plugins={api} />),
  }
  return api
}
export type PluginsApi = ReturnType<typeof createPlugins>
export function PluginsProvider(props: ParentProps) {
  const value = createPlugins()
  return <Context.Provider value={value}>{props.children}</Context.Provider>
}
export function usePlugins() {
  const context = useContext(Context)
  if (!context) throw new Error("PluginsProvider is missing")
  return context
}

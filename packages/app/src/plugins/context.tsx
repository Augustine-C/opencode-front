import { resolveSlots } from "@opencode/frontend-plugin/structure"
import {
  createContext,
  createEffect,
  createMemo,
  onCleanup,
  onMount,
  useContext,
  type ParentProps,
} from "solid-js"
import { createStore } from "solid-js/store"
import { useLocation } from "@solidjs/router"
import { createPluginHost } from "@opencode/frontend-plugin/host"
import { pluginStoragePrefix } from "@opencode/frontend-plugin/storage"
import {
  adaptConfig,
  previewConfig,
  type ResolvedPlugin,
} from "@opencode/frontend-plugin/config"
import { useGlobal } from "@/runtime/server/runtime"
import { ServerConnection } from "@/runtime/server/registry"
import { useCommand } from "@/shell/commands/command"
import { useLanguage } from "@/runtime/i18n/language"
import { useDialog } from "@opencode/ui/context/dialog"
import { decode64 } from "@/runtime/persistence/base64"
import {
  createIndependentPluginRepository,
  type IndependentPluginRepository,
  type PluginInstallationInfo,
} from "./independent/repository"
import {
  capturePluginData as captureDataSnapshot,
  prepareIndependentActivationData as prepareActivationData,
  settleIndependentActivation as settleActivation,
} from "./independent/activation"
import {
  createIndependentPluginDefinition,
  exposeSharedPluginRuntime,
} from "./independent/loader"
import { PluginManager } from "./manager"
import { connectionStatus } from "./builtin/connection-status"
import { createCatalog } from "./catalog"
import pkg from "../../package.json"

const Context = createContext<ReturnType<typeof createPlugins>>()
const configKey = "opencode-front.plugins.v1"
const skipIndependentKey = "opencode-front.plugins.skip-independent-once"
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
  const [independent, setIndependent] = createStore({
    installations: [] as PluginInstallationInfo[],
    storageError: "",
    skippedForRecovery: false,
  })
  const counts = new Map<string, number>()
  const route = createMemo(() =>
    /^\/server\/([^/]+)\/session\/([^/]+)$/.exec(location.pathname),
  )
  const server = createMemo(() => {
    const key = decode64(route()?.[1])
    if (key)
      return global.servers
        .list()
        .find((item) => ServerConnection.key(item) === key)
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
      app: {
        version: pkg.version,
        platform: navigator.userAgent.includes("Electron/") ? "desktop" : "web",
      },
      client: () => current()?.sdk.api,
      sessionID: () => route()?.[2],
      connection: () => {
        const conn = server()
        if (!conn) return
        const key = ServerConnection.key(conn)
        return {
          key,
          url: conn.http.url,
          name:
            conn.displayName || URL.parse(conn.http.url)?.host || conn.http.url,
          healthy: global.servers.health[key]?.healthy ?? false,
        }
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
  const resolution = createMemo(() =>
    resolveSlots({ paths: new Set(state.paths), claims: host.state.claims }),
  )
  const builtins = [connectionStatus(language), ...createCatalog(language)]
  builtins.forEach(host.register)
  const available = () => [...builtins, ...host.definitions()]
  let repository: IndependentPluginRepository | undefined
  let unsubscribeRepository: (() => void) | undefined
  const registered = new Map<
    string,
    {
      digest: string
      definition: ReturnType<typeof createIndependentPluginDefinition>
    }
  >()
  let refreshQueue = Promise.resolve<PluginInstallationInfo[]>([])
  let openSettings: (() => void) | undefined
  let disposed = false
  function capturePluginData(id: string, digest: string, version: number) {
    return captureDataSnapshot(localStorage, id, digest, version)
  }
  async function prepareIndependentActivationData(id: string) {
    if (!repository) return
    await prepareActivationData(repository, localStorage, id)
  }
  async function settleIndependentActivation(id: string, restorePrevious = false) {
    if (!repository) return
    const result = await settleActivation({
      repository,
      storage: localStorage,
      host,
      id,
      restorePrevious,
    })
    if (result !== "rolled-back") return
    await refreshIndependent()
    const restored = independent.installations.find((entry) => entry.id === id)
    const config = state.config.find((entry) => entry.id === id)
    if (restored?.enabled && config?.enabled)
      startPlugin(id, config.options)
  }
  function startPlugin(id: string, options: Record<string, unknown>) {
    // Setup may never settle. Configuration operations only wait for repository changes,
    // while each instance owns its asynchronous activation and cancellation.
    void host
      .enable(id, options)
      .then(async () => {
        if (registered.has(id)) await settleIndependentActivation(id)
      })
      .catch((error) => host.report(id, error))
  }
  async function apply(
    entries: ResolvedPlugin[],
    options: { skipIndependent?: boolean } = {},
  ) {
    if (disposed) return
    for (const plugin of host.definitions()) await host.disable(plugin.id)
    for (const entry of entries) {
      if (disposed) return
      if (options.skipIndependent && registered.has(entry.id)) continue
      if (entry.enabled) {
        if (registered.has(entry.id)) {
          try {
            await prepareIndependentActivationData(entry.id)
          } catch (error) {
            host.report(entry.id, error)
            continue
          }
        }
        startPlugin(entry.id, entry.options)
      }
    }
  }

  function refreshIndependent() {
    if (!repository || disposed)
      return Promise.resolve([] as PluginInstallationInfo[])
    const operation = refreshQueue
      .catch(() => [])
      .then(async () => {
        const current = repository
        if (!current || disposed) return []
        const entries = await current.list()
        const byID = new Map(entries.map((entry) => [entry.id, entry]))
        for (const [id, active] of [...registered]) {
          if (
            byID.get(id)?.activeDigest === active.digest &&
            byID.get(id)?.healthy
          )
            continue
          await host.unregister(id, active.definition)
          registered.delete(id)
        }
        const normalized = [...entries]
        for (const entry of entries) {
          if (!entry.healthy || registered.has(entry.id)) continue
          try {
            const active = await current.active(entry.id)
            if (!active) continue
            const definition = createIndependentPluginDefinition({
              repository: current,
              id: entry.id,
              name: active.module.manifest.name,
              digest: active.record.activeDigest,
            })
            host.register(definition)
            registered.set(entry.id, {
              digest: active.record.activeDigest,
              definition,
            })
          } catch (error) {
            const detail =
              error instanceof Error ? error.message : String(error)
            const index = normalized.findIndex((item) => item.id === entry.id)
            if (index >= 0)
              normalized[index] = { ...entry, healthy: false, problem: detail }
            host.report(entry.id, error)
          }
        }
        setIndependent("installations", normalized)
        return normalized
      })
    refreshQueue = operation
    return operation
  }

  function mergeInstallationPreferences(
    entries: ResolvedPlugin[],
    installations: PluginInstallationInfo[],
  ) {
    const result = new Map(entries.map((entry) => [entry.id, entry]))
    for (const installed of installations) {
      if (!installed.healthy) continue
      const existing = result.get(installed.id)
      result.set(
        installed.id,
        existing
          ? { ...existing, enabled: installed.enabled }
          : {
              id: installed.id,
              package: installed.id,
              options: {},
              enabled: installed.enabled,
            },
      )
    }
    return [...result.values()]
  }
  function persistConfig(entries: ResolvedPlugin[]) {
    localStorage.setItem(
      configKey,
      JSON.stringify({
        plugins: entries.map((entry) => ({
          package: `${entry.enabled ? "" : "-"}${entry.id}`,
          options: entry.options,
        })),
      }),
    )
  }
  const independentSyncs = new Map<string, Promise<void>>()
  function syncIndependent(id: string) {
    const existing = independentSyncs.get(id)
    if (existing) return existing
    const operation = (async () => {
      const installation = independent.installations.find(
        (entry) => entry.id === id,
      )
      if (!installation) {
        if (builtins.some((plugin) => plugin.id === id)) return
        const entries = state.config.filter((entry) => entry.id !== id)
        if (entries.length !== state.config.length) {
          setState("config", entries)
          persistConfig(entries)
        }
        return
      }
      if (!installation?.healthy) return
      const current = state.config.find((entry) => entry.id === id)
      const entry = current
        ? { ...current, enabled: installation.enabled }
        : {
            id,
            package: id,
            options: {},
            enabled: installation.enabled,
          }
      const entries = current
        ? state.config.map((value) => (value.id === id ? entry : value))
        : [...state.config, entry]
      if (!current || current.enabled !== installation.enabled) {
        setState("config", entries)
        persistConfig(entries)
      }
      const status = host.state.statuses.find((value) => value.id === id)?.state
      if (installation.enabled) {
        if (status === "disabled") {
          try {
            await prepareIndependentActivationData(id)
          } catch (error) {
            host.report(id, error)
            return
          }
          startPlugin(id, entry.options)
        }
      } else if (status !== "disabled") {
        await host.disable(id)
      }
    })()
    const tracked = operation.finally(() => {
      if (independentSyncs.get(id) === tracked) independentSyncs.delete(id)
    })
    independentSyncs.set(id, tracked)
    return tracked
  }
  // Serialize persisted preferences, without waiting for third-party setup.
  let pending = Promise.resolve()
  function save(entries: ResolvedPlugin[]) {
    pending = pending
      .catch(() => {})
      .then(async () => {
        if (repository) {
          const installations = await repository.list()
          for (const installed of installations) {
            const configured = entries.find(
              (entry) => entry.id === installed.id,
            )
            const enabled = configured?.enabled ?? false
            if (enabled !== installed.enabled) {
              await repository.setEnabled(installed.id, enabled)
            }
          }
        }
        persistConfig(entries)
        setState("config", entries)
        await apply(entries)
      })
    return pending
  }
  command.register("frontend-plugins", () => [
    {
      id: "plugins.manage",
      title: language.t("plugins.title"),
      category: language.t("plugins.title"),
      onSelect: () => api.open(),
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
    void (async () => {
      const skippedForRecovery =
        sessionStorage.getItem(skipIndependentKey) === "1"
      if (skippedForRecovery) sessionStorage.removeItem(skipIndependentKey)
      setIndependent("skippedForRecovery", skippedForRecovery)
      try {
        repository = createIndependentPluginRepository()
        exposeSharedPluginRuntime()
        unsubscribeRepository = repository.subscribe((id) => {
          void refreshIndependent()
            .then(async () => {
              await pending
              await syncIndependent(id)
            })
            .catch((error) => setIndependent("storageError", String(error)))
        })
        await refreshIndependent()
      } catch (error) {
        setIndependent(
          "storageError",
          error instanceof Error ? error.message : String(error),
        )
      }
      try {
        const saved = localStorage.getItem(configKey)
        const result = adaptConfig(
          saved ? JSON.parse(saved) : { plugins: ["connection-status"] },
          available(),
        )
        const entries = mergeInstallationPreferences(
          result.plugins,
          independent.installations,
        )
        setState({ config: entries, unsupported: result.unsupported })
        pending = apply(entries, { skipIndependent: skippedForRecovery })
      } catch (error) {
        host.report("configuration", error)
      }
    })()
  })
  onCleanup(() => {
    disposed = true
    unsubscribeRepository?.()
    void repository?.close()
    void host.dispose()
  })
  const api = {
    host,
    state,
    independent,
    resolution,
    repository: () => repository,
    refreshIndependent,
    skipIndependentOnce() {
      sessionStorage.setItem(skipIndependentKey, "1")
      window.location.reload()
    },
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
      if (!enabled) void host.disable(id)
      const existing = state.config.find((entry) => entry.id === id)
      return save(
        existing
          ? state.config.map((entry) =>
              entry.id === id ? { ...entry, enabled } : entry,
            )
          : [...state.config, { id, package: id, options: {}, enabled }],
      )
    },
    previewConfig(value: unknown) {
      return previewConfig(value, available(), state.config)
    },
    importConfig(value: unknown) {
      const result = adaptConfig(value, available())
      setState("unsupported", result.unsupported)
      return save(result.plugins)
    },
    async installIndependent(file: Blob) {
      if (!repository) throw new Error("Plugin storage is unavailable")
      const preview = await repository.preview(file)
      if (preview.conflict) throw new Error(preview.conflict)
      if (builtins.some((plugin) => plugin.id === preview.manifest.id))
        throw new Error("An installed frontend plugin already uses this ID")
      const installed = await repository.install(file)
      await refreshIndependent()
      return installed
    },
    async activateIndependent(id: string) {
      if (!repository) throw new Error("Plugin storage is unavailable")
      await pending.catch(() => {})
      const before = await repository.active(id)
      if (!before?.record.candidateDigest)
        throw new Error(`Plugin ${id} has no staged update`)
      const snapshot = capturePluginData(
        id,
        before.record.activeDigest,
        before.module.manifest.storageVersion ?? 1,
      )
      await host.disable(id)
      await repository.activateCandidate(id, snapshot)
      await prepareIndependentActivationData(id)
      await refreshIndependent()
      await syncIndependent(id)
    },
    async reloadIndependentDevelopment(id: string, file: Blob) {
      if (!import.meta.env.DEV)
        throw new Error(
          "Development plugin reload is available only in dev builds",
        )
      if (!repository) throw new Error("Plugin storage is unavailable")
      await pending.catch(() => {})
      const installation = (await repository.list()).find(
        (entry) => entry.id === id,
      )
      if (!installation?.enabled)
        throw new Error(
          "Enable the plugin before reloading its development build",
        )
      await repository.installDevelopment(id, file)
      await refreshIndependent()
      await api.activateIndependent(id)
    },
    async restoreIndependent(id: string) {
      if (!repository) throw new Error("Plugin storage is unavailable")
      await pending.catch(() => {})
      const before = await repository.active(id)
      if (!before?.record.previousDigest)
        throw new Error(`Plugin ${id} has no previous version to restore`)
      if (before.record.activationPending) {
        // A cancelled setup has never validated the candidate or its partially migrated data.
        // Restore the known version and snapshot instead of starting another version switch.
        await settleIndependentActivation(id, true)
        return
      }
      const snapshot = capturePluginData(
        id,
        before.record.activeDigest,
        before.module.manifest.storageVersion ?? 1,
      )
      await host.disable(id)
      await repository.restorePrevious(id, snapshot)
      await prepareIndependentActivationData(id)
      await refreshIndependent()
      await syncIndependent(id)
    },
    async discardIndependentUpdate(id: string) {
      if (!repository) throw new Error("Plugin storage is unavailable")
      return repository.discardCandidate(id)
    },
    async removeIndependent(id: string, removeData: boolean) {
      if (!repository) throw new Error("Plugin storage is unavailable")
      await host.disable(id)
      await pending.catch(() => {})
      // A queued configuration change may have started another generation.
      await host.unregister(id)
      if (!(await repository.remove(id))) return false
      const entries = state.config.filter((entry) => entry.id !== id)
      setState("config", entries)
      persistConfig(entries)
      if (removeData) {
        const prefix = pluginStoragePrefix(id)
        for (let index = localStorage.length - 1; index >= 0; index--) {
          const key = localStorage.key(index)
          if (key?.startsWith(prefix)) localStorage.removeItem(key)
        }
      }
      await refreshIndependent()
      return true
    },
    async resumeIndependent() {
      setIndependent("skippedForRecovery", false)
      await apply(state.config)
    },
    attachSettings(open: () => void) {
      openSettings = open
      return () => {
        if (openSettings === open) openSettings = undefined
      }
    },
    open() {
      if (openSettings) openSettings()
      else dialog.show(() => <PluginManager plugins={api} />)
    },
  }
  return api
}
export type PluginsApi = ReturnType<typeof createPlugins>
export function PluginsProvider(props: ParentProps) {
  const value = createPlugins()
  return <Context.Provider value={value}>{props.children}</Context.Provider>
}
export function PluginScope(props: ParentProps<{ value: PluginsApi }>) {
  return (
    <Context.Provider value={props.value}>{props.children}</Context.Provider>
  )
}
export function usePlugins() {
  const context = useContext(Context)
  if (!context) throw new Error("PluginsProvider is missing")
  return context
}

import { pluginStoragePrefix } from "@opencode/frontend-plugin/storage"
import * as solid from "solid-js"
import * as web from "solid-js/web"
import * as store from "solid-js/store"
import type {
  Context as PluginContext,
  JSX,
  SlotMap,
} from "@opencode/frontend-plugin"
import { createPluginHost } from "@opencode/frontend-plugin/host"
import { createIndependentPluginRepository } from "../../src/plugins/independent/repository"
import {
  createIndependentPluginDefinition,
  exposeSharedPluginRuntime,
} from "../../src/plugins/independent/loader"

const Context = solid.createContext<string>()
let dispose: (() => void) | undefined

declare global {
  interface Window {
    installProbe: () => Promise<void>
    updateProbe: () => void
    cleanupProbe: () => void
    probeCleanups: number
    probeAssetUrl: string
    independentPackage: Uint8Array
    pluginAcceptance: {
      ready: Promise<void>
      previewZip: () => Promise<Record<string, unknown>>
      installZip: () => Promise<void>
      runCommand: () => Promise<void>
      openPanel: () => boolean
      disable: () => Promise<void>
      uninstall: (removeData: boolean) => Promise<void>
      snapshot: () => Record<string, unknown>
      installationCount: () => Promise<number>
    }
  }
}

window.probeCleanups = 0
window.installProbe = async () => {
  const source = [
    "export default function createPlugin(runtime) {",
    "  return { setup() {",
    "    const value = runtime.solid.useContext(runtime.context)",
    "    const [state, setState] = runtime.store.createStore({ value })",
    "    const root = document.createElement('div')",
    "    root.dataset.pluginRoot = 'ip00'",
    "    const content = document.createElement('span')",
    "    content.dataset.probe = 'shared-solid'",
    "    root.append(content)",
    "    const image = new Image()",
    "    image.dataset.probeAsset = 'true'",
    "    image.src = runtime.assetUrl",
    "    root.append(image)",
    "    const stylesheet = document.createElement('link')",
    "    stylesheet.rel = 'stylesheet'",
    "    stylesheet.dataset.probeStyle = 'true'",
    "    stylesheet.href = runtime.styleUrl",
    "    document.head.append(stylesheet)",
    "    runtime.web.insert(content, () => state.value)",
    "    runtime.solid.createEffect(() => { root.dataset.value = state.value })",
    "    runtime.update = () => setState('value', 'updated')",
    "    runtime.solid.onCleanup(() => { stylesheet.remove(); URL.revokeObjectURL(runtime.assetUrl); URL.revokeObjectURL(runtime.styleUrl); runtime.cleanups.value += 1 })",
    "    return root",
    "  } }",
    "}",
  ].join("\n")
  const url = URL.createObjectURL(
    new Blob([source], { type: "text/javascript" }),
  )
  const module = await import(/* @vite-ignore */ url)
  URL.revokeObjectURL(url)
  const assetUrl = URL.createObjectURL(
    new Blob(
      ['<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>'],
      { type: "image/svg+xml" },
    ),
  )
  const styleUrl = URL.createObjectURL(
    new Blob(
      [
        '[data-plugin-root="ip00"] [data-probe="shared-solid"] { color: rgb(1, 2, 3) }',
      ],
      {
        type: "text/css",
      },
    ),
  )
  window.probeAssetUrl = assetUrl
  const runtime = {
    solid,
    web,
    store,
    context: Context,
    assetUrl,
    styleUrl,
    cleanups: {
      get value() {
        return window.probeCleanups
      },
      set value(value: number) {
        window.probeCleanups = value
      },
    },
    update: () => {},
  }
  const plugin = module.default(runtime)
  const root = document.getElementById("root")!
  dispose = web.render(
    () =>
      web.createComponent(Context.Provider, {
        value: "shared",
        get children() {
          return plugin.setup()
        },
      }),
    root,
  )
  window.updateProbe = runtime.update
  window.cleanupProbe = () => {
    dispose?.()
    dispose = undefined
  }
}

const pluginID = "example.hello"
const repository = createIndependentPluginRepository({ channel: null })
const pluginHost = createPluginHost({
  storage: localStorage,
  context: {
    app: { version: "e2e", platform: "web" },
    client: () => undefined,
    sessionID: () => "independent-plugin-e2e",
    connection: () => undefined,
    data: { listen: () => () => {} },
  },
})
const pluginDefinitions = new Map<
  string,
  ReturnType<typeof createIndependentPluginDefinition>
>()
let disposeSlot: (() => void) | undefined
let previewResult: Record<string, unknown> | undefined

async function loadInstalled() {
  const installed = await repository.active(pluginID)
  if (!installed) return
  let definition = pluginDefinitions.get(pluginID)
  if (!definition) {
    definition = createIndependentPluginDefinition({
      repository,
      id: pluginID,
      name: installed.module.manifest.name,
      digest: installed.record.activeDigest,
    })
    pluginDefinitions.set(pluginID, definition)
    pluginHost.register(definition)
  }
  if (installed.record.enabled) await pluginHost.enable(pluginID)
  mountPluginSlot()
}

function clearPluginSlot() {
  disposeSlot?.()
  disposeSlot = undefined
  document.getElementById("plugin-slot")?.replaceChildren()
}

function mountPluginSlot() {
  clearPluginSlot()
  const claim = pluginHost.state.claims.find(
    (value) => value.plugin === pluginID,
  )
  const container = document.getElementById("plugin-slot")
  if (!claim || !container) return
  const scoped = document.createElement("div")
  scoped.dataset.pluginId = pluginID
  container.append(scoped)
  const renderClaim = claim.render as (
    input: SlotMap["session.panel"],
  ) => JSX.Element
  disposeSlot = web.render(
    () =>
      renderClaim({
        sessionID: "independent-plugin-e2e",
        name: "hello",
        width: 320,
        presentation: "panel",
        close: () => {},
        toggleFullscreen: () => {},
      }),
    scoped,
  )
}

exposeSharedPluginRuntime()
const ready = loadInstalled()
window.pluginAcceptance = {
  ready,
  async previewZip() {
    const archive = new Blob([window.independentPackage], {
      type: "application/zip",
    })
    const preview = await repository.preview(archive)
    previewResult = preview
    return {
      action: preview.action,
      id: preview.manifest.id,
      version: preview.manifest.version,
      currentVersion: preview.currentVersion,
      commandsBefore: pluginHost.state.commands.length,
      installationsBefore: (await repository.list()).length,
    }
  },
  async installZip() {
    if (!previewResult) throw new Error("Preview the package before installing")
    const archive = new Blob([window.independentPackage], {
      type: "application/zip",
    })
    const record = await repository.install(archive)
    await repository.setEnabled(record.id, true)
    await loadInstalled()
  },
  async runCommand() {
    const command = pluginHost.state.commands.find(
      (item) => item.id === `${pluginID}:hello`,
    )
    if (!command) throw new Error("Example plugin command is unavailable")
    await command.run()
  },
  openPanel() {
    return (
      pluginHost.state.availablePanels
        .find((item) => item.plugin === pluginID && item.name === "hello")
        ?.open() ?? false
    )
  },
  async disable() {
    await repository.setEnabled(pluginID, false)
    await pluginHost.disable(pluginID)
    clearPluginSlot()
  },
  async uninstall(removeData) {
    await pluginHost.unregister(pluginID)
    await repository.remove(pluginID)
    pluginDefinitions.delete(pluginID)
    if (removeData) {
      const prefix = pluginStoragePrefix(pluginID)
      for (let index = localStorage.length - 1; index >= 0; index--) {
        const key = localStorage.key(index)
        if (key?.startsWith(prefix)) localStorage.removeItem(key)
      }
    }
    clearPluginSlot()
  },
  snapshot() {
    return {
      statuses: pluginHost.state.statuses,
      commands: pluginHost.state.commands.map((item) => item.id),
      panels: pluginHost.state.availablePanels.map((item) => item.name),
      activePanels: pluginHost.state.panels.map((item) => item.name),
      slotText: document.getElementById("plugin-slot")?.innerText ?? "",
      assetURL:
        document.querySelector<HTMLImageElement>("#plugin-slot img")?.src,
      storedGreeting: localStorage.getItem(
        `${pluginStoragePrefix(pluginID)}greetings`,
      ),
    }
  },
  async installationCount() {
    return (await repository.list()).length
  },
}

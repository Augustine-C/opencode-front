import * as solid from "solid-js"
import * as web from "solid-js/web"
import * as store from "solid-js/store"

const Context = solid.createContext<string>()
let dispose: (() => void) | undefined

declare global {
  interface Window {
    installProbe: () => Promise<void>
    updateProbe: () => void
    cleanupProbe: () => void
    probeCleanups: number
    probeAssetUrl: string
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
  const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }))
  const module = await import(/* @vite-ignore */ url)
  URL.revokeObjectURL(url)
  const assetUrl = URL.createObjectURL(
    new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>'], { type: "image/svg+xml" }),
  )
  const styleUrl = URL.createObjectURL(
    new Blob(['[data-plugin-root="ip00"] [data-probe="shared-solid"] { color: rgb(1, 2, 3) }'], {
      type: "text/css",
    }),
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

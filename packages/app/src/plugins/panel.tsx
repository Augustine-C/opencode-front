import { createStore } from "solid-js/store"
import { createResizeObserver } from "@solid-primitives/resize-observer"
import type { PluginPanel as Panel } from "@opencode/frontend-plugin/host"
import { usePlugins } from "./context"
import { PluginSlot } from "./slot"

// Content is hosted by the native desktop tab pane or mobile session view.
export function PluginPanelContent(props: { panel: Panel }) {
  const plugins = usePlugins()
  const [size, setSize] = createStore({ width: 0 })
  let root!: HTMLDivElement
  createResizeObserver(
    () => root,
    ({ width }) => setSize("width", width),
  )
  return (
    <div ref={root} class="min-w-0 flex-1 overflow-auto p-4" data-component="plugin-panel-content">
      <PluginSlot
        path="session.panel"
        owner={props.panel.plugin}
        input={{
          sessionID: props.panel.sessionID,
          name: props.panel.name,
          width: size.width,
          presentation: props.panel.presentation,
          close: () => plugins.host.dismissPanel(props.panel),
          toggleFullscreen: () => plugins.host.togglePanel(props.panel),
        }}
      />
    </div>
  )
}

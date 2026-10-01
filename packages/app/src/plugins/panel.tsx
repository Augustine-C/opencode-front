import { Show } from "solid-js"
import { usePlugins } from "./context"
import { PluginSlot } from "./slot"
import { useLanguage } from "@/runtime/i18n/language"

export function PluginPanel(props: { sessionID: string }) {
  const plugins = usePlugins()
  const language = useLanguage()
  const selected = () => {
    const panel = plugins.host.state.panel
    return panel?.sessionID === props.sessionID ? panel : undefined
  }
  return (
    <Show keyed when={selected()}>
      {(panel) => (
        <aside
          class="fixed right-4 top-20 bottom-12 z-40 shadow-xl flex flex-col gap-2 bg-v2-background-bg-base rounded-[10px] p-3 overflow-auto"
          classList={{ "!inset-4 !z-50": panel.presentation === "fullscreen" }}
          style={{ width: panel.presentation === "panel" ? "min(360px, 90vw)" : undefined }}
          aria-label={panel.title}
        >
          <div class="flex items-center justify-between gap-3">
            <strong>{panel.title}</strong>
            <button onClick={plugins.host.closePanel}>{language.t("common.close")}</button>
          </div>
          <PluginSlot
            path="session.panel"
            input={{
              sessionID: props.sessionID,
              name: panel.name,
              width: 360,
              presentation: panel.presentation,
              close: plugins.host.closePanel,
              toggleFullscreen: plugins.host.togglePanel,
            }}
          />
        </aside>
      )}
    </Show>
  )
}

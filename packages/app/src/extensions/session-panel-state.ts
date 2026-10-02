import { createMemo, type Accessor } from "solid-js"
import { usePlugins } from "@/plugins/context"
import { createPluginPanelView, pluginPanelTab } from "@/plugins/panel-model"

// Keep upstream callers limited to state inputs and small component mount points.
export function useSessionPanelExtension(input: {
  sessionID: Accessor<string | undefined>
  activeTab: Accessor<string | undefined>
}) {
  return createPluginPanelView({ host: usePlugins().host, ...input })
}
export function useSessionPanelKeys(sessionID: Accessor<string | undefined>) {
  const host = usePlugins().host
  return createMemo(() => host.state.panels.filter((panel) => panel.sessionID === sessionID()).map(pluginPanelTab))
}

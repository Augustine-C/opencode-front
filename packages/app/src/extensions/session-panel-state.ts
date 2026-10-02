import { type Accessor } from "solid-js"
import { usePlugins } from "@/plugins/context"
import { createPluginPanelView } from "@/plugins/panel-model"

// Keep upstream callers limited to state inputs and small component mount points.
export function useSessionPanelExtension(input: {
  sessionID: Accessor<string | undefined>
  activeTab: Accessor<string | undefined>
}) {
  return createPluginPanelView({ host: usePlugins().host, ...input })
}

import { Show } from "solid-js"
import { PluginScope, usePlugins } from "@/plugins/context"
import { PluginPanelContent } from "@/plugins/panel"
import { useExtensionHost } from "@/runtime/extension/host"
import { useExtensionAttachment } from "@/runtime/extension/attachment"
import { attachPluginPanels, frontendPanels } from "./plugin-panels"

export function useFrontendPanels() {
  const plugins = usePlugins()
  const host = useExtensionHost()
  const attachment = useExtensionAttachment()
  attachPluginPanels({
    context: host.context(frontendPanels.id)!,
    host: plugins.host,
    mobile: attachment.mobile,
    render: (panel) => (
      <PluginScope value={plugins}>
        <Show when={panel()} keyed>
          {(value) => <PluginPanelContent panel={value} />}
        </Show>
      </PluginScope>
    ),
  })
}

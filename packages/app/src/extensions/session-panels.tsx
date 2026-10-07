import { Show, type Accessor } from "solid-js"
import { IconButton } from "@opencode/ui/icon-button"
import { Icon } from "@opencode/ui/icon"
import { Tooltip } from "@opencode/ui/tooltip"
import { useLanguage } from "@/runtime/i18n/language"
import { useSessionPanelExtension } from "./session-panel-state"

export function PluginPanelToolbar(props: {
  sessionID: Accessor<string | undefined>
  activeTab: Accessor<string | undefined>
}) {
  const extension = useSessionPanelExtension(props)
  const language = useLanguage()
  const label = () => language.t(extension.fullscreen() ? "plugins.panel.restore" : "plugins.panel.maximize")
  return (
    <Show when={extension.selected()}>
      {(panel) => (
        <Tooltip value={label()} placement="bottom">
          <IconButton
            icon={<Icon name={extension.fullscreen() ? "collapse" : "expand"} />}
            variant="ghost-muted"
            size="normal"
            aria-label={label()}
            onClick={() => extension.toggle(panel())}
          />
        </Tooltip>
      )}
    </Show>
  )
}

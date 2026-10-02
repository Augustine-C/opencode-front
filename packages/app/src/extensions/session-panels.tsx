import { For, Show } from "solid-js"
import { Tabs } from "@opencode/ui/tabs"
import { Menu } from "@opencode/ui/menu"
import { Icon } from "@opencode/ui/icon"
import { IconButton } from "@opencode/ui/icon-button"
import { Button } from "@opencode/ui/button"
import { Tooltip } from "@opencode/ui/tooltip"
import { useLanguage } from "@/runtime/i18n/language"
import { SortableTab } from "@/session/files/tab"
import { PluginPanelContent } from "@/plugins/panel"
import { pluginPanelTab } from "@/plugins/panel-model"

import type { useSessionPanelExtension } from "./session-panel-state"

type Extension = ReturnType<typeof useSessionPanelExtension>

export function PluginPanelTab(props: {
  extension: Extension
  tab: string
  index: number
  onClose: (tab: string) => void
}) {
  return (
    <Show when={props.extension.panels().find((panel) => pluginPanelTab(panel) === props.tab)}>
      {(panel) => (
        <SortableTab tab={props.tab} index={props.index} onTabClose={props.onClose}>
          <div class="flex items-center gap-1.5">
            <Icon name="extensions" size="small" />
            <span class="max-w-40 truncate">{panel().title}</span>
          </div>
        </SortableTab>
      )}
    </Show>
  )
}

export function PluginPanelMenuItems(props: { extension: Extension }) {
  return (
    <For each={props.extension.entries()}>
      {(panel) => (
        <Menu.Item onSelect={() => panel.open()}>
          <div class="flex items-center gap-2">
            <Icon name="extensions" size="small" />
            <span>{panel.title}</span>
          </div>
        </Menu.Item>
      )}
    </For>
  )
}

export function PluginPanelToolbar(props: { extension: Extension }) {
  const language = useLanguage()
  const label = () => language.t(props.extension.fullscreen() ? "plugins.panel.restore" : "plugins.panel.maximize")
  return (
    <Show when={props.extension.selected()}>
      {(panel) => (
        <Tooltip value={label()} placement="bottom">
          <IconButton
            icon={props.extension.fullscreen() ? "collapse" : "expand"}
            variant="ghost-muted"
            size="normal"
            aria-label={label()}
            onClick={() => props.extension.toggle(panel())}
          />
        </Tooltip>
      )}
    </Show>
  )
}

export function PluginPanelTabContent(props: { extension: Extension }) {
  return (
    <Show when={props.extension.selected()} keyed>
      {(panel) => (
        <Tabs.Content value={pluginPanelTab(panel)} class="flex h-full min-h-0 flex-col overflow-hidden">
          <PluginPanelContent panel={panel} />
        </Tabs.Content>
      )}
    </Show>
  )
}

export function PluginMobilePanelContent(props: { extension: Extension }) {
  const language = useLanguage()
  return (
    <Show when={props.extension.mobile()} keyed>
      {(panel) => (
        <div class="flex h-full min-h-0 flex-col">
          <div class="flex shrink-0 items-center justify-between gap-3 border-b border-v2-border-border-muted px-4 py-2">
            <span class="min-w-0 truncate text-13-medium">{panel.title}</span>
            <Button variant="ghost-muted" size="small" onClick={() => props.extension.close(panel)}>
              {language.t("common.closeTab")}
            </Button>
          </div>
          <PluginPanelContent panel={panel} />
        </div>
      )}
    </Show>
  )
}

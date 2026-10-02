import { createMemo, type Accessor } from "solid-js"
import type { PluginPanel } from "@opencode/frontend-plugin/host"

export const pluginPanelTab = (panel: Pick<PluginPanel, "plugin" | "name">) =>
  `plugin-panel:${encodeURIComponent(panel.plugin)}/${encodeURIComponent(panel.name)}`

// Shared state projection for native tabs, mobile navigation, and pane geometry.
// Host-specific rendering belongs to the extension adapter, not session code.
export function createPluginPanelView(input: {
  host: import("@opencode/frontend-plugin/host").PluginHost
  sessionID: Accessor<string | undefined>
  activeTab: Accessor<string | undefined>
}) {
  const panels = createMemo(() => input.host.state.panels.filter((panel) => panel.sessionID === input.sessionID()))
  const keys = createMemo(() => panels().map(pluginPanelTab))
  const entries = createMemo(() =>
    input.host.state.availablePanels.map((panel) => ({
      key: pluginPanelTab(panel),
      title: panel.title,
      open: panel.open,
    })),
  )
  const tabs = createMemo(() => panels().map((panel) => ({ key: pluginPanelTab(panel), title: panel.title })))
  const selected = createMemo(() => panels().find((panel) => pluginPanelTab(panel) === input.activeTab()))
  const mobile = createMemo(() => {
    const current = input.host.state.panel
    return (
      panels().find(
        (panel) =>
          current?.sessionID === panel.sessionID && current.plugin === panel.plugin && current.name === panel.name,
      ) ?? panels()[0]
    )
  })
  const find = (tab: string) => panels().find((panel) => pluginPanelTab(panel) === tab)
  return {
    panels,
    keys,
    entries,
    tabs,
    selected,
    mobile,
    fullscreen: createMemo(() => selected()?.presentation === "fullscreen"),
    select(tab: string) {
      const panel = find(tab)
      if (panel) input.host.selectPanel(panel)
      return panel
    },
    dismiss(tab: string) {
      const panel = find(tab)
      if (panel) input.host.dismissPanel(panel)
    },
    close: input.host.dismissPanel,
    toggle: input.host.togglePanel,
  }
}

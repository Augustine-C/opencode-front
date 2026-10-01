import { batch, createEffect, on, untrack, type Accessor } from "solid-js"
import type { PluginPanel } from "@opencode/frontend-plugin/host"

export const pluginPanelTab = (panel: Pick<PluginPanel, "plugin" | "name">) =>
  `plugin-panel:${encodeURIComponent(panel.plugin)}/${encodeURIComponent(panel.name)}`
export const isPluginPanelTab = (tab: string | undefined) => !!tab?.startsWith("plugin-panel:")

// Bridge plugin-owned lifetime to the existing session tab list. No plugin tabs
// survive disabling their owner, and ordinary tab-close actions dismiss them.
export function createPluginPanelTabs(input: {
  sessionID: Accessor<string | undefined>
  requested: Accessor<PluginPanel | undefined>
  request: Accessor<number>
  panels: Accessor<readonly PluginPanel[]>
  tabs: Accessor<{ all: Accessor<string[]>; open: (tab: string) => void; close: (tab: string) => void }>
  activate: () => void
  dismiss: (panel: PluginPanel) => void
}) {
  const seen = new Map<string, Set<string>>()
  createEffect(
    on(
      () => [input.sessionID(), input.request()] as const,
      ([sessionID]) => {
        const panel = input.requested()
        if (!sessionID || panel?.sessionID !== sessionID) return
        untrack(() =>
          batch(() => {
            input.tabs().open(pluginPanelTab(panel))
            input.activate()
          }),
        )
      },
    ),
  )
  createEffect(() => {
    const sessionID = input.sessionID()
    if (!sessionID) return
    const panels = input.panels().filter((panel) => panel.sessionID === sessionID)
    const registered = new Map(panels.map((panel) => [pluginPanelTab(panel), panel]))
    const all = new Set(input.tabs().all())
    const known = seen.get(sessionID) ?? new Set<string>()
    seen.set(sessionID, known)
    untrack(() =>
      batch(() => {
        for (const tab of all) {
          if (!isPluginPanelTab(tab)) continue
          if (registered.has(tab)) known.add(tab)
          else input.tabs().close(tab)
        }
        for (const tab of known) {
          if (all.has(tab) && registered.has(tab)) continue
          const panel = registered.get(tab)
          if (panel && !all.has(tab)) input.dismiss(panel)
          known.delete(tab)
        }
      }),
    )
  })
}

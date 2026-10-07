import { createEffect, createRoot, onCleanup, untrack, type Accessor, type JSX } from "solid-js"
import {
  MenuItem,
  Panel,
  type Context,
  type Definition,
  type PanelTab,
  type SessionRef,
} from "@opencode/gui-extensions/sdk"
import type { PluginHost, PluginPanel } from "@opencode/frontend-plugin/host"
import { pluginPanelTab } from "@/plugins/panel-model"

// Keep the old persisted prefix while moving panel ownership to the upstream SDK.
export const frontendPanels: Definition = {
  id: "plugin-panel",
  renderer: () => Promise.resolve({ default: () => {} }),
}

export function attachPluginPanels(input: {
  context: Context
  host: PluginHost
  render: (panel: Accessor<PluginPanel | undefined>) => JSX.Element
  mobile: { current: Accessor<string>; select: (key: string) => void }
}) {
  const layout = input.context.layout
  const sessions = input.context.sessions
  const registrations = new Map<string, () => void>()
  const requests = new Map<string, number>()
  const id = (panel: Pick<PluginPanel, "plugin" | "name">) => pluginPanelTab(panel).slice("plugin-panel:".length)
  const find = (key: string, view: SessionRef) =>
    input.host.state.panels.find((panel) => panel.sessionID === view.id && id(panel) === key)
  // A permanent transient provider also removes stale persisted tabs after all plugins are disabled.
  const removeEmpty = input.context.add(Panel, {
    id: "panels",
    region: "side",
    transient: true,
    list: () => [],
    render: () => null,
  })
  // Synchronize contributions owned by the separate browser-plugin runtime with the native extension host.
  createEffect(() => {
    const definitions = new Map(
      [...input.host.state.availablePanels, ...input.host.state.panels].map((panel) => [id(panel), panel]),
    )
    for (const [key, remove] of registrations) {
      if (definitions.has(key)) continue
      remove()
      registrations.delete(key)
    }
    for (const [key, definition] of definitions) {
      if (registrations.has(key)) continue
      const tabs = new Map<string, PanelTab>()
      const available = () => input.host.state.availablePanels.find((panel) => id(panel) === key)
      const removePanel = input.context.add(Panel, {
        id: key,
        region: "side",
        transient: true,
        get mobile() {
          return { title: available()?.title ?? definition.title, order: 50, kind: "menu" as const }
        },
        list(props) {
          const view = props.session
          const panel = find(key, view)
          if (!panel) {
            tabs.delete(view.key)
            return []
          }
          let tab = tabs.get(view.key)
          if (!tab) {
            tab = {
              id: key,
              get title() {
                return find(key, view)?.title ?? definition.title
              },
            }
            tabs.set(view.key, tab)
          }
          return [tab]
        },
        render: (props) => input.render(() => find(key, props.session)),
        close: (props) => {
          const panel = find(key, props.session)
          if (panel) input.host.dismissPanel(panel)
        },
        focus: (props) => {
          const panel = find(key, props.session)
          if (panel) input.host.selectPanel(panel)
        },
      })
      // Its reactive contribution must outlive this reconciliation effect's next run.
      const removeMenu = createRoot((dispose) => {
        const remove = input.context.add(MenuItem, () => {
          const panel = available()
          if (!panel) return undefined
          return {
            id: key,
            menu: "session.panel" as const,
            title: panel.title,
            icon: "extensions" as const,
            order: 50,
            run: () => panel.open(),
          }
        })
        return () => {
          void remove()
          dispose()
        }
      })
      registrations.set(key, () => {
        void removePanel()
        void removeMenu()
      })
    }
  })
  // Hold requests while desktop storage or a re-authenticated session location is unresolved.
  createEffect(() => {
    const view = sessions.current()
    if (!view?.location || !layout.ready()) return
    const request = input.host.state.panelRequest
    const panel = input.host.state.panel
    if (!panel || panel.sessionID !== view.id || requests.get(view.key) === request) return
    untrack(() => {
      layout.open(pluginPanelTab(panel), view, { tab: "select" })
      if (layout.narrow()) input.mobile.select(pluginPanelTab(panel))
      requests.set(view.key, request)
    })
  })
  // Withdraw resources from every open session, including sessions whose screen is unmounted.
  createEffect(() => {
    if (!layout.ready()) return
    const live = new Map<string, Set<string>>()
    for (const panel of input.host.state.panels) {
      const keys = live.get(panel.sessionID) ?? new Set<string>()
      keys.add(id(panel))
      live.set(panel.sessionID, keys)
    }
    const open = sessions.list()
    const current = sessions.current()
    for (const view of open) {
      if (!view.location) continue
      for (const key of layout.stored(view)) {
        if (live.get(view.id)?.has(key)) continue
        untrack(() => layout.close(`plugin-panel:${key}`, view))
      }
    }
    if (current?.location && layout.narrow()) {
      const key = input.mobile.current()
      if (key.startsWith("plugin-panel:") && !live.get(current.id)?.has(key.slice("plugin-panel:".length)))
        untrack(() => input.mobile.select("session"))
    }
    for (const key of requests.keys()) {
      if (!open.some((view) => view.key === key) && current?.key !== key) requests.delete(key)
    }
  })
  onCleanup(() => {
    for (const remove of registrations.values()) remove()
    void removeEmpty()
  })
}

import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { createStore } from "solid-js/store"
import { createPluginHost } from "../../frontend-plugin/src/runtime"
import { define, type Context } from "../../frontend-plugin/src/index"
import { createPluginPanelTabs, createPluginPanelView, pluginPanelTab } from "../src/plugins/panel-model"
import { createSessionTabs } from "../src/session/helpers"
import { openSessionTab, closeSessionTab, type SessionTabState } from "../src/shell/state/session-tabs"

function fixture() {
  return createRoot((dispose) => {
    const [state, set] = createStore({ session: "one", activation: 0, sessions: {} as Record<string, SessionTabState> })
    const empty: SessionTabState = { tabs: { all: [] } }
    const current = () => state.sessions[state.session] ?? empty
    const tabs = {
      all: () => current().tabs.all,
      active: () => current().tabs.active,
      open: (tab: string) => set("sessions", state.session, openSessionTab(current(), tab)),
      close: (tab: string) => set("sessions", state.session, closeSessionTab(current(), tab)),
    }
    const host = createPluginHost({
      context: {
        app: { version: "test", platform: "web" },
        client: () => undefined,
        sessionID: () => state.session,
        connection: () => undefined,
        data: { listen: () => () => {} },
      },
    })
    const contexts: Record<string, Context> = {}
    for (const id of ["first", "second"])
      host.register(
        define({
          id,
          name: id,
          apiVersion: 1,
          setup: (ctx) => {
            contexts[id] = ctx
          },
        }),
      )
    const panels = () => host.state.panels.filter((panel) => panel.sessionID === state.session)
    createPluginPanelTabs({
      sessionID: () => state.session,
      requested: () => host.state.panel,
      request: () => host.state.panelRequest,
      panels: () => host.state.panels,
      tabs: () => tabs,
      activate: () => set("activation", (value) => value + 1),
      dismiss: host.dismissPanel,
    })
    const model = createSessionTabs({
      tabs: () => tabs,
      pluginTabs: () => panels().map(pluginPanelTab),
      pathFromTab: (tab) => (tab.startsWith("file://") ? tab.slice(7) : undefined),
      normalizeTab: (tab) => tab,
      review: () => true,
      hasReview: () => true,
    })
    return { state, set, tabs, host, contexts, model, dispose }
  })
}

async function ready() {
  const f = fixture()
  await f.host.enable("first")
  await f.host.enable("second")
  return f
}

test("plugin panels use closable native tabs without replacing file previews", async () => {
  const f = await ready()
  try {
    f.set("sessions", "one", {
      tabs: { all: ["context", "file://preview"], active: "file://preview" },
      preview: "file://preview",
    })
    f.contexts.first.ui.panel.open("details")
    const key = pluginPanelTab(f.host.state.panel!)
    expect(f.tabs.all()).toEqual(["context", "file://preview", key])
    expect(f.state.sessions.one.preview).toBe("file://preview")
    expect(f.model.activeTab()).toBe(key)
    expect(f.model.closableTab()).toBe(key)
    expect(f.model.activeFileTab()).toBeUndefined()
    expect(f.model.openedTabs()).toEqual(["file://preview"])
    f.tabs.open("review")
    expect(f.host.state.panels).toHaveLength(1)
    f.contexts.first.ui.panel.open("details")
    expect(f.tabs.active()).toBe(key)
    expect(f.tabs.all().filter((tab) => tab === key)).toHaveLength(1)
    expect(f.state.activation).toBe(2)
    f.tabs.close(key)
    expect(f.host.state.panels).toHaveLength(0)
    f.contexts.first.ui.panel.open("details")
    expect(f.tabs.active()).toBe(key)
    f.contexts.first.ui.panel.close()
    expect(f.tabs.all()).not.toContain(key)
  } finally {
    await f.host.dispose()
    f.dispose()
  }
})

test("panels are isolated by owner and session and removed on disable", async () => {
  const f = await ready()
  try {
    f.contexts.first.ui.panel.open("details")
    const first = { ...f.host.state.panel! }
    f.contexts.second.ui.panel.open("details")
    const second = { ...f.host.state.panel! }
    expect(pluginPanelTab(first)).not.toBe(pluginPanelTab(second))
    f.host.togglePanel(first)
    expect(f.host.state.panels.find((panel) => panel.plugin === "first")?.presentation).toBe("fullscreen")
    expect(f.host.state.panel?.presentation).toBe("panel")
    f.set("session", "two")
    expect(f.model.panelTabs()).toEqual([])
    f.contexts.first.ui.panel.open("details")
    expect(f.host.state.panels).toHaveLength(3)
    f.set("session", "one")
    expect(f.tabs.all()).toContain(pluginPanelTab(second))
    await f.host.disable("first")
    expect(f.tabs.all()).not.toContain(pluginPanelTab(first))
    expect(f.host.state.panels).toHaveLength(1)
    expect(f.model.activeTab()).toBe(pluginPanelTab(second))
    f.set("session", "two")
    expect(f.tabs.all()).toEqual([])
    f.tabs.open("plugin-panel:removed/details")
    expect(f.tabs.all()).toEqual([])
  } finally {
    await f.host.dispose()
    f.dispose()
  }
})

test("native menu entries remain discoverable after closing their session tab", async () => {
  const f = await ready()
  try {
    f.contexts.first.ui.panel.register({ name: "overview", title: "Project overview" })
    const entry = f.host.state.availablePanels[0]
    expect(f.tabs.all()).toEqual([])
    expect(entry.open()).toBe(true)
    const key = pluginPanelTab(entry)
    expect(f.model.activeTab()).toBe(key)
    expect(f.state.activation).toBe(1)
    f.tabs.close(key)
    expect(f.host.state.panels).toHaveLength(0)
    expect(f.host.state.availablePanels).toHaveLength(1)
    entry.open()
    expect(f.tabs.all()).toEqual([key])
    expect(f.state.activation).toBe(2)
    await f.host.disable("first")
    expect(f.tabs.all()).toEqual([])
    expect(f.host.state.availablePanels).toHaveLength(0)
  } finally {
    await f.host.dispose()
    f.dispose()
  }
})

test("shared panel projection follows session, native selection, maximize, and registered menu state", async () => {
  const f = await ready()
  const view = createRoot((dispose) => ({
    ...createPluginPanelView({ host: f.host, sessionID: () => f.state.session, activeTab: f.tabs.active }),
    dispose,
  }))
  try {
    f.contexts.first.ui.panel.register({ name: "overview", title: "Overview" })
    expect(view.entries()[0].title).toBe("Overview")
    view.entries()[0].open()
    const key = view.keys()[0]
    expect(view.selected()?.name).toBe("overview")
    expect(view.mobile()?.name).toBe("overview")
    expect(view.tabs()).toEqual([{ key, title: "Overview" }])
    view.toggle(view.selected())
    expect(view.fullscreen()).toBe(true)
    f.tabs.open("review")
    expect(view.selected()).toBeUndefined()
    expect(view.fullscreen()).toBe(false)
    f.set("session", "two")
    expect(view.mobile()).toBeUndefined()
    expect(view.keys()).toEqual([])
    view.entries()[0].open()
    expect(view.selected()?.sessionID).toBe("two")
    view.dismiss(key)
    expect(view.keys()).toEqual([])
    f.set("session", "one")
    expect(view.keys()).toEqual([key])
    expect(view.select(key)?.sessionID).toBe("one")
    await f.host.disable("first")
    expect(view.entries()).toEqual([])
    expect(view.keys()).toEqual([])
  } finally {
    view.dispose()
    await f.host.dispose()
    f.dispose()
  }
})

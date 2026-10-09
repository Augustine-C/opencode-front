import { expect, test } from "bun:test"
import { createRoot, createMemo } from "solid-js"
import { createStore } from "solid-js/store"
import { createPluginHost } from "../../frontend-plugin/src/runtime"
import { define, type Context } from "../../frontend-plugin/src/index"
import { panelDemo } from "../../../examples/frontend-plugins/src/panel-demo"
import { createPluginPanelView, pluginPanelTab } from "../src/plugins/panel-model"
import { attachPluginPanels } from "../src/extensions/plugin-panels"
import {
  Panel,
  MenuItem,
  type Context as NativeContext,
  type MountedSession,
} from "@opencode/gui-extensions/sdk"
import { openSessionTab, closeSessionTab, type SessionTabState } from "../src/shell/state/session-tabs"

function fixture() {
  return createRoot((dispose) => {
    const [state, set] = createStore({
      session: "one",
      activation: 0,
      ready: true,
      located: true,
      narrow: false,
      mobile: "session",
      sessions: {} as Record<string, SessionTabState>,
    })
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
    const contributions: { point: string; value: unknown }[] = []
    const views = new Map<string, MountedSession>()
    for (const id of ["one", "two"])
      views.set(id, {
        id,
        key: id,
        get location() {
          return state.located ? { directory: "/project" } : undefined
        },
      } as MountedSession)
    const nativePanels = () =>
      contributions.filter((item) => item.point === Panel.id).map((item) => item.value as Panel)
    const closeNative = (key: string, view: MountedSession) => {
      const id = key.slice("plugin-panel:".length)
      const provider = nativePanels().find((panel) => panel.id === id)
      const tab = provider?.list({ session: view, screen: {} as never, open: [id] }).find((tab) => tab.id === id)
      set("sessions", view.id, closeSessionTab(state.sessions[view.id] ?? empty, key))
      if (tab) provider?.close?.({ tab, session: view, screen: {} as never })
    }
    const context = {
      sessions: { list: () => [...views.values()], current: () => views.get(state.session) },
      layout: {
        ready: () => state.ready,
        narrow: () => state.narrow,
        open(key: string, view: MountedSession, options?: { tab?: "select" }) {
          const current = state.sessions[view.id] ?? empty
          const next = options?.tab === "select"
            ? {
                tabs: {
                  all: current.tabs.all.includes(key) ? current.tabs.all : [...current.tabs.all, key],
                  active: key,
                },
                preview: current.preview,
              }
            : openSessionTab(current, key)
          set("sessions", view.id, next)
          set("activation", (value) => value + 1)
        },
        close: closeNative,
        stored: (view: MountedSession) =>
          (state.sessions[view.id]?.tabs.all ?? []).flatMap((key) =>
            key.startsWith("plugin-panel:") ? [key.slice("plugin-panel:".length)] : [],
          ),
      },
      add(point: { id: string }, value: unknown) {
        const item = {
          point: point.id,
          value: typeof value === "function" ? createMemo(value as () => unknown) : value,
        }
        contributions.push(item)
        return () => {
          contributions.splice(contributions.indexOf(item), 1)
        }
      },
    } as unknown as NativeContext
    attachPluginPanels({
      context,
      host,
      render: () => null,
      mobile: { current: () => state.mobile, select: (key) => set("mobile", key) },
    })
    const panels = () =>
      nativePanels().flatMap((panel) =>
        panel.list({ session: views.get(state.session)!, screen: {} as never, open: [] }),
      )
    const model = {
      activeTab: tabs.active,
      panelTabs: () => panels().map((panel) => `plugin-panel:${panel.id}`),
    }
    const menu = () =>
      contributions
        .filter((item) => item.point === MenuItem.id)
        .map((item) => (item.value as () => MenuItem | undefined)())
        .filter(Boolean)
    const nativeClose = (key: string) => closeNative(key, views.get(state.session)!)
    return { state, set, tabs, host, contexts, model, nativeClose, menu, panels, dispose }
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
    expect(f.panels().map((panel) => panel.id)).toEqual([key.slice("plugin-panel:".length)])
    expect(f.panels()[0]).toBe(f.panels()[0])
    f.tabs.open("review")
    expect(f.host.state.panels).toHaveLength(1)
    f.contexts.first.ui.panel.open("details")
    expect(f.tabs.active()).toBe(key)
    expect(f.tabs.all().filter((tab) => tab === key)).toHaveLength(1)
    expect(f.state.activation).toBe(2)
    f.nativeClose(key)
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
    f.contexts.first.ui.panel.open("details", { title: "Second session" })
    expect(f.panels().map((panel) => panel.title)).toEqual(["Second session"])
    expect(f.host.state.panels).toHaveLength(3)
    f.set("session", "one")
    expect(f.tabs.all()).toContain(pluginPanelTab(second))
    expect(f.panels().map((panel) => panel.title)).toEqual(["first", "second"])
    await f.host.disable("first")
    expect(f.tabs.all()).not.toContain(pluginPanelTab(first))
    expect(f.host.state.panels).toHaveLength(1)
    expect(f.model.activeTab()).toBe(pluginPanelTab(second))
    f.set("session", "two")
    expect(f.tabs.all()).toEqual([])
  } finally {
    await f.host.dispose()
    f.dispose()
  }
})

test("native menu entries remain discoverable after closing their session tab", async () => {
  const f = await ready()
  try {
    const unregister = f.contexts.first.ui.panel.register({ name: "overview", title: "Project overview" })
    const entry = f.host.state.availablePanels[0]
    expect(f.tabs.all()).toEqual([])
    expect(f.menu().map((item) => item!.title)).toEqual(["Project overview"])
    expect(entry.open()).toBe(true)
    const key = pluginPanelTab(entry)
    expect(f.model.activeTab()).toBe(key)
    expect(f.state.activation).toBe(1)
    f.nativeClose(key)
    expect(f.host.state.panels).toHaveLength(0)
    expect(f.host.state.availablePanels).toHaveLength(1)
    entry.open()
    expect(f.tabs.all()).toEqual([key])
    expect(f.state.activation).toBe(2)
    unregister()
    expect(f.menu()).toEqual([])
    expect(f.tabs.all()).toEqual([key])
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

test("panel requests wait for loaded layout and location, including reauthentication", async () => {
  const f = await ready()
  try {
    f.set("ready", false)
    f.contexts.first.ui.panel.open("details")
    expect(f.tabs.all()).toEqual([])
    f.set("located", false)
    f.set("ready", true)
    expect(f.tabs.all()).toEqual([])
    f.set("located", true)
    const key = pluginPanelTab(f.host.state.panel!)
    expect(f.tabs.all()).toEqual([key])
    f.set("located", false)
    await f.host.disable("first")
    expect(f.tabs.all()).toEqual([key])
    f.set("located", true)
    expect(f.tabs.all()).toEqual([])
  } finally {
    await f.host.dispose()
    f.dispose()
  }
})

test("narrow-screen plugin requests select the native view and closing restores the conversation", async () => {
  const f = await ready()
  try {
    f.set("narrow", true)
    f.contexts.first.ui.panel.register({ name: "overview", title: "Overview" })
    f.host.state.availablePanels[0].open()
    expect(f.state.mobile).toBe(pluginPanelTab(f.host.state.panel!))
    f.contexts.first.ui.panel.close()
    expect(f.state.mobile).toBe("session")
    f.host.state.availablePanels[0].open()
    await f.host.disable("first")
    expect(f.state.mobile).toBe("session")
    expect(f.tabs.all()).toEqual([])
  } finally {
    await f.host.dispose()
    f.dispose()
  }
})

test("panel demo command is available only while a session is active", async () => {
  const [state, setState] = createStore({ sessionID: undefined as string | undefined })
  const host = createPluginHost({
    context: {
      app: { version: "test", platform: "web" },
      client: () => undefined,
      sessionID: () => state.sessionID,
      connection: () => undefined,
      data: { listen: () => () => {} },
    },
  })
  host.register(panelDemo())

  try {
    await host.enable("panel-demo", { title: "Project overview" })
    expect(host.state.commands).toHaveLength(0)

    setState("sessionID", "session-1")
    const command = host.state.commands.at(0)
    if (!command) throw new Error("The panel demo command should be registered for an active session")
    await command.run()
    expect(host.state.panel).toMatchObject({ plugin: "panel-demo", name: "panel-demo", sessionID: "session-1" })

    setState("sessionID", undefined)
    expect(host.state.commands).toHaveLength(0)
  } finally {
    await host.dispose()
  }
})

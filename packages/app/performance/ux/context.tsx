import { createStore } from "solid-js/store"
import en from "../../src/runtime/i18n/en"
const size = Number(new URLSearchParams(location.search).get("size")) || 20
export const items = Array.from({ length: size }, (_, i) => ({
  type: "session",
  server: `server-${Math.floor(i / (size / 4))}`,
  sessionId: `s${i}`,
}))
export const [state, setState] = createStore({
  current: items[0],
  collapsed: {} as Record<string, boolean>,
  status: "idle",
  unread: false,
  attention: false,
  offline: false,
})
const connections = Array.from({ length: 4 }, (_, i) => ({
  type: "http",
  displayName: `Instance ${i}`,
  http: { url: `server-${i}` },
}))
const projects = Array.from({ length: 5 }, (_, i) => ({
  id: `p${i}`,
  name: `Project ${i}`,
  worktree: `/code/project-${i}`,
}))
const session = (id: string) => {
  const i = Number(id.slice(1))
  return {
    id,
    title: `Conversation ${i} 同名会话`,
    projectID: `p${i % 5}`,
    location: { directory: `/code/project-${i % 5}` },
  }
}
const data = {
  session: {
    get: session,
    list: () => items.map((t) => session(t.sessionId)),
    family: () => [],
    root: (id) => id,
    status: () => state.status,
    pending: { list: () => [] },
    permission: { list: () => [] },
    form: { list: () => [] },
  },
}
export const useGlobal = () => ({
  servers: {
    list: () => connections,
    get health() {
      return Object.fromEntries(
        connections.map((c, i) => [c.http.url, { healthy: !state.offline, version: `2.0.${20 + i}` }]),
      )
    },
  },
  ensureServerCtx: () => ({
    data,
    sync: { data: { project: projects } },
    notification: { session: { unread: () => state.unread } },
  }),
})
export const useServerCtx = () => () => ({ data, notification: { session: { unread: () => state.unread } } })
export const ServerConnection = { key: (conn) => conn.http.url }
export const serverName = (conn) => conn.displayName
export const tabKey = (tab) => `${tab.server}\n${tab.sessionId}`
export const useTabs = () => ({ info: {}, pendingSession: () => undefined })
export const projectSettingsKey = () => "fixture"
export const useSettings = () => ({
  ready: () => true,
  permissions: { autoApproves: () => false },
  appearance: {
    groupTabsByProject: () => true,
    tabInstanceOrder: () => [],
    tabProjectOrder: () => [],
    tabGroupCollapsed: (key) => !!state.collapsed[key],
    setTabGroupCollapsed: (key, value) => setState("collapsed", key, value),
    setTabInstanceOrder: () => {},
    setTabProjectOrder: () => {},
  },
})
export const useSessionTabAvatarState = () => ({
  loading: () => state.status === "running",
  unread: () => state.unread || state.attention,
  needsAttention: () => state.attention,
})
export const useLanguage = () => ({
  t: (key, params = {}) =>
    Object.entries(params).reduce((s, [k, v]) => s.replaceAll(`{{${k}}}`, String(v)), en[key] ?? key),
  plural: (key, count) => `${count}`,
})

export { useData, useCommand } from "./history-data"

export const useSettingsSurface = () => ({ route: () => ({ type: "session", server: state.current.server }) })

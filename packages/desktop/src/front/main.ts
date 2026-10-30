import { app, BrowserWindow, dialog, ipcMain } from "electron"
import upstream from "../../../../docs/upstream.json"
import { createHash } from "node:crypto"
import { mkdirSync } from "node:fs"
import path from "node:path"
import { Schema } from "effect"
import type { RpcGroup } from "effect/rpc"
import { DESKTOP_NATIVE_ENGLISH, DESKTOP_NATIVE_LOCALE_TAGS } from "@opencode/app/i18n/desktop-native"
import { createHost, type PluginHost } from "../main/plugin/host"
import { openDatabase } from "../main/storage/database"
import { createStateStore } from "../main/storage/state"
import { setNativeTranslations } from "../main/native/translations"
import { pluginFailure } from "../main/plugin/error"
import { PluginRpcs } from "../shared/ipc-rpc/plugins"
import { set as setConnection, type Connection } from "./connection"
import { emitIpcEvent, setPublication, guiRevisions } from "./events"
import { registerWindow, getMainWindows } from "./windows"

const REQUEST = "opencode-front:plugin-request"
const CANCEL = "opencode-front:plugin-cancel"
const Select = Schema.Struct({
  id: Schema.String,
  url: Schema.String,
  username: Schema.optionalKey(Schema.String),
  password: Schema.optionalKey(Schema.String),
})
const NativeTranslations = Schema.Struct({
  locale: Schema.Literals(Object.keys(DESKTOP_NATIVE_LOCALE_TAGS) as (keyof typeof DESKTOP_NATIVE_LOCALE_TAGS)[]),
  messages: Schema.Record(Schema.String, Schema.String),
})
type Requests = RpcGroup.Rpcs<typeof PluginRpcs>
type Payload<Tag extends Requests["_tag"]> = Schema.Schema.Type<Extract<Requests, { _tag: Tag }>["payloadSchema"]>
const subscriptions = new Map<string, Set<number>>()
const servers = new Map<number, readonly { id: string; url: string; password?: string }[]>()
const calls = new Map<number, Map<string, AbortController>>()
let active: { key: string; host: PluginHost; close(): void } | undefined
let queued = Promise.resolve()
let wanted = ""
let generation = 0
const log = (message: string, data: Record<string, unknown>) => console.error(`[plugin] ${message}`, data)

function broadcast(event: Parameters<typeof emitIpcEvent>[1]) {
  getMainWindows().forEach((window) => emitIpcEvent(window.webContents, event))
}
const connectionKey = (connection?: Connection) =>
  connection ? JSON.stringify([connection.id, connection.url, connection.username, connection.password]) : ""
function select(connection?: Connection) {
  const key = connectionKey(connection)
  if (key === wanted) return queued
  wanted = key
  // Invalidate queued calls and withdraw old contributions before asynchronous cleanup.
  generation++
  calls.forEach((requests) => requests.forEach((controller) => controller.abort()))
  subscriptions.forEach((_, ipc) => broadcast({ _tag: "PluginAvailable", ipc, available: false }))
  broadcast({ _tag: "PluginGuisChanged", plugins: [], reserved: [] })
  broadcast({ _tag: "PluginsChanged", list: [] })
  setPublication(false, generation)
  queued = queued
    .catch((cause) => log("previous endpoint cleanup failed", { cause: String(cause) }))
    .then(async () => {
      const previous = active
      active = undefined
      if (previous) {
        try {
          await previous.host.dispose()
        } finally {
          previous.close()
        }
      }
      setConnection(undefined)
      if (key !== wanted || !connection) return
      setConnection(connection)
      const folder = path.join(app.getPath("userData"), "plugin-hosts")
      mkdirSync(folder, { recursive: true })
      const name = createHash("sha256")
        .update(JSON.stringify([connection.url, connection.username]))
        .digest("hex")
      const db = openDatabase(path.join(folder, `${name}.sqlite`))
      const state = createStateStore(db.db)
      const host = createHost({
        db: db.db,
        state,
        subscriptions,
        servers,
        cli: {
          version: upstream.version,
          command: [process.env.OPENCODE_FRONT_CLI ?? "opencode"],
          binary: process.env.OPENCODE_FRONT_CLI,
          development: false,
        },
        restart: async (handoff) => {
          await handoff?.()
          app.relaunch()
          app.quit()
        },
        log,
        write: (level, message, data) => console[level](`[plugin] ${message}`, data),
      })
      setPublication(true, generation)
      active = {
        key,
        host,
        close: () => {
          state.close()
          db.close()
        },
      }
      await host.start()
      if (key !== wanted) return
      broadcast({ _tag: "PluginsChanged", list: host.list() })
    })
  return queued
}
function caller(event: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent) {
  const window = BrowserWindow.fromWebContents(event.sender)
  if (!window || window.webContents !== event.sender || event.senderFrame !== event.sender.mainFrame)
    throw new Error("plugin.caller.invalid")
  const url = new URL(event.sender.getURL())
  const dev = process.env.OPENCODE_FRONT_DEV_URL
  if (!(url.protocol === "oc:" && url.hostname === "renderer") && !(dev && url.origin === new URL(dev).origin))
    throw new Error("plugin.caller.invalid")
  return window
}
export function installPluginHost() {
  ipcMain.on(CANCEL, (event, request: unknown) => {
    try {
      const window = caller(event)
      if (typeof request === "string") calls.get(window.id)?.get(request)?.abort()
    } catch {
      // A subframe or an unrelated page cannot cancel an app window's calls.
    }
  })
  const dispatch = async (
    event: Electron.IpcMainInvokeEvent,
    raw: { method: string; input?: unknown; request?: string },
  ) => {
    const window = caller(event)
    if (!raw || typeof raw.method !== "string") throw new Error("plugin.request.invalid")
    if (raw.method === "NativeSelect") {
      const input = raw.input === null ? undefined : Schema.decodeUnknownSync(Select)(raw.input)
      if (input && !/^https?:$/.test(new URL(input.url).protocol)) throw new Error("plugin.endpoint.invalid")
      await select(
        input && { ...input, sameMachine: ["localhost", "127.0.0.1", "[::1]"].includes(new URL(input.url).hostname) },
      )
      return
    }
    if (raw.method === "NativeTranslations") {
      const input = Schema.decodeUnknownSync(NativeTranslations)(raw.input)
      return setNativeTranslations({ locale: input.locale, messages: { ...DESKTOP_NATIVE_ENGLISH, ...input.messages } })
    }
    if (raw.method === "NativeDirectory")
      return (await dialog.showOpenDialog(window, { properties: ["openDirectory"] })).filePaths
    const rpc = PluginRpcs.requests.get(raw.method as never)
    if (!rpc) throw new Error("plugin.request.invalid")
    const payload = <Tag extends Requests["_tag"]>(tag: Tag): Payload<Tag> => {
      const definition = PluginRpcs.requests.get(tag)!
      // The tag selects this exact upstream request schema from the validated group.
      return Schema.decodeUnknownSync(definition.payloadSchema)(raw.input ?? {}) as Payload<Tag>
    }
    Schema.decodeUnknownSync(rpc.payloadSchema)(raw.input ?? {})
    const started = generation
    const abort = new AbortController()
    const requests = calls.get(window.id) ?? new Map<string, AbortController>()
    calls.set(window.id, requests)
    if (raw.request) requests.set(raw.request, abort)
    try {
      await queued
      if (generation !== started || abort.signal.aborted) throw new Error("plugin.source.changed")
      const host = active?.host
      if (raw.method === "PluginSubscribe") {
        const { ipc } = payload("PluginSubscribe")
        const windows = subscriptions.get(ipc) ?? new Set<number>()
        subscriptions.set(ipc, windows)
        windows.add(window.id)
      }
      if (!host) {
        if (raw.method === "PluginList" || raw.method === "PluginMenubarItems") return []
        if (raw.method === "PluginGuis") return { plugins: [], reserved: [] }
        if (raw.method === "PluginConfigure") {
          servers.set(window.id, payload("PluginConfigure").servers)
          return
        }
        if (raw.method === "PluginSubscribe") return { available: false }
        throw new Error("unavailable")
      }
      switch (raw.method) {
        case "PluginCall":
          return await host.call(payload("PluginCall"), { window: window.id, signal: abort.signal })
        case "PluginSubscribe": {
          const { ipc } = payload("PluginSubscribe")
          host.demand(ipc)
          return host.snapshot(ipc, window.id)
        }
        case "PluginConfigure":
          servers.set(window.id, payload("PluginConfigure").servers)
          return
        case "PluginGuis":
          return guiRevisions(host.pluginGuis())
        case "PluginList":
          return host.list()
        case "PluginEnable":
          return await host.enable(payload("PluginEnable").id)
        case "PluginDisable":
          return await host.disable(payload("PluginDisable").id)
        case "PluginReload":
          return await host.reload(payload("PluginReload").id)
        case "PluginEmbed": {
          const input = payload("PluginEmbed")
          return host.embed(window.id, input.id, input.layout)
        }
        case "PluginCapture":
          return (await host.capture(window.id, payload("PluginCapture").id)) ?? null
        case "PluginMenubarItem":
          return host.runMenubarItem(window.id, payload("PluginMenubarItem").id)
        case "PluginMenubarItems":
          return host.listMenubarItems()
      }
    } finally {
      if (raw.request) requests.delete(raw.request)
    }
  }
  ipcMain.handle(REQUEST, async (event, raw) => {
    try {
      return { ok: true, value: await dispatch(event, raw) }
    } catch (cause) {
      return { ok: false, error: pluginFailure(cause) }
    }
  })
  let quitting = false
  app.on("before-quit", (event) => {
    if (quitting) return
    event.preventDefault()
    quitting = true
    void select().finally(() => app.quit())
  })
}
export function attachPluginWindow(window: BrowserWindow) {
  registerWindow(window)
  window.on("focus", () => emitIpcEvent(window.webContents, { _tag: "WindowFocusChanged", focused: true }))
  window.on("blur", () => emitIpcEvent(window.webContents, { _tag: "WindowFocusChanged", focused: false }))
  const release = () => {
    calls.get(window.id)?.forEach((controller) => controller.abort())
    calls.delete(window.id)
  }
  window.webContents.on("did-start-navigation", (event) => {
    if (event.isMainFrame && !event.isSameDocument) release()
  })
  window.once("closed", release)
}

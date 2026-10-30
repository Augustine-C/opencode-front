import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import { EventEmitter } from "node:events"

// Protect the isolated preload boundary: dropping it or exposing Electron events directly
// breaks native plugins or leaks privileged objects. Main-host tests start after this boundary.
test("native preload exposes the GUI transport without exposing the privileged IPC object", async () => {
  const ipc = new EventEmitter()
  const requests: unknown[] = []
  const messages: unknown[] = []
  const globals: Record<string, any> = {}
  Object.assign(ipc, {
    invoke: (...args: unknown[]) => {
      requests.push(args)
      return Promise.resolve({ ok: true, value: 42 })
    },
    send: (...args: unknown[]) => {
      messages.push(args)
    },
  })
  runInNewContext(readFileSync(new URL("../../desktop-preload.cjs", import.meta.url), "utf8"), {
    process: { platform: "darwin", argv: ["--opencode-window=example", "--opencode-packaged"] },
    require: () => ({
      ipcRenderer: ipc,
      contextBridge: {
        exposeInMainWorld: (key: string, value: unknown) => {
          globals[key] = value
        },
      },
    }),
  })
  const api = globals.electron
  expect(Object.keys(api).sort()).toEqual(["cancel", "invoke", "on", "os", "packaged", "windowID"])
  expect([api.os, api.windowID, api.packaged]).toEqual(["macos", "example", true])
  expect(await api.invoke("PluginList", {}, "request-1")).toEqual({ ok: true, value: 42 })
  api.cancel("request-1")
  expect(requests).toEqual([
    ["opencode-front:plugin-request", { method: "PluginList", input: {}, request: "request-1" }],
  ])
  expect(messages).toEqual([["opencode-front:plugin-cancel", "request-1"]])
  const seen: unknown[] = []
  const stop = api.on((value: unknown) => seen.push(value))
  const message = { _tag: "PluginAvailable", ipc: "example", available: true }
  ipc.emit("opencode-front:plugin-event", { privileged: true }, message)
  stop()
  ipc.emit("opencode-front:plugin-event", { privileged: true }, message)
  expect(seen).toEqual([message])
  expect(ipc.listenerCount("opencode-front:plugin-event")).toBe(0)
})

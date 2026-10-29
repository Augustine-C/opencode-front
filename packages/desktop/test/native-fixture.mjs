import { createRequire } from "node:module"
import { createServer } from "node:http"
import { readFileSync, rmSync } from "node:fs"
export async function createNativeFixture() {
  const require = createRequire(import.meta.url)
  const Module = require("node:module")
  const native = require("./electron.cjs")
  const original = Module._load
  Module._load = function (name, ...args) {
    return name === "electron" ? native : original.call(this, name, ...args)
  }
  const { installPluginHost, attachPluginWindow } = require("../../../dist/native/desktop-plugins.cjs")
  const bundle = readFileSync(new URL("../../../work/service-gui/gui-experimental.cjs", import.meta.url), "utf8")
  const streams = new Set()
  const state = { revision: "one", code: bundle, listed: true, reads: 0, hold: false, held: [] }
  const server = createServer((request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "*")
    response.setHeader("Access-Control-Allow-Headers", "*")
    if (request.method === "OPTIONS") return response.writeHead(204).end()
    const json = (data) => {
      response.setHeader("Content-Type", "application/json")
      response.end(JSON.stringify(data))
    }
    const url = new URL(request.url, "http://fixture")
    const second = url.pathname.startsWith("/second/")
    if (second) url.pathname = url.pathname.slice("/second".length)
    if (url.pathname === "/api/info") return json({ version: "2.2.1", pid: 0, urls: [], paths: { tmp: "/tmp" } })
    if (url.pathname === "/api/event") {
      response.writeHead(200, { "Content-Type": "text/event-stream" })
      streams.add(response)
      request.on("close", () => streams.delete(response))
      response.write(`data: ${JSON.stringify({ id: "connected", type: "server.connected", data: {} })}\n\n`)
      return
    }
    if (url.pathname === "/api/plugin")
      return json({
        location: {},
        data: state.listed
          ? [
              {
                id: "third-party-sidebar",
                source: { type: "local", path: "fixture" },
                features: { gui: true },
                state: { status: "active" },
              },
            ]
          : [],
      })
    if (url.pathname === "/api/plugin/gui") {
      state.reads++
      const reply = {
        location: {},
        data: {
          code: state.code,
          revision: state.revision,
          options: { label: second ? "second-service" : state.revision },
        },
      }
      if (state.hold && !second) return void state.held.push(() => json(reply))
      return json(reply)
    }
    return json([])
  })
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  const url = `http://127.0.0.1:${server.address().port}`
  const update = () =>
    streams.forEach((stream) =>
      stream.write(`data: ${JSON.stringify({ id: crypto.randomUUID(), type: "plugin.updated", data: {} })}\n\n`),
    )
  installPluginHost()
  const window = new native.BrowserWindow()
  attachPluginWindow(window)
  const request = async (method, input) => {
    const result = await native.__test.request(window, { method, input })
    if (!result.ok) throw Object.assign(new Error(result.error.message), result.error)
    return result.value
  }

  return {
    state,
    native,
    window,
    url,
    request,
    update,
    raw: (input) => native.__test.request(window, input),
    async close() {
      await request("NativeSelect", null)
      streams.forEach((stream) => stream.end())
      server.closeAllConnections()
      await new Promise((resolve) => server.close(resolve))
      rmSync(native.__test.directory, { recursive: true, force: true })
    },
  }
}

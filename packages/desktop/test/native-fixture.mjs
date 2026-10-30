import { createPluginServiceFixture } from "./service-fixture.mjs"
import { createRequire } from "node:module"
import { rmSync } from "node:fs"
export async function createNativeFixture() {
  const require = createRequire(import.meta.url)
  const Module = require("node:module")
  const native = require("./electron.cjs")
  const original = Module._load
  Module._load = function (name, ...args) {
    return name === "electron" ? native : original.call(this, name, ...args)
  }
  const { installPluginHost, attachPluginWindow } = require("../../../dist/native/desktop-plugins.cjs")
  const service = await createPluginServiceFixture()
  const { state, url, update } = service
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
      await service.close()
      rmSync(native.__test.directory, { recursive: true, force: true })
    },
  }
}

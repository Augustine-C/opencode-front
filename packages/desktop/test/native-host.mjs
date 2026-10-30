import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { setTimeout as delay } from "node:timers/promises"
import { createNativeFixture } from "./native-fixture.mjs"
const fixture = await createNativeFixture()
const { request, url, update, state } = fixture
async function eventually(check) {
  for (let i = 0; i < 120; i++) {
    if (await check()) return
    await delay(50)
  }
  throw new Error("native host timed out")
}
try {
  await request("NativeSelect", { id: url, url })
  await eventually(async () => (await request("PluginList")).some((plugin) => plugin.id === "third-party-sidebar"))
  const call = () => request("PluginCall", { ipc: "third-party-sidebar.native", method: "increment", input: 1 })
  await eventually(async () => (await request("PluginSubscribe", { ipc: "third-party-sidebar.native" })).available)
  assert.equal(
    await request("PluginCall", { ipc: "third-party-sidebar.native", method: "cliVersion" }),
    JSON.parse(readFileSync(new URL("../../../docs/upstream.json", import.meta.url), "utf8")).version,
  )
  assert.equal(await call(), 1)
  assert.equal(await call(), 2)
  const waiting = new Promise((resolve) =>
    fixture.window.webContents.on("sent", (_channel, event) => {
      if (event._tag === "PluginEvent" && event.name === "waiting") resolve()
    }),
  )
  const pending = fixture.raw({
    method: "PluginCall",
    input: { ipc: "third-party-sidebar.native", method: "wait" },
    request: "cancel-fixture",
  })
  await waiting
  fixture.native.ipcMain.emit(
    "opencode-front:plugin-cancel",
    { sender: fixture.window.webContents, senderFrame: fixture.window.webContents.mainFrame },
    "cancel-fixture",
  )
  assert.equal((await pending).ok, false)
  const embed = await request("PluginCall", { ipc: "third-party-sidebar.native", method: "embed" })
  await request("PluginEmbed", {
    id: embed,
    layout: { visible: true, bounds: { x: 1, y: 2, width: 200, height: 100 } },
  })
  assert.deepEqual(Array.from(await request("PluginCapture", { id: embed })), [1, 2, 3])
  const other = new fixture.native.BrowserWindow(2)
  const foreignCapture = await fixture.native.__test.request(other, { method: "PluginCapture", input: { id: embed } })
  assert.equal(foreignCapture.value, null)
  await request("PluginDisable", { id: "third-party-sidebar" })
  assert.equal((await request("PluginList")).find((plugin) => plugin.id === "third-party-sidebar").enabled, false)
  assert.equal((await request("PluginSubscribe", { ipc: "third-party-sidebar.native" })).available, false)
  assert.equal(await request("PluginCapture", { id: embed }), null)
  await request("PluginEnable", { id: "third-party-sidebar" })
  assert.equal(await call(), 3)
  await request("PluginDisable", { id: "third-party-sidebar" })
  await request("NativeSelect", null)
  await request("NativeSelect", { id: url, url })
  await eventually(async () => (await request("PluginList")).some((plugin) => plugin.id === "third-party-sidebar"))
  assert.equal((await request("PluginList")).find((plugin) => plugin.id === "third-party-sidebar").enabled, false)
  await request("PluginEnable", { id: "third-party-sidebar" })
  await eventually(async () => (await request("PluginSubscribe", { ipc: "third-party-sidebar.native" })).available)
  assert.equal(await call(), 4)
  const second = `${url}/second`
  await request("NativeSelect", { id: second, url: second })
  await eventually(async () => (await request("PluginSubscribe", { ipc: "third-party-sidebar.native" })).available)
  assert.equal(await call(), 1)
  state.hold = true
  await request("NativeSelect", { id: url, url })
  await eventually(() => state.held.length > 0)
  await request("NativeSelect", { id: second, url: second })
  state.held.splice(0).forEach((release) => release())
  await eventually(async () => (await request("PluginSubscribe", { ipc: "third-party-sidebar.native" })).available)
  assert.equal((await request("PluginGuis")).plugins[0].options.label, "second-service")
  assert.equal(await call(), 2)
  state.hold = false
  await request("NativeSelect", { id: url, url })
  await eventually(async () => (await request("PluginSubscribe", { ipc: "third-party-sidebar.native" })).available)
  state.revision = "two"
  update()
  await eventually(async () => (await request("PluginGuis")).plugins[0]?.revision.endsWith(":two"))
  await eventually(async () => (await request("PluginSubscribe", { ipc: "third-party-sidebar.native" })).available)
  assert.equal(await call(), 5)
  state.listed = false
  update()
  await eventually(async () => !(await request("PluginList")).some((plugin) => plugin.id === "third-party-sidebar"))
  assert.equal((await request("PluginSubscribe", { ipc: "third-party-sidebar.native" })).available, false)
  await assert.rejects(request("PluginCall", { ipc: 1, method: "increment" }))
  await assert.rejects(request("NoSuchMethod"))
  console.log(
    JSON.stringify({
      mainEntry: true,
      ipcCall: true,
      disableCleanup: true,
      sqlitePersistence: true,
      revisionReload: true,
      removal: true,
      rawRequestValidation: true,
      serviceIsolationAndStaleReply: true,
      disablePersistence: true,
      cancellation: true,
      embedOwnershipAndCleanup: true,
    }),
  )
} finally {
  await fixture.close()
}

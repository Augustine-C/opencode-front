import assert from "node:assert/strict"
import { chromium } from "playwright"
import { createNativeFixture } from "../../../desktop/test/native-fixture.mjs"
const fixture = await createNativeFixture()
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
})
const errors = []
const consoleErrors = []
const page = await browser.newPage()
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text())
})
page.on("pageerror", (error) => errors.push(error.message))
await page.exposeFunction("nativeRequest", (raw) => fixture.raw(raw))
await page.exposeFunction("nativeCancel", (request) =>
  fixture.native.ipcMain.emit(
    "opencode-front:plugin-cancel",
    { sender: fixture.window.webContents, senderFrame: fixture.window.webContents.mainFrame },
    request,
  ),
)
await page.addInitScript(() => {
  const listeners = new Set()
  window.dispatchNativePluginEvent = (event) => listeners.forEach((listener) => listener(event))
  window.electron = {
    os: "macos",
    windowID: "keeper",
    packaged: false,
    invoke: (method, input, request) => window.nativeRequest({ method, input, request }),
    cancel: (request) => void window.nativeCancel(request),
    on(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
})
fixture.window.webContents.on("sent", (_channel, event) => {
  void page.evaluate((event) => window.dispatchNativePluginEvent?.(event), event).catch(() => {})
})
try {
  await page.goto("http://127.0.0.1:4444/")
  await page.getByRole("button", { name: "Use password", exact: true }).click()
  await page.locator("#server-connect-url").fill(fixture.url)
  await page.getByRole("button", { name: "Connect", exact: true }).click()
  await page.locator('[data-component="connect-server"]').waitFor({ state: "detached" })
  await page.goto("http://127.0.0.1:4444/settings?tab=third-party-sidebar")
  await page.getByText("External sidebar content: one", { exact: true }).waitFor()
  await page.getByText("Native count: 0", { exact: true }).waitFor()
  await page.getByRole("button", { name: "Call native main" }).click()
  await page.getByText("Native count: 1", { exact: true }).waitFor()
  await page.getByRole("textbox", { name: "Plugin draft" }).fill("kept")
  fixture.update()
  await page.waitForTimeout(300)
  assert.equal(await page.getByRole("textbox", { name: "Plugin draft" }).inputValue(), "kept")
  fixture.state.revision = "two"
  fixture.update()
  await page.getByText("External sidebar content: two", { exact: true }).waitFor()
  await page.getByText("Native count: 1", { exact: true }).waitFor()
  await page.goto("http://127.0.0.1:4444/settings?tab=extensions&subtab=plugins")
  const toggle = page.getByRole("switch", { name: "third-party-sidebar", exact: true })
  await toggle.waitFor()
  await toggle.focus()
  await page.keyboard.press("Space")
  await page.getByText("External sidebar", { exact: true }).waitFor({ state: "detached" })
  await page.reload()
  await toggle.waitFor()
  assert.equal(await toggle.isChecked(), false)
  await toggle.focus()
  await page.keyboard.press("Space")
  await page.getByText("External sidebar", { exact: true }).waitFor()
  await page.goto("http://127.0.0.1:4444/settings?tab=servers")
  await page.getByRole("button", { name: "Add server", exact: true }).click()
  await page.getByRole("menuitem", { name: "Add server", exact: true }).click()
  const dialog = page.getByRole("dialog")
  await dialog.waitFor()
  if ((await dialog.locator("#dialog-server-url").count()) === 0)
    await dialog.getByRole("button", { name: "Use password", exact: true }).click()
  const second = `${fixture.url}/second`
  await dialog.locator("#dialog-server-url").fill(second)
  await dialog.getByRole("button", { name: "Add server", exact: true }).click()
  await dialog.waitFor({ state: "detached" })
  await page.goto(`http://127.0.0.1:4444/settings?tab=third-party-sidebar&server=${encodeURIComponent(second)}`)
  await page.getByText("External sidebar content: second-service", { exact: true }).waitFor()
  await page.getByText("Native count: 0", { exact: true }).waitFor()
  await page.getByRole("button", { name: "Call native main" }).click()
  await page.getByText("Native count: 1", { exact: true }).waitFor()
  fixture.state.listed = false
  fixture.update()
  await page.getByRole("tab", { name: "External sidebar", exact: true }).waitFor({ state: "detached" })
  const reads = fixture.state.reads
  const web = await browser.newPage()
  await web.goto("http://127.0.0.1:4444/")
  await web.getByRole("button", { name: "Use password", exact: true }).click()
  await web.locator("#server-connect-url").fill(fixture.url)
  await web.getByRole("button", { name: "Connect", exact: true }).click()
  await web.locator('[data-component="connect-server"]').waitFor({ state: "detached" })
  assert.equal(fixture.state.reads, reads)
  assert.deepEqual(errors, [])
  assert.deepEqual(consoleErrors, [])
  console.log(
    JSON.stringify({
      nativeMainCallAndState: true,
      officialSettings: true,
      disablePersistence: true,
      unchangedRevisionKeepsInput: true,
      pluginUpdated: true,
      removal: true,
      serviceSwitchAndStorageIsolation: true,
      webIsolation: true,
      pageErrors: errors,
    }),
  )
} catch (cause) {
  console.error({
    errors,
    consoleErrors,
    reads: fixture.state.reads,
    installed: await fixture.request("PluginList"),
    guis: (await fixture.request("PluginGuis")).plugins.map(({ id, revision }) => ({ id, revision })),
    body: await page.locator("body").innerText(),
  })
  await page.screenshot({ path: "work/native-migration/browser-failure.png" })
  throw cause
} finally {
  await browser.close()
  await fixture.close()
}

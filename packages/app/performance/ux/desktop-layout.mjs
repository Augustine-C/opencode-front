import { mkdirSync } from "node:fs"
import assert from "node:assert/strict"
import { chromium } from "playwright"
import { createNativeFixture } from "../../../desktop/test/native-fixture.mjs"
mkdirSync("work/layout-implementation", { recursive: true })
const fixture = await createNativeFixture()
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on("pageerror", (e) => errors.push(e.message))
page.setDefaultTimeout(12000)
try {
  await page.exposeFunction("__nativeRequest", (input) => fixture.raw(input))
  await page.exposeFunction("__nativeCancel", (request) =>
    fixture.native.ipcMain.emit(
      "opencode-front:plugin-cancel",
      { sender: fixture.window.webContents, senderFrame: fixture.window.webContents.mainFrame },
      request,
    ),
  )
  fixture.window.webContents.on("sent", (_channel, event) => {
    if (!page.isClosed()) void page.evaluate((event) => window.__desktopEvent?.(event), event).catch(() => {})
  })
  await page.addInitScript(() => {
    const listeners = new Set()
    window.__desktopEvent = (event) => listeners.forEach((fn) => fn(event))
    window.electron = {
      os: "windows",
      windowID: "1",
      packaged: false,
      invoke: (method, input, request) => window.__nativeRequest({ method, input, request }),
      cancel: (request) => window.__nativeCancel(request),
      on: (fn) => {
        listeners.add(fn)
        return () => listeners.delete(fn)
      },
    }
    localStorage.setItem(
      "opencode.global.dat:extension.codearts-proxy.preferences",
      JSON.stringify({ enabled: false, endpoint: "", interval: 15000 }),
    )
  })
  await page.route(`${fixture.url}/api/**`, (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === "/api/session")
      return route.fulfill({ json: { data: [], cursor: {} }, headers: { "Access-Control-Allow-Origin": "*" } })
    if (path === "/api/location")
      return route.fulfill({
        json: {
          directory: "/code/fixture",
          project: { id: "fixture", directory: "/code/fixture", canonical: "/code/fixture" },
        },
        headers: { "Access-Control-Allow-Origin": "*" },
      })
    return route.fallback()
  })
  await page.goto(process.env.APP_PREVIEW_URL || "http://127.0.0.1:4444/")
  await page.getByRole("button", { name: "Use password", exact: true }).click()
  await page.locator("#server-connect-url").fill(fixture.url)
  await page.getByRole("button", { name: "Connect", exact: true }).click()
  await page.locator('[data-component="connect-server"]').waitFor({ state: "detached" })
  await page.goto(new URL("/settings?tab=general", page.url()).href)
  await page.locator('[data-action="settings-tab-groups"] [data-slot="switch-control"]').click()
  const layout = page.locator('[data-component="select-v2"][aria-label="Project group layout"]')
  await layout.click()
  await page.getByRole("option", { name: "Layered", exact: true }).click()
  await page
    .locator("label")
    .filter({ has: page.getByLabel("Side tabs", { exact: true }) })
    .click()
  await page.getByRole("button", { name: "Back to app", exact: true }).click()
  const sidebar = page.locator("#vertical-tabs-sidebar")
  const toolbar = sidebar.locator('[data-slot="sidebar-toolbar"]')
  await toolbar.waitFor()
  assert.equal(await page.locator('[data-slot="titlebar-v2"]').getAttribute("hidden"), "")
  assert.equal(Math.round((await toolbar.boundingBox()).height), 38)
  assert.equal(await sidebar.locator('[data-action="vertical-tabs-new-session"]').count(), 1)
  const column = sidebar.locator('[data-slot="tab-project-rail-container"]')
  assert.equal(Math.round((await column.boundingBox()).width), 200)
  const drag = async (handle, delta) => {
    const r = await handle.boundingBox()
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2)
    await page.mouse.down()
    await page.mouse.move(r.x + r.width / 2 + delta, r.y + r.height / 2, { steps: 8 })
    await page.mouse.up()
  }
  const before = (await sidebar.boundingBox()).width
  await drag(sidebar.locator(':scope > [data-component="resize-handle"]'), 40)
  const wider = (await sidebar.boundingBox()).width
  assert.ok(wider > before + 38)
  await drag(column.locator('[data-component="resize-handle"]'), 20)
  const columnWidth = (await column.boundingBox()).width
  assert.ok(columnWidth > 218)
  await page.reload()
  await column.waitFor()
  assert.ok(Math.abs((await sidebar.boundingBox()).width - wider) <= 1)
  assert.ok(Math.abs((await column.boundingBox()).width - columnWidth) <= 1)
  await page.screenshot({ path: "work/layout-implementation/desktop-wide.png" })
  await page.setViewportSize({ width: 1000, height: 800 })
  await page.waitForFunction(() => document.querySelector('[data-project-compact="true"]'))
  assert.equal(Math.round((await column.boundingBox()).width), 54)
  await page.screenshot({ path: "work/layout-implementation/desktop-compact.png" })
  await toolbar.getByRole("button", { name: "Toggle sidebar", exact: true }).click()
  await page.waitForFunction(
    () => document.querySelector('[data-slot="vertical-tabs-sidebar"]').getBoundingClientRect().width < 2,
  )
  const reopen = page.locator('button[aria-controls="vertical-tabs-sidebar"]:visible').last()
  await reopen.click()
  await page.waitForFunction(
    () => document.querySelector('[data-slot="vertical-tabs-sidebar"]').getBoundingClientRect().width > 200,
  )
  assert.deepEqual(errors, [])
  console.log(
    JSON.stringify({
      nativeFrame: true,
      toolbar: true,
      singleNewEntry: true,
      resizePersistence: true,
      compact: true,
      collapseAndReopen: true,
      errors,
    }),
  )
} catch (error) {
  console.log("page", (await page.locator("body").innerText()).slice(0, 1400))
  console.log("errors", errors)
  throw error
} finally {
  await browser.close()
  await fixture.close()
}

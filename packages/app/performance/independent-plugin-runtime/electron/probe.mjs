import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"

const port = Number(process.env.IP_ELECTRON_DEBUG_PORT || 9237)
const electron = spawn(
  resolve(process.env.ELECTRON_BIN || "node_modules/electron/dist/electron"),
  [
    "--no-sandbox",
    "--disable-gpu",
    "--remote-debugging-port=" + port,
    resolve(dirname(fileURLToPath(import.meta.url))),
  ],
  { stdio: "ignore" },
)
let browser
try {
  const deadline = Date.now() + 30000
  let endpoint
  while (Date.now() < deadline) {
    try {
      endpoint = await fetch("http://127.0.0.1:" + port + "/json/version")
      if (endpoint.ok) break
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  assert(endpoint?.ok, "Electron did not expose its DevTools endpoint")
  browser = await chromium.connectOverCDP("http://127.0.0.1:" + port)
  const pages = browser.contexts().flatMap((context) => context.pages())
  const page = pages[0]
  assert(page, "Electron did not open the fixture window")
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.waitForFunction(() => typeof window.installProbe === "function")
  await page.evaluate(() => window.installProbe())
  assert.equal(await page.locator('[data-probe="shared-solid"]').innerText(), "shared")
  await page.locator('[data-probe-asset="true"]').evaluate((image) => image.decode())
  assert.equal(await page.locator('[data-probe-asset="true"]').evaluate((image) => image.naturalWidth), 2)
  assert.equal(
    await page.locator('[data-probe="shared-solid"]').evaluate((node) => getComputedStyle(node).color),
    "rgb(1, 2, 3)",
  )
  await page.evaluate(() => window.updateProbe())
  assert.equal(await page.locator('[data-probe="shared-solid"]').innerText(), "updated")
  await page.evaluate(() => window.cleanupProbe())
  assert.equal(await page.locator('[data-probe="shared-solid"]').count(), 0)
  assert.equal(await page.locator('[data-probe-style="true"]').count(), 0)
  assert.equal(await page.evaluate(() => window.probeCleanups), 1)
  assert.deepEqual(errors, [])
  console.log(
    JSON.stringify({
      electron: "44.4.5",
      protocol: page.url().startsWith("oc://renderer/"),
      blobImportWithCsp: true,
      cssAndImageBlobs: true,
      sharedContextAndStore: true,
      jsxWebRuntime: true,
      ownerCleanup: true,
      pageErrors: errors,
    }),
  )
} finally {
  await browser?.close().catch(() => {})
  electron.kill("SIGTERM")
}

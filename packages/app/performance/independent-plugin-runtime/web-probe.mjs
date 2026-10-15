import assert from "node:assert/strict"
import { chromium } from "playwright"

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
})
const page = await browser.newPage()
const errors = []
page.on("pageerror", (error) => errors.push(error.message))
await page.goto(process.env.IP_WEB_PROBE_URL || "http://127.0.0.1:4451")
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
    browser: browser.version(),
    blobImportWithCsp: true,
    cssAndImageBlobs: true,
    sharedContextAndStore: true,
    jsxWebRuntime: true,
    ownerCleanup: true,
    pageErrors: errors,
  }),
)
await browser.close()

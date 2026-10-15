import assert from "node:assert/strict"
import { chromium } from "playwright"
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on("pageerror", (error) => errors.push(error.message))
await page.goto("http://127.0.0.1:4444/")
await page.getByRole("button", { name: "Use password", exact: true }).click()
await page.locator("#server-connect-url").fill("ftp://invalid.example")
await page.getByRole("button", { name: "Connect", exact: true }).click()
await page
  .getByRole("alert")
  .filter({ hasText: /address/i })
  .waitFor()
let mode = "unauthorized"
let pending
await page.route("http://fixture.invalid:4096/**", async (route) => {
  if (route.request().method() === "OPTIONS")
    return route.fulfill({
      status: 204,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
    })
  if (!route.request().url().endsWith("/api/info")) return route.fulfill({ status: 200, json: [] })
  if (mode === "slow") {
    pending = route
    return
  }
  if (mode === "network") return route.abort("failed")
  return route.fulfill(
    mode === "unauthorized"
      ? { status: 401, json: { _tag: "UnauthorizedError" } }
      : { status: 200, json: { version: "2.0.29", pid: 0, urls: [], paths: { tmp: "/tmp" } } },
  )
})
await page.locator("#server-connect-url").fill("http://fixture.invalid:4096")
await page.locator("#server-connect-password").fill("synthetic-test-password")
await page.getByRole("button", { name: "Connect", exact: true }).click()
await page
  .getByRole("alert")
  .filter({ hasText: /rejected these credentials/ })
  .waitFor()
await page.getByRole("button", { name: "Edit credentials", exact: true }).click()
assert.equal(await page.locator("#server-connect-password").evaluate((el) => document.activeElement === el), true)
mode = "network"
await page.getByRole("button", { name: "Retry connection", exact: true }).click()
await page
  .getByRole("alert")
  .filter({ hasText: /Could not reach/ })
  .waitFor()
mode = "slow"
await page.getByRole("button", { name: "Retry connection", exact: true }).click()
await page.getByRole("button", { name: "Cancel", exact: true }).waitFor()

await page.getByRole("button", { name: "Cancel", exact: true }).click()
await pending
  ?.fulfill({ status: 200, json: { version: "2.0.29", pid: 0, urls: [], paths: { tmp: "/tmp" } } })
  .catch(() => {})
assert.equal(await page.locator('[data-component="connect-server"]').count(), 1)
assert.equal(
  await page.evaluate(() => Object.values(localStorage).some((value) => value.includes("fixture.invalid"))),
  false,
)
await page.clock.install()
await page.getByRole("button", { name: "Connect", exact: true }).click()
await page.getByRole("button", { name: "Cancel", exact: true }).waitFor()
await page.clock.fastForward(31_000)
await page
  .getByRole("alert")
  .filter({ hasText: /timed out/ })
  .waitFor()
await page.clock.resume()
mode = "success"
await page.getByRole("button", { name: "Retry connection", exact: true }).click()
await page.locator('[data-component="connect-server"]').waitFor({ state: "detached" })
assert.equal(
  await page.evaluate(() => Object.values(localStorage).some((value) => value.includes("fixture.invalid"))),
  true,
)
const secure = await browser.newPage()
await secure.route("https://secure.fixture/**", async (route) => {
  const url = new URL(route.request().url())
  await route.fulfill({ response: await secure.request.get(`http://127.0.0.1:4444${url.pathname}${url.search}`) })
})
await secure.goto("https://secure.fixture/")
await secure.getByRole("button", { name: "Use password", exact: true }).click()
await secure.locator("#server-connect-url").fill("http://remote.fixture:4096")
await secure.getByRole("button", { name: "Connect", exact: true }).click()
await secure
  .getByRole("alert")
  .filter({ hasText: /HTTPS|secure|HTTP/ })
  .waitFor()
console.log(
  JSON.stringify({
    invalidAddress: true,
    unauthorized: true,
    editFocus: true,
    network: true,
    cancelledLateSuccessIgnored: true,
    timeout: true,
    successfulRegistration: true,
    mixedContent: true,
    pageErrors: errors,
  }),
)
await browser.close()

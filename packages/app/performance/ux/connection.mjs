import assert from "node:assert/strict"
import { chromium } from "playwright"
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on("pageerror", (error) => errors.push(error.message))
await page.addInitScript(() => {
  const key = "opencode.global.dat:extension.codearts-proxy.preferences"
  if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({
    enabled: false, endpoint: "http://gateway.fixture:8787", interval: 15000,
  }))
})
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
await page.waitForFunction(() => document.activeElement === document.querySelector("#server-connect-password"))
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
await page.waitForFunction(() => Object.values(localStorage).some((value) => value.includes("fixture.invalid")))
// Drive the real official plugin host and its persisted native-store migration.
await page.goto("http://127.0.0.1:4444/settings?tab=codearts-proxy")
const proxy = page.locator('[data-component="codearts-proxy-settings"]')
await proxy.waitFor()
assert.equal(await proxy.getByLabel("Proxy address").inputValue(), "http://gateway.fixture:8787")
assert.equal(await proxy.getByLabel("Refresh interval (seconds)").inputValue(), "15")
await proxy.getByLabel("Proxy address").fill("http://gateway.fixture:9876")
await proxy.getByText("Enable CodeArts Proxy overview", { exact: true }).click()
await page.reload()
await proxy.waitFor()
assert.equal(await proxy.getByLabel("Proxy address").inputValue(), "http://gateway.fixture:9876")
assert.equal(await proxy.getByRole("switch").isChecked(), true)
assert.equal(await page.getByRole("link", { name: "Frontend plugins", exact: true }).count(), 0)
assert.equal(await page.evaluate(() => localStorage.getItem("opencode.global.dat:extension.codearts-proxy.preferences") !== null), true)
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
for (const method of ["link", "password"]) {
  const paired = await browser.newPage()
  paired.on("pageerror", (error) => errors.push(error.message))
  let redemptions = 0
  await paired.route("http://pairing.fixture:4096/**", async (route) => {
    if (route.request().method() === "OPTIONS")
      return route.fulfill({
        status: 204,
        headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
      })
    if (route.request().url().endsWith("/auth/connect/recovery-code")) {
      redemptions++
      return route.fulfill({ status: 200, json: { token: "synthetic-pairing-token" } })
    }
    if (!route.request().url().endsWith("/api/info")) return route.fulfill({ status: 200, json: [] })
    const authorization = route.request().headers().authorization ?? ""
    const corrected = Buffer.from(authorization.replace(/^Basic\s+/, ""), "base64")
      .toString()
      .endsWith(":corrected-pairing-password")
    return route.fulfill(
      corrected
        ? { status: 200, json: { version: "2.0.29", pid: 0, urls: [], paths: { tmp: "/tmp" } } }
        : { status: 401, json: { _tag: "UnauthorizedError" } },
    )
  })
  await paired.goto("http://127.0.0.1:4444/")
  if (method === "password") await paired.getByRole("button", { name: "Use password", exact: true }).click()
  await paired
    .locator(method === "link" ? "#server-connect-link" : "#server-connect-url")
    .fill("http://pairing.fixture:4096/auth/connect/recovery-code")
  await paired.getByRole("button", { name: "Connect", exact: true }).click()
  await paired
    .getByRole("alert")
    .filter({ hasText: /rejected these credentials/ })
    .waitFor()
  await paired.getByRole("button", { name: "Edit credentials", exact: true }).click()
  assert.equal(
    await paired.locator("#server-connect-url").inputValue(),
    "http://pairing.fixture:4096",
    `${method}: credential editing retains the resolved service address`,
  )
  await paired.waitForFunction(() => document.activeElement === document.querySelector("#server-connect-password"))
  await paired.locator("#server-connect-password").fill("corrected-pairing-password")
  assert.equal(await paired.getByRole("button", { name: "Connect", exact: true }).isEnabled(), true)
  await paired.getByRole("button", { name: "Connect", exact: true }).click()
  await paired.locator('[data-component="connect-server"]').waitFor({ state: "detached" })
  assert.equal(redemptions, 1, "password recovery does not redeem the pairing link again")
  await paired.close()
}
assert.deepEqual(errors, [])
console.log(
  JSON.stringify({
    invalidAddress: true,
    unauthorized: true,
    editFocus: true,
    network: true,
    cancelledLateSuccessIgnored: true,
    timeout: true,
    successfulRegistration: true,
    officialCodeArtsSettings: true,
    nativeStoreMigration: true,
    pluginPreferencesSurviveReload: true,
    mixedContent: true,
    pairingCredentialRecovery: ["link", "password"],
    pageErrors: errors,
  }),
)
await browser.close()

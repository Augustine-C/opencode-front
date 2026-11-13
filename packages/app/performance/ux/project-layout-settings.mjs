import assert from "node:assert/strict"
import { chromium } from "playwright"
import { createNativeFixture } from "../../../desktop/test/native-fixture.mjs"

const fixture = await createNativeFixture()
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
})
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.addInitScript(() =>
    localStorage.setItem(
      "opencode.global.dat:extension.codearts-proxy.preferences",
      JSON.stringify({ enabled: false, endpoint: "", interval: 15000 }),
    ),
  )
  await page.goto(process.env.APP_PREVIEW_URL || "http://127.0.0.1:4444/")
  await page.getByRole("button", { name: "Use password", exact: true }).click()
  await page.locator("#server-connect-url").fill(fixture.url)
  await page.getByRole("button", { name: "Connect", exact: true }).click()
  await page.locator('[data-component="connect-server"]').waitFor({ state: "detached" })
  await page.goto(new URL("/settings?tab=general", page.url()).href)
  const grouping = page.locator('[data-action="settings-tab-groups"] input')
  const toggle = page.locator('[data-action="settings-tab-groups"] [data-slot="switch-control"]')
  const layout = page.locator('[data-component="select-v2"][aria-label="Project group layout"]')
  assert.equal(await layout.count(), 0)
  await toggle.click()
  assert.match(await layout.innerText(), /Single sidebar/)
  await layout.click()
  await page.getByRole("option", { name: "Layered", exact: true }).click()
  await page.reload()
  assert.match(await layout.innerText(), /Layered/)
  assert.equal(await grouping.isChecked(), true)
  await page
    .locator("label")
    .filter({ has: page.getByLabel("Side tabs", { exact: true }) })
    .click()
  await page.reload()
  assert.equal(await page.getByLabel("Side tabs", { exact: true }).isChecked(), true)
  assert.match(await layout.innerText(), /Layered/)
  await toggle.click()
  assert.equal(await layout.count(), 0)
  await toggle.click()
  assert.match(await layout.innerText(), /Layered/)
  await layout.click()
  await page.getByRole("option", { name: "Single sidebar", exact: true }).click()
  await page.reload()
  assert.match(await layout.innerText(), /Single sidebar/)
  await page.getByText("CodeArts Proxy", { exact: true }).first().click()
  await page.getByText("Proxy address", { exact: true }).waitFor()
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ savedLayout: true, savedGrouping: true, sideTabs: true, pluginSettings: true, errors }))
} finally {
  await browser.close()
  await fixture.close()
}

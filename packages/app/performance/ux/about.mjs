import assert from "node:assert/strict"
import { chromium } from "playwright"
import { createNativeFixture } from "../../../desktop/test/native-fixture.mjs"
const fixture = await createNativeFixture()
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
})
try {
  const context = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] })
  const page = await context.newPage()
  const errors = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.goto("http://127.0.0.1:4444/")
  await page.getByRole("button", { name: "Use password", exact: true }).click()
  await page.locator("#server-connect-url").fill(fixture.url)
  await page.getByRole("button", { name: "Connect", exact: true }).click()
  await page.locator('[data-component="connect-server"]').waitFor({ state: "detached" })
  await page.goto("http://127.0.0.1:4444/settings?tab=about")
  const version = page.locator(".settings-about-version")
  await version.waitFor()
  const label = (await version.innerText()).trim()
  await version.click()
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), label)
  await page.getByRole("tooltip", { name: "Copied" }).waitFor()
  await page.locator('[data-component="front-version-info"]').waitFor()
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ versionCopied: label, copiedTooltip: true, independentVersionInfo: true, errors }))
} finally {
  await browser.close()
  await fixture.close()
}

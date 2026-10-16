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
await page.getByRole("button", { name: "Frontend plugins", exact: true }).click()
const input = page.getByLabel("Import frontend or TUI plugin configuration (JSON or JSONC)", { exact: true })
const upload = (value) =>
  input.setInputFiles({ name: "plugins.jsonc", mimeType: "application/json", buffer: Buffer.from(value) })
const saved = () => page.evaluate(() => localStorage.getItem("opencode-front.plugins.v1"))
const initial = await saved()
await upload("{broken")
await page.getByRole("alert").filter({ hasText: "Could not read this JSON" }).waitFor()
await upload('{"plugins": 42}')
await page.getByRole("alert").filter({ hasText: "This configuration is not supported" }).waitFor()
const config = JSON.stringify({
  plugins: ["-connection-status", "https://user:synthetic-secret@example.test/pkg?token=synthetic-token"],
})
await upload(config)
await page.getByRole("region", { name: "Review configuration import" }).waitFor()
assert.equal(await saved(), initial)
assert.equal((await page.locator("body").innerText()).includes("synthetic-secret"), false)
assert.equal((await page.locator("body").innerText()).includes("synthetic-token"), false)
await page.getByRole("button", { name: "Back without applying", exact: true }).click()
assert.equal(await saved(), initial)
assert.equal(await page.getByRole("switch", { name: "Connection status" }).isChecked(), true)
await upload(config)
await page.screenshot({ path: process.env.UX_SCREENSHOT || "/workspace/work/opencode-ux/plugin-preview.png" })
await page.getByRole("button", { name: "Apply configuration", exact: true }).click()
await page.getByRole("region", { name: "Review configuration import" }).waitFor({ state: "detached" })
assert.equal(await page.getByRole("switch", { name: "Connection status" }).isChecked(), false)
const imported = JSON.parse(await saved())
assert.deepEqual(
  imported.plugins.map((entry) => entry.package),
  ["-connection-status"],
)
await page.setViewportSize({ width: 390, height: 844 })
await upload('{"plugins":["connection-status"]}')
await page.getByRole("button", { name: "Apply configuration", exact: true }).click()
await page.getByRole("region", { name: "Review configuration import" }).waitFor({ state: "detached" })
assert.equal(await page.getByRole("switch", { name: "Connection status" }).isChecked(), true)
assert.deepEqual(errors, [])
console.log(
  JSON.stringify({
    syntaxFeedback: true,
    configurationFeedback: true,
    previewNoWrite: true,
    cancelNoWrite: true,
    replacement: true,
    unknownAdaptersIgnored: true,
    sensitiveValuesHidden: true,
    retry: true,
    mobile: true,
    pageErrors: errors,
  }),
)
await browser.close()

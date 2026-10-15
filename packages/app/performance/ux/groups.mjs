import assert from "node:assert/strict"
import { chromium } from "playwright"
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on("pageerror", (error) => errors.push(error.message))
await page.goto(`${process.env.UX_FIXTURE_URL || "http://127.0.0.1:4446"}/?size=100`)
await page.locator('[data-slot="tab-group-navigator-trigger"]').click()
const first = page.locator('[data-slot="tab-instance-group"]').first()
await first.locator("button").click()
assert.equal(await first.locator("button").getAttribute("aria-expanded"), "false")
await page.locator("#attention").evaluate((el) => el.click())
assert.equal(await first.getByRole("img", { name: "Action needed in this group" }).count(), 1)
assert.match(await first.locator("button").getAttribute("aria-label"), /Action needed/)
await first.locator("button").focus()
await page.screenshot({ path: process.env.UX_SCREENSHOT || "/workspace/work/opencode-ux/group-attention.png" })
await page.locator("#attention").evaluate((el) => el.click())
assert.equal(await first.locator('[data-slot="tab-group-status"]').count(), 0)
assert.equal(await first.locator("button").getAttribute("aria-expanded"), "false")
assert.deepEqual(errors, [])
console.log(
  JSON.stringify({
    foldedStatus: true,
    accessibleReason: true,
    clearedAfterHandling: true,
    collapsePreserved: true,
    pageErrors: errors,
  }),
)
await browser.close()

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
const input = page.getByRole("searchbox", { name: "Filter open sessions" })
await input.fill("Instance 1")
assert.equal(await page.getByRole("option").count(), 25)
assert.equal(await page.locator('[data-slot="tab-instance-group"]').count(), 0)
assert.equal(await page.locator('[draggable="true"]').count(), 0)
assert.equal(await page.locator("#selection").innerText(), "s0")
const search = page.getByRole("combobox")
assert.equal(await search.evaluate((el) => document.activeElement === el), true)
await search.evaluate((el) => {
  el.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }))
  el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
})
assert.equal(await page.locator("#selection").innerText(), "s0")
await search.evaluate((el) => el.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true })))
await page.keyboard.press("Escape")
assert.equal(await input.inputValue(), "")
assert.equal(await first.locator("button").getAttribute("aria-expanded"), "false")
await input.fill("Project 0")
assert.equal(await page.getByRole("option").count(), 20)
await page.getByRole("combobox").fill("同名会话")
assert.equal(await page.getByRole("option").count(), 100)
await page.getByRole("combobox").fill("unknown-no-match")
await page.getByRole("status").filter({ hasText: "No open sessions match" }).waitFor()
await page.getByRole("combobox").fill("Instance 1")
await page.keyboard.press("ArrowDown")
assert.equal(await page.getByRole("combobox").evaluate((el) => document.activeElement === el), true)
await page.keyboard.press("Enter")
assert.equal(await page.locator("#selection").innerText(), "s30")
await page.waitForFunction(
  () => document.activeElement === document.querySelector('[data-slot="tab-group-navigator-trigger"]'),
)
await page.locator('[data-slot="tab-group-navigator-trigger"]').click()
await page.keyboard.press("Escape")
assert.equal(await page.locator('[data-slot="tab-group-navigator"]').count(), 0)
for (const viewport of [
  { width: 390, height: 844 },
  { width: 320, height: 640 },
  { width: 640, height: 450 },
]) {
  await page.setViewportSize(viewport)
  await page.locator('[data-slot="tab-group-navigator-trigger"]').click()
  await page.getByRole("searchbox").fill("同名会话")
  const bounds = await page.locator('[data-slot="tab-group-navigator"]').boundingBox()
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= viewport.width)
  await page.keyboard.press("Escape")
  await page.keyboard.press("Escape")
}
assert.deepEqual(errors, [])
console.log(
  JSON.stringify({
    filterOwnership: true,
    ime: true,
    keyboard: true,
    escapeAndFocus: true,
    collapsePreferences: true,
    emptyResults: true,
    responsive: true,
  }),
)
await browser.close()

import assert from "node:assert/strict"
import { chromium } from "playwright"
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on("pageerror", (error) => errors.push(error.message))
await page.goto(`${process.env.UX_FIXTURE_URL || "http://127.0.0.1:4446"}/?history=1`)
const trigger = page.getByRole("button", { name: "Search messages", exact: true })
await trigger.click()
const input = page.getByRole("searchbox", { name: "Search messages" })
await input.fill("needle")
await page.keyboard.press("ArrowDown")
assert.equal(await page.locator(".session-navigation-count").innerText(), "2/4")
await page.getByRole("button", { name: "Load earlier messages", exact: true }).click()
assert.equal(await page.locator(".session-navigation-count").innerText(), "4/6")
await input.fill("never-matches")
await page.getByText("No matches in loaded messages", { exact: true }).waitFor()
await page.getByRole("button", { name: "Search earlier pages", exact: true }).click()
await page.waitForFunction(() => document.querySelector("#history-pages").textContent === "6")
await page.getByRole("button", { name: "Search earlier pages", exact: true }).waitFor()
const act = async (id) => page.locator(id).evaluate((el) => el.click())
await act("#history-slow")
await page.getByRole("button", { name: "Search earlier pages", exact: true }).click()
await page.getByRole("button", { name: "Stop after this page", exact: true }).click()
await act("#history-resolve")
await page.getByRole("button", { name: "Load earlier messages", exact: true }).waitFor()
assert.equal(await page.locator("#history-pages").innerText(), "7")
await page.getByRole("button", { name: "Load earlier messages", exact: true }).click()
await act("#history-reject")
await page.getByRole("alert").filter({ hasText: "Could not load earlier messages" }).waitFor()
await page.getByRole("button", { name: "Load earlier messages", exact: true }).click()
await act("#history-switch")
await act("#history-reject")
await trigger.click()
assert.equal(await page.getByRole("alert").count(), 0)
await act("#history-fast")
await input.fill("never-matches")
await page.getByRole("button", { name: "Load earlier messages", exact: true }).click()
await page.getByText("No matches in this session history", { exact: true }).waitFor()
await page.screenshot({ path: process.env.UX_SCREENSHOT || "/workspace/work/opencode-ux/history-search.png" })
await page.keyboard.press("Escape")
assert.equal(await trigger.evaluate((el) => document.activeElement === el), true)
assert.deepEqual(errors, [])
const initialMiss = await browser.newPage()
initialMiss.on("pageerror", (error) => errors.push(error.message))
await initialMiss.goto(`${process.env.UX_FIXTURE_URL || "http://127.0.0.1:4446"}/?history=1`)
await initialMiss.getByRole("button", { name: "Search messages", exact: true }).click()
await initialMiss.getByRole("searchbox", { name: "Search messages" }).fill("Message 7")
await initialMiss.getByText("No matches in loaded messages", { exact: true }).waitFor()
await initialMiss.getByRole("button", { name: "Load earlier messages", exact: true }).click()
assert.equal(await initialMiss.locator(".session-navigation-count").innerText(), "1/10")
// The next five pages contain no matches; the following batch prepends Message 7 before Message 70.
await initialMiss.getByRole("button", { name: "Search earlier pages", exact: true }).click()
await initialMiss.getByRole("button", { name: "Search earlier pages", exact: true }).waitFor()
assert.equal(await initialMiss.locator(".session-navigation-count").innerText(), "1/10")
await initialMiss.getByRole("button", { name: "Search earlier pages", exact: true }).click()
await initialMiss.getByRole("button", { name: "Load earlier messages", exact: true }).waitFor({ state: "hidden" })
assert.equal(
  await initialMiss.locator(".session-navigation-count").innerText(),
  "2/11",
  "the first paginated hit keeps its identity when an earlier hit arrives",
)
await initialMiss.close()
assert.deepEqual(errors, [])
console.log(
  JSON.stringify({
    stableMatchAfterPrepend: true,
    initialMissThenPaginatedHit: true,
    scopeFeedback: true,
    fivePageLimit: true,
    cancelStopsFurtherPages: true,
    failureAndRetry: true,
    sameIdAcrossInstances: true,
    focusRestoration: true,
    pageErrors: errors,
  }),
)
await browser.close()

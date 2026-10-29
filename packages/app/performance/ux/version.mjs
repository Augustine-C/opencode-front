import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { chromium } from "playwright"
const upstream = JSON.parse(readFileSync(new URL("../../../../docs/upstream.json", import.meta.url), "utf8"))
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on("pageerror", (error) => errors.push(error.message))
await page.goto(`${process.env.UX_FIXTURE_URL || "http://127.0.0.1:4446"}/?version=1`)
const info = page.getByRole("region", { name: "Version information" })
await info.waitFor()
assert.match(await info.innerText(), /unreleased build/)
assert.ok((await info.innerText()).includes(upstream.version))
assert.match(await info.innerText(), /2\.0\.20/)
await info.getByRole("combobox", { name: "Instance" }).selectOption("server-1")
assert.match(await info.innerText(), /2\.0\.21/)
await page.locator("#version-offline").click()
assert.match(await info.innerText(), /Unknown — service unavailable or not checked/)
assert.doesNotMatch(await info.innerText(), /2\.0\.21/)
assert.equal(await info.getByRole("link", { name: "Service tag history" }).count(), 0)
await page.locator("#version-offline").click()
assert.match(await info.innerText(), /2\.0\.21/)
const links = await info
  .locator("a")
  .evaluateAll((nodes) => nodes.map((a) => ({ href: a.href, target: a.target, rel: a.rel })))
assert.equal(links.length, 3)
for (const link of links) {
  assert.ok(link.href.startsWith("https://github.com/"))
  assert.equal(link.target, "_blank")
  assert.match(link.rel, /noopener/)
}
await page.screenshot({ path: process.env.UX_SCREENSHOT || "/workspace/work/opencode-ux/version-info.png" })
await page.setViewportSize({ width: 390, height: 844 })
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
assert.deepEqual(errors, [])
console.log(
  JSON.stringify({
    unreleasedProvenance: true,
    upstreamBaseline: true,
    instanceSwitching: true,
    unavailableIsUnknown: true,
    safeLinks: true,
    mobile: true,
    pageErrors: errors,
  }),
)
await browser.close()

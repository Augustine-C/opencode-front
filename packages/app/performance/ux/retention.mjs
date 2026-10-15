import assert from "node:assert/strict"
import { writeFileSync, mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { chromium } from "playwright"
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on("pageerror", (error) => errors.push(error.message))
await page.goto(`${process.env.UX_FIXTURE_URL || "http://127.0.0.1:4445"}/?size=500`)
const cdp = await page.context().newCDPSession(page)
await cdp.send("Performance.enable")
const samples = []
for (let round = 0; round < 3; round++) {
  for (let cycle = 0; cycle < 20; cycle++) {
    await page.locator('[data-slot="tab-group-navigator-trigger"]').click()
    await page.getByRole("searchbox").fill(round % 2 ? "Instance 1" : "Project 1")
    await page.getByRole("option").first().click()
    await page.locator('[data-slot="tab-group-navigator"]').waitFor({ state: "detached" })
  }
  await cdp.send("HeapProfiler.collectGarbage")
  const result = await cdp.send("Performance.getMetrics")
  samples.push({
    cycles: (round + 1) * 20,
    metrics: result.metrics.filter((m) => ["Nodes", "JSHeapUsedSize", "JSEventListeners"].includes(m.name)),
  })
}
assert.deepEqual(errors, [])
const output = resolve(process.argv[2] || "work/ux-retention.json")
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, JSON.stringify({ browser: browser.version(), sessions: 500, samples, errors }, null, 2))
console.log(JSON.stringify(samples))
await browser.close()

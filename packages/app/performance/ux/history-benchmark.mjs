import assert from "node:assert/strict"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { chromium } from "playwright"
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on("pageerror", (error) => errors.push(error.message))
const samples = []
for (let index = 0; index < 11; index++) {
  await page.goto(`${process.env.UX_FIXTURE_URL || "http://127.0.0.1:4445"}/?history=1`)
  await page.getByRole("button", { name: "Search messages", exact: true }).click()
  await page.getByRole("searchbox", { name: "Search messages" }).fill("Message 7")
  const sample = await page.evaluate(async () => {
    const start = performance.now()
    document.querySelector(".session-navigation-load").click()
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    return {
      durationMs: performance.now() - start,
      count: document.querySelector(".session-navigation-count").textContent,
    }
  })
  assert.equal(sample.count, "1/10")
  if (index) samples.push(sample)
}
assert.deepEqual(errors, [])
const sorted = samples.map((s) => s.durationMs).sort((a, b) => a - b)
const result = {
  browser: browser.version(),
  viewport: "1280x900",
  fixture:
    "Production native search controller and history adapter; mock data provider, 20 loaded messages then 10 earlier messages",
  workload: "Initial zero matches to the first page of matches; two animation frames included",
  warmup: 1,
  samples,
  medianMs: (sorted[4] + sorted[5]) / 2,
  slowestMs: sorted.at(-1),
  errors,
}
const output = resolve(process.argv[2] || "work/ux-history-search.json")
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, JSON.stringify(result, null, 2) + "\n")
console.log(JSON.stringify({ medianMs: result.medianMs, slowestMs: result.slowestMs }))
await browser.close()

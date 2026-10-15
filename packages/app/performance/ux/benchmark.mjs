import { chromium } from "playwright"
import { writeFileSync, mkdirSync } from "node:fs"
import { resolve } from "node:path"
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox", "--enable-precise-memory-info"],
})
const report = {
  date: new Date().toISOString(),
  browser: browser.version(),
  viewport: "1280x900",
  fixture: "production adapters, simulated connections and cached session titles",
  results: [],
}
for (const size of [20, 100, 500]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.goto(`http://127.0.0.1:4445/?size=${size}`)
  const trigger = page.locator('[data-slot="tab-group-navigator-trigger"]')
  await trigger.waitFor()
  const cdp = await page.context().newCDPSession(page)
  await cdp.send("Performance.enable")
  const before = await cdp.send("Performance.getMetrics")
  await trigger.click()
  await page.locator('[data-slot="tab-group-navigator"]').waitFor()
  await page.keyboard.press("Escape")
  const samples = []
  for (let n = 0; n < 10; n++) {
    const sample = await page.evaluate(async () => {
      const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const tasks = []
      const observer = new PerformanceObserver((list) => tasks.push(...list.getEntries().map((e) => e.duration)))
      observer.observe({ type: "longtask" })
      let start = performance.now()
      document.querySelector('[data-slot="tab-group-navigator-trigger"]').click()
      await nextFrame()
      const open = performance.now() - start
      const input = document.querySelector('[data-slot="tab-group-navigator"] input')
      let filter = null
      if (input) {
        start = performance.now()
        input.value = "Conversation 1"
        input.dispatchEvent(new InputEvent("input", { bubbles: true }))
        await nextFrame()
        filter = performance.now() - start
      }
      const row = document.querySelector('[data-slot="tab-group-conversation"]')
      start = performance.now()
      row?.click()
      await nextFrame()
      const select = performance.now() - start
      observer.disconnect()
      return { open, filter, select, longTasks: tasks, selected: document.querySelector("#selection").textContent }
    })
    samples.push(sample)
  }
  const after = await cdp.send("Performance.getMetrics")
  report.results.push({
    size,
    errors,
    samples,
    before: before.metrics.filter((m) => ["JSHeapUsedSize", "Nodes"].includes(m.name)),
    after: after.metrics.filter((m) => ["JSHeapUsedSize", "Nodes"].includes(m.name)),
  })
  await page.close()
}
await browser.close()
const destination = resolve(process.argv[2] || "work/ux-ui.json")
mkdirSync(resolve(destination, ".."), { recursive: true })
writeFileSync(destination, JSON.stringify(report, null, 2))
console.log(
  JSON.stringify(
    report.results.map((r) => ({
      size: r.size,
      errors: r.errors,
      openMedian: r.samples.map((s) => s.open).sort((a, b) => a - b)[5],
      openMax: Math.max(...r.samples.map((s) => s.open)),
    })),
  ),
)

import assert from "node:assert/strict"
import { resolve } from "node:path"
import { chromium } from "playwright"
import { runIndependentPluginAcceptance } from "./acceptance-flow.mjs"

const archivePath = resolve(
  process.argv[2] ?? "examples/independent-plugin-template/dist/example.hello-1.0.0.zip",
)
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
})
const page = await browser.newPage()
const errors = []
page.on("pageerror", (error) => errors.push(error.message))

try {
  await page.goto(process.env.IP_WEB_PROBE_URL || "http://127.0.0.1:4451")
  const result = await runIndependentPluginAcceptance(page, archivePath)
  assert.deepEqual(errors, [])
  console.log(
    JSON.stringify({
      browser: browser.version(),
      package: archivePath,
      ...result,
      pageErrors: errors,
    }),
  )
} finally {
  await browser.close()
}

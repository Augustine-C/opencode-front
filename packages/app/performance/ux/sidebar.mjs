import assert from "node:assert/strict"
import { chromium } from "playwright"

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
})
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto(`${process.env.UX_FIXTURE_URL || "http://127.0.0.1:4445"}/?size=100&sidebar=1`)
  const sidebar = page.locator('[data-slot="vertical-tabs-sidebar"]')
  const rail = sidebar.locator('[data-slot="tab-project-rail-item"]')
  const rows = sidebar.locator("[data-titlebar-tab-slot]:visible")
  const header = sidebar.locator('[data-slot="tab-project-session-header"]')
  await rail.first().waitFor()
  assert.equal(await rail.count(), 20)
  assert.equal(await rows.count(), 5)
  assert.equal(await sidebar.locator('[data-slot="project-avatar-slot"]').count(), 0)
  assert.equal(await rail.locator('[data-component="project-avatar-v2"]').count(), 20)
  assert.equal(await header.locator("strong").innerText(), "Project 0")

  // Layered rows align with the project header instead of inheriting the single sidebar's group indent.
  const titleBox = await rows.first().locator('[data-slot="tab-title"]').boundingBox()
  const headingBox = await header.locator("strong").boundingBox()
  assert.ok(Math.abs(titleBox.x - headingBox.x) <= 4, `Unexpected session indent: ${titleBox.x - headingBox.x}px`)

  // Browsing a project is independent of chat navigation, even when its name is shared by another server.
  await rail.nth(6).click()
  assert.equal(await header.locator("strong").innerText(), "Project 1")
  assert.equal(await page.locator("#selection").innerText(), "s0")
  assert.equal(await rows.count(), 5)
  await header.getByRole("button", { name: "New session", exact: true }).click()
  assert.deepEqual(JSON.parse(await page.locator("#created-draft").innerText()), {
    server: "server-1",
    directory: "/code/project-1",
  })
  await rows.first().locator('[data-slot="tab-link"]').click()
  assert.equal(await page.locator("#selection").innerText(), "s26")

  // Native keyboard/global navigation to another project reveals that project's rows.
  await page.locator("#navigate-other").click()
  assert.equal(await header.locator("strong").innerText(), "Project 4")
  assert.equal(await rail.nth(19).getAttribute("aria-current"), "true")
  assert.equal(await rows.count(), 5)

  // A collapsed single-column group must not hide sessions in the layered view.
  await page.locator("#layout").click()
  assert.equal(await rail.count(), 0)
  assert.equal(await sidebar.locator('[data-slot="tab-project-group"]').count(), 20)
  assert.equal(await sidebar.locator('[data-slot="project-avatar-slot"]').count(), 0)
  const firstGroup = sidebar.locator('[data-slot="tab-project-group"]').first()
  await firstGroup.locator('[data-slot="tab-project-group-toggle"]').click()
  assert.equal(
    await firstGroup.locator('[data-slot="tab-project-group-toggle"]').getAttribute("aria-expanded"),
    "false",
  )
  await page.locator("#layout").click()
  await rail.first().click()
  assert.equal(await rows.count(), 5)
  await page.locator("#layout").click()
  assert.equal(
    await firstGroup.locator('[data-slot="tab-project-group-toggle"]').getAttribute("aria-expanded"),
    "false",
  )

  // Ungrouped rows retain their project identity; grouping removes it but keeps native status and row actions.
  await page.locator("#grouping").click()
  assert.equal(await sidebar.locator('[data-slot="project-avatar-slot"]').count(), 100)
  await page.locator("#grouping").click()
  assert.equal(await sidebar.locator('[data-slot="project-avatar-slot"]').count(), 0)
  await page.locator("#layout").click()
  await rail.nth(1).click()
  await page.locator("#attention").click()
  assert.ok((await rows.locator('[data-slot="tab-close"] [data-mark="attention"]').count()) > 0)
  await rows.first().hover()
  await rows.first().getByRole("button", { name: "Close tab", exact: true }).click()
  assert.equal(await rows.count(), 4)
  assert.equal(await rail.count(), 20)
  if (process.env.UX_SCREENSHOT) await sidebar.screenshot({ path: process.env.UX_SCREENSHOT })

  await page.setViewportSize({ width: 390, height: 844 })
  await rail.first().waitFor({ state: "detached" })
  assert.equal(await rail.count(), 0)
  await page.setViewportSize({ width: 1280, height: 900 })
  await rail.first().waitFor()
  assert.equal(await rail.count(), 20)
  await page.locator("#orientation").click()
  assert.equal(await rail.count(), 0)
  await page.locator("#orientation").click()
  assert.equal(await rail.count(), 20)

  await page.locator("#close-all").click()
  assert.equal(await rail.count(), 0)
  assert.equal(await header.count(), 0)
  assert.equal(await rows.count(), 0)
  assert.deepEqual(errors, [])
  console.log(
    JSON.stringify({
      projectBrowsing: true,
      serverIsolation: true,
      newSessionTarget: true,
      navigationReveal: true,
      collapsePreserved: true,
      nativeRows: true,
      icons: true,
      close: true,
      responsiveFallback: true,
      empty: true,
      errors,
    }),
  )
} finally {
  await browser.close()
}

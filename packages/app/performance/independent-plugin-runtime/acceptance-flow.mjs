import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

export async function runIndependentPluginAcceptance(page, archivePath) {
  const archive = await readFile(archivePath)
  const encoded = archive.toString("base64")
  await page.addInitScript((value) => {
    const binary = atob(value)
    window.independentPackage = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    )
  }, encoded)
  await page.reload()
  await page.waitForFunction(() => !!window.pluginAcceptance?.ready)
  await page.evaluate(() => window.pluginAcceptance.ready)

  const preview = await page.evaluate(() =>
    window.pluginAcceptance.previewZip(),
  )
  assert.equal(preview.action, "install")
  assert.equal(preview.id, "example.hello")
  assert.equal(preview.commandsBefore, 0)
  assert.equal(preview.installationsBefore, 0)

  await page.evaluate(() => window.pluginAcceptance.installZip())
  let state = await page.evaluate(() => window.pluginAcceptance.snapshot())
  assert.deepEqual(state.commands, ["example.hello:hello"])
  assert.deepEqual(state.panels, ["hello"])
  assert.match(state.statuses[0].state, /^enabled$/)
  await page.locator("#plugin-slot img").evaluate((image) => image.decode())
  assert.ok(
    await page
      .locator("#plugin-slot img")
      .evaluate((image) => image.naturalWidth > 0),
  )
  assert.equal(
    await page
      .locator("#plugin-slot .hello-independent-plugin")
      .evaluate((element) => getComputedStyle(element).color),
    "rgb(1, 2, 3)",
  )

  await page.evaluate(() => window.pluginAcceptance.runCommand())
  assert.match(
    await page.locator("#plugin-slot").innerText(),
    /Greetings saved: 1/,
  )
  assert.equal(await page.evaluate(() => window.pluginAcceptance.openPanel()), true)
  assert.deepEqual(
    (await page.evaluate(() => window.pluginAcceptance.snapshot())).activePanels,
    ["hello"],
  )

  await page.reload()
  await page.evaluate(() => window.pluginAcceptance.ready)
  state = await page.evaluate(() => window.pluginAcceptance.snapshot())
  assert.deepEqual(state.commands, ["example.hello:hello"])
  assert.match(state.slotText, /Greetings saved: 1/)
  assert.equal(state.storedGreeting, "1")
  const assetURL = state.assetURL

  await page.evaluate(() => window.pluginAcceptance.disable())
  state = await page.evaluate(() => window.pluginAcceptance.snapshot())
  assert.deepEqual(state.commands, [])
  assert.deepEqual(state.panels, [])
  assert.equal(state.slotText, "")
  assert.equal(
    await page.locator('link[data-plugin-id="example.hello"]').count(),
    0,
  )
  assert.equal(
    await page.evaluate(async (url) => {
      try {
        await fetch(url)
        return true
      } catch {
        return false
      }
    }, assetURL),
    false,
  )

  await page.evaluate(() => window.pluginAcceptance.uninstall(true))
  assert.equal(
    await page.evaluate(() =>
      localStorage.getItem("opencode-front.plugin.v2:example.hello:greetings"),
    ),
    null,
  )
  await page.reload()
  await page.evaluate(() => window.pluginAcceptance.ready)
  assert.equal(
    await page.evaluate(() => window.pluginAcceptance.installationCount()),
    0,
  )
  assert.deepEqual(
    (await page.evaluate(() => window.pluginAcceptance.snapshot())).commands,
    [],
  )

  return {
    previewDidNotExecute: true,
    installedAfterHostBuild: true,
    commandAndPanel: true,
    cssAndAsset: true,
    offlineReload: true,
    disableCleanup: true,
    uninstallAndDataRemoval: true,
  }
}

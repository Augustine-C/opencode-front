import assert from "node:assert/strict"
import { setTimeout as delay } from "node:timers/promises"
import { createPluginServiceFixture } from "../packages/desktop/test/service-fixture.mjs"

// CI only: connects to the disposable archived app launched by desktop-verify-macos.py.
// This protects the packaged preload/native host boundary that boundary doubles cannot exercise.
const endpoint = process.argv[2]
if (!/^ws:\/\/127\.0\.0\.1:\d+\/devtools\/browser\//.test(endpoint ?? ""))
  throw new Error("Expected local CDP endpoint")
const socket = new WebSocket(endpoint)
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true })
  socket.addEventListener("error", reject, { once: true })
})
const pending = new Map()
let sequence = 0
socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data)
  const request = pending.get(message.id)
  if (!request) return
  pending.delete(message.id)
  clearTimeout(request.timer)
  message.error ? request.reject(new Error(JSON.stringify(message.error))) : request.resolve(message.result)
})
function send(method, params = {}, sessionId) {
  const id = ++sequence
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error(`CDP timed out: ${method}`))
    }, 10_000)
    pending.set(id, { resolve, reject, timer })
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
  })
}
const service = await createPluginServiceFixture()
let session
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, session)
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
  return result.result.value
}
async function until(check, description) {
  for (let count = 0; count < 120; count++) {
    if (await check()) return
    await delay(250)
  }
  throw new Error(`Archived desktop verification timed out: ${description}`)
}
try {
  const targets = await send("Target.getTargets")
  const target = targets.targetInfos.find((entry) => entry.type === "page" && entry.url.startsWith("oc://renderer/"))
  assert.ok(target, "archived renderer target must exist")
  session = (await send("Target.attachToTarget", { targetId: target.targetId, flatten: true })).sessionId
  const identity = await evaluate(
    `({os: window.electron?.os, packaged: window.electron?.packaged, node: typeof require})`,
  )
  assert.deepEqual(identity, { os: "macos", packaged: true, node: "undefined" })
  await until(
    () =>
      evaluate(
        `(() => { const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Use password'); if (!button) return false; button.click(); return true })()`,
      ),
    "connection method",
  )
  await until(() => evaluate(`!!document.querySelector('#server-connect-url')`), "connection address")
  await evaluate(
    `(() => { const input = document.querySelector('#server-connect-url'); input.value = ${JSON.stringify(service.url)}; input.dispatchEvent(new Event('input', { bubbles: true })); [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Connect').click() })()`,
  )
  await until(() => evaluate(`!document.querySelector('[data-component="connect-server"]')`), "service registration")
  await send("Page.navigate", { url: "oc://renderer/settings?tab=third-party-sidebar" }, session)
  await until(
    () =>
      evaluate(
        `document.body.textContent.includes('External sidebar content: one') && document.body.textContent.includes('Native count: 0')`,
      ).catch(() => false),
    "independent GUI and main entry",
  )
  await evaluate(
    `(() => { [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Call native main').click() })()`,
  )
  await until(() => evaluate(`document.body.textContent.includes('Native count: 1')`), "native IPC call/state update")
  assert.ok(service.state.reads > 0)
  console.log(
    JSON.stringify({
      archivedPreload: true,
      sandboxedRenderer: true,
      officialBundleDiscovery: true,
      realElectronGuiToMainState: true,
    }),
  )
} catch (cause) {
  if (session) console.error("Archived renderer:", await evaluate("document.body.innerText").catch(() => "unavailable"))
  throw cause
} finally {
  if (session) await evaluate(`window.electron.invoke('NativeSelect', null)`).catch(() => undefined)
  await service.close()
  socket.close()
  pending.forEach((request) => {
    clearTimeout(request.timer)
    request.reject(new Error("CDP closed"))
  })
}

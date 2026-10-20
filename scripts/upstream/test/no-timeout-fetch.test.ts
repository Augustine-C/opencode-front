import { afterAll, expect, test } from "bun:test"
import { createServer } from "node:http"
import { noTimeoutFetch } from "../../../packages/util/src/no-timeout-fetch"

// Adapted from upstream v2.1.1's MIT-licensed no-timeout-fetch test.
// Use a Node HTTP fixture: Bun.serve's stop promise hangs after aborts on Bun 1.3.14.
const pending = Promise.withResolvers<void>()
const server = createServer(async (request, response) => {
  if (request.url === "/hang") {
    pending.resolve()
    return
  }
  const chunks = []
  for await (const chunk of request) chunks.push(Buffer.from(chunk))
  response.setHeader("Content-Type", "application/json")
  response.end(
    JSON.stringify({ method: request.method, header: request.headers["x-test"], body: Buffer.concat(chunks).toString() }),
  )
})
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
const address = server.address()
if (!address || typeof address === "string") throw new Error("HTTP fixture did not bind a TCP port")
const url = `http://127.0.0.1:${address.port}`

afterAll(() => {
  const closed = new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  server.closeAllConnections()
  return closed
})

test("frontend fetch preserves request options", async () => {
  const result = await noTimeoutFetch(new URL("/echo", url), {
    method: "POST",
    headers: { "x-test": "value" },
    body: "payload",
  })
  expect(await result.json()).toEqual({ method: "POST", header: "value", body: "payload" })
})

test("frontend fetch honours cancellation", async () => {
  const controller = new AbortController()
  const request = noTimeoutFetch(new URL("/hang", url), { signal: controller.signal })
  await pending.promise
  controller.abort()
  await expect(request).rejects.toMatchObject({ name: "AbortError" })
})

import { expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { createRendererHandler, registerRendererScheme } from "../../desktop-protocol.cjs"

test("renderer protocol serves only files within its root and falls back to the app shell", async () => {
  const parent = mkdtempSync(join(tmpdir(), "opencode-renderer-"))
  const root = join(parent, "renderer")
  mkdirSync(root)
  writeFileSync(join(root, "index.html"), "app shell")
  writeFileSync(join(root, "asset.js"), "asset")
  writeFileSync(join(parent, "secret.txt"), "secret")
  try {
    const handler = createRendererHandler(root, {
      fetch: async (value: string) => new Response(readFileSync(fileURLToPath(value), "utf8")),
    })
    expect(await (await handler({ url: "oc://renderer/asset.js" })).text()).toBe("asset")
    expect(await (await handler({ url: "oc://renderer/settings" })).text()).toBe("app shell")
    expect((await handler({ url: "oc://other/asset.js" })).status).toBe(403)
    expect((await handler({ url: "oc://renderer/%2e%2e%2fsecret.txt" })).status).toBe(403)
    symlinkSync(join(parent, "secret.txt"), join(root, "secret-link.txt"))
    expect((await handler({ url: "oc://renderer/secret-link.txt" })).status).toBe(403)
    expect((await handler({ url: "bad url" })).status).toBe(400)
  } finally {
    rmSync(parent, { recursive: true, force: true })
  }
})

test("renderer protocol is registered as a secure standard origin before app readiness", () => {
  let registration: unknown
  registerRendererScheme({ registerSchemesAsPrivileged: (value: unknown) => (registration = value) })
  expect(registration).toEqual([
    { scheme: "oc", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
  ])
})

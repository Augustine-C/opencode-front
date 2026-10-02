import { afterEach, expect, test } from "bun:test"
import { fetchOverview, overviewURL, parseOverview } from "../src/plugins/builtin/codearts-proxy-api"

const snapshot = () => ({
  version: 1,
  login: {
    logged_in: true,
    account_name: "account",
    user_name: null,
    domain_id: null,
    creds_expire_at: null,
    obtained_at: null,
  },
  default_model: "model",
  api_key_required: true,
  telemetry_enabled: false,
  usage: {
    benefit: { used: 0, limit: null, remaining: null },
    benefit_error: null,
    package: null,
    package_error: "Package query failed",
    fetched_at: 123,
  },
  usage_error: null,
})
const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})

test("overview preserves unknown quotas, real zero usage and independent upstream failures", () => {
  const result = parseOverview(snapshot())
  expect(result.usage?.benefit).toEqual({ used: 0, limit: null, remaining: null })
  expect(result.usage?.package).toBeNull()
  expect(result.usage?.package_error).toBe("Package query failed")
  expect(parseOverview({ ...snapshot(), usage: null, usage_error: "Not logged in" }).usage_error).toBe("Not logged in")
  for (const benefit of [{ used: "0", limit: 10, remaining: 10 }, { used: -1, limit: 10, remaining: 10 }, {}]) {
    expect(() => parseOverview({ ...snapshot(), usage: { ...snapshot().usage, benefit } })).toThrow("invalid_overview")
  }
  expect(() => parseOverview({ ok: true })).toThrow("invalid_overview")
})

test("overview accepts gateway roots and OpenAI base URLs without allowing embedded credentials", () => {
  for (const suffix of ["", "/", "/v1", "/v1/"])
    expect(overviewURL(`http://127.0.0.1:8787${suffix}`).href).toBe("http://127.0.0.1:8787/api/overview")
  for (const url of ["file:///tmp/status", "https://secret@example.com", "https://example.com?key=secret"])
    expect(() => overviewURL(url)).toThrow()
})

test("external overview fetch carries only explicit gateway auth and rejects failed or incompatible responses", async () => {
  const controller = new AbortController()
  let status = 200
  let payload: unknown = snapshot()
  globalThis.fetch = (async (url, options) => {
    expect(String(url)).toBe("http://127.0.0.1:8787/api/overview")
    expect(options?.credentials).toBe("omit")
    expect(options?.redirect).toBe("error")
    expect(options?.signal).toBe(controller.signal)
    expect(options?.headers).toEqual({ Authorization: "Bearer gateway-key" })
    return new Response(JSON.stringify(payload), { status })
  }) as typeof fetch
  expect((await fetchOverview("http://127.0.0.1:8787/v1", "gateway-key", controller.signal)).login.logged_in).toBe(true)
  status = 401
  await expect(fetchOverview("http://127.0.0.1:8787", "gateway-key", controller.signal)).rejects.toThrow("HTTP 401")
  status = 200
  payload = { ok: true }
  await expect(fetchOverview("http://127.0.0.1:8787", "gateway-key", controller.signal)).rejects.toThrow(
    "invalid_overview",
  )
})

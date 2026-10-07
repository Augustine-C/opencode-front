import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import type { SetupContext } from "@opencode/gui-extensions/sdk"
import type definition from "../src/index"
import { defaults, legacyPreferences } from "../src/preferences"
import { createOverview } from "../src/model"

test("native preferences import old browser enablement and options without retaining gateway credentials", () => {
  expect(legacyPreferences({ plugins: ["connection-status", "codearts-proxy"] })).toEqual({
    ...defaults,
    enabled: true,
  })
  expect(
    legacyPreferences({
      plugins: [
        {
          package: "-codearts-proxy",
          options: { baseURL: "http://localhost:9876/v1", interval: 1000, apiKey: "must-not-persist" },
        },
      ],
    }),
  ).toEqual({ enabled: false, endpoint: "http://localhost:9876/v1", interval: 5000 })
  expect(legacyPreferences({ plugins: ["connection-status"] })).toBeUndefined()
  expect(legacyPreferences(null)).toBeUndefined()
})

test("native owner disposal cancels an in-flight gateway query and clears its memory-only key", async () => {
  const arrived = Promise.withResolvers<string | null>()
  const response = Promise.withResolvers<Response>()
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      arrived.resolve(request.headers.get("Authorization"))
      return response.promise
    },
  })
  const preferences: SetupContext<typeof definition>["stores"]["preferences"] = {
    value: { ...defaults, enabled: true, endpoint: server.url.href },
    ready: () => true,
    update: () => undefined,
    set: () => undefined,
  }
  const fixture = createRoot((dispose) => ({
    model: createOverview({
      stores: { preferences },
      signal: new AbortController().signal,
      t: (key) => key,
    }),
    dispose,
  }))
  try {
    fixture.model.apiKey("gateway-test-key")
    const pending = fixture.model.refresh()
    expect(await arrived.promise).toBe("Bearer gateway-test-key")
    expect(fixture.model.state.loading).toBe(true)
    fixture.dispose()
    await pending
    expect(fixture.model.state.apiKey).toBe("")
    expect(fixture.model.state.loading).toBe(false)
    expect(fixture.model.state.overview).toBeUndefined()
    expect(fixture.model.state.error).toBe("")
  } finally {
    response.resolve(new Response("{}"))
    fixture.dispose()
    server.stop(true)
  }
})

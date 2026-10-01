import { expect, test } from "bun:test"
import { createPluginHost } from "../src/runtime"
import { define, type Context, type SlotClaim } from "../src/index"
import { resolveSlots, type Claim } from "../src/structure"
import { adaptConfig, parseConfig } from "../src/config"

const context: Omit<Context, "ui" | "storage" | "signal" | "options"> = {
  app: { version: "test", platform: "web" },
  client: () => undefined,
  sessionID: () => undefined,
  connection: () => undefined,
  data: { listen: () => () => {} },
}
const plugin = (id: string, setup: Parameters<typeof define>[0]["setup"] = () => {}) =>
  define({
    id,
    name: id,
    apiVersion: 1,
    setup,
  })

test("disable disposes slot claims, commands, event listeners and setup cleanup", async () => {
  const cleaned: string[] = []
  const host = createPluginHost({
    context: {
      ...context,
      data: {
        listen: () => () => {
          cleaned.push("listener")
        },
      },
    },
  })
  host.register(
    plugin("status", (ctx) => {
      ctx.ui.slot({ append: "prompt.footer.status", render: () => "hello" })
      ctx.ui.command({ id: "refresh", title: "Refresh", run: () => {} })
      ctx.data.listen(() => {})
      return () => {
        cleaned.push("setup")
      }
    }),
  )
  await host.enable("status")
  expect(host.state.claims).toHaveLength(1)
  expect(host.state.commands[0].id).toBe("status:refresh")
  await host.disable("status")
  expect(host.state.claims).toHaveLength(0)
  expect(host.state.commands).toHaveLength(0)
  expect(cleaned.sort()).toEqual(["listener", "setup"])
  expect(host.state.statuses[0].state).toBe("disabled")
})

test("failed setup rolls back registrations and records the error", async () => {
  const host = createPluginHost({ context })
  host.register(
    plugin("broken", (ctx) => {
      ctx.ui.slot({ append: "app", render: () => "partial" })
      throw new Error("Invalid credential")
    }),
  )
  await host.enable("broken")
  expect(host.state.claims).toHaveLength(0)
  expect(host.state.statuses[0]).toMatchObject({ state: "error", error: "Invalid credential" })
})

test("disabled asynchronous setup cannot register stale contributions", async () => {
  const host = createPluginHost({ context })
  let release!: () => void
  let aborted = false
  let cleaned = false
  const ready = new Promise<void>((resolve) => {
    release = resolve
  })
  host.register(
    plugin("slow", async (ctx) => {
      await ready
      aborted = ctx.signal.aborted
      ctx.ui.slot({ append: "app", render: () => "stale" })
      return () => {
        cleaned = true
      }
    }),
  )
  const enabled = host.enable("slow")
  await Promise.resolve()
  await host.disable("slow")
  release()
  await enabled
  expect(aborted).toBe(true)
  expect(cleaned).toBe(true)
  expect(host.state.claims).toHaveLength(0)
  expect(host.state.statuses[0].state).toBe("disabled")
})

test("reload replaces the old generation and passes options", async () => {
  const host = createPluginHost({ context })
  const values: unknown[] = []
  let cleanups = 0
  host.register(
    plugin("status", (ctx) => {
      values.push(ctx.options.label)
      ctx.ui.slot({ append: "app", render: () => "hello" })
      return () => {
        cleanups++
      }
    }),
  )
  await host.enable("status", { label: "first" })
  await host.enable("status", { label: "second" })
  expect(values).toEqual(["first", "second"])
  expect(cleanups).toBe(1)
  expect(host.state.claims).toHaveLength(1)
  await host.dispose()
  expect(cleanups).toBe(2)
})

test("config reuses package aliases and options, keeps unsupported packages visible", () => {
  const status = { ...plugin("browser-status"), tui: ["@acme/tui-status@1.0.0"] }
  const result = adaptConfig(
    {
      plugins: [
        { package: "@acme/tui-status@1.0.0", options: { token: "configured" } },
        "missing-adapter",
        "-browser-status",
      ],
    },
    [status],
  )
  expect(result.plugins).toEqual([
    { id: "browser-status", package: "@acme/tui-status@1.0.0", options: { token: "configured" }, enabled: false },
  ])
  expect(result.unsupported).toEqual(["missing-adapter"])
  expect(() => adaptConfig({ plugins: [{ package: "bad", options: [] }] }, [status])).toThrow()
})

function claim(key: string, target: string, kind: "append" | "replace" | "before"): Claim<string> {
  return { key, plugin: key, placement: { target, kind }, render: key }
}
test("replacement suppresses descendants and keeps siblings; last replacement wins", () => {
  const result = resolveSlots({
    paths: new Set(["prompt.footer", "prompt.footer.status"]),
    claims: [
      claim("first", "prompt.footer", "replace"),
      claim("status", "prompt.footer.status", "append"),
      claim("last", "prompt.footer", "replace"),
      claim("sibling", "prompt.footer", "before"),
    ],
  })
  expect(result.slotted.get("prompt.footer")?.replace?.key).toBe("last")
  expect(result.slotted.get("prompt.footer")?.before.map((item) => item.key)).toEqual(["sibling"])
  expect(result.suppressed.map((item) => item.claim.key)).toEqual(["first", "status"])
})
test("missing additive slots degrade to ancestors, missing replacements are suppressed", () => {
  const result = resolveSlots({
    paths: new Set(["prompt.footer"]),
    claims: [claim("status", "prompt.footer.status", "append"), claim("replace", "prompt.footer.file", "replace")],
  })
  expect(result.degraded[0].to).toBe("prompt.footer")
  expect(result.slotted.get("prompt.footer")?.append[0].key).toBe("status")
  expect(result.suppressed[0].claim.key).toBe("replace")
})

// SDK placement exclusivity must be enforced by TypeScript as well as the runtime boundary.
// @ts-expect-error A claim cannot have two placement keys.
const invalid: SlotClaim = { append: "app", before: "app", render: () => "invalid" }
void invalid

test("JSONC import accepts comments and trailing commas and rejects invalid JSON", () => {
  expect(parseConfig('{ // inherited TUI config\n "plugins": ["status",], }')).toEqual({ plugins: ["status"] })
  expect(() => parseConfig('{ "plugins": [ }')).toThrow("Invalid JSONC")
})

test("TUI namespace and negative directives preserve options", () => {
  const result = adaptConfig(
    {
      plugins: [
        { package: "acme.status", options: { endpoint: "https://example.com" } },
        "acme.panel",
        "-acme.*",
        "acme.status",
      ],
    },
    [plugin("acme.status"), plugin("acme.panel")],
  )
  expect(result.plugins.map((entry) => [entry.id, entry.enabled])).toEqual([
    ["acme.status", true],
    ["acme.panel", false],
  ])
  expect(result.plugins[0].options).toEqual({ endpoint: "https://example.com" })
})

test("panel ownership prevents another plugin from closing it and disable removes it", async () => {
  let sessionID: string | undefined
  const host = createPluginHost({ context: { ...context, sessionID: () => sessionID } })
  let first!: Context
  let second!: Context
  host.register(
    plugin("first", (ctx) => {
      first = ctx
    }),
  )
  host.register(
    plugin("second", (ctx) => {
      second = ctx
    }),
  )
  await host.enable("first")
  await host.enable("second")
  expect(first.ui.panel.open("details")).toBe(false)
  sessionID = "session_one"
  expect(first.ui.panel.open("details", { presentation: "fullscreen" })).toBe(true)
  second.ui.panel.close()
  expect(host.state.panel?.plugin).toBe("first")
  expect(host.state.panel?.title).toBe("first")
  expect(first.ui.panel.current()).toEqual({ name: "details", sessionID: "session_one" })
  sessionID = "session_two"
  expect(first.ui.panel.current()).toBeUndefined()
  await host.disable("first")
  expect(host.state.panel).toBeUndefined()
  expect(first.ui.panel.open("stale")).toBe(false)
  await host.dispose()
})

test("plugin state is namespaced and persists across generations", async () => {
  const storage = new Map<string, string>()
  const host = createPluginHost({
    context,
    storage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => {
        storage.set(key, value)
      },
    },
  })
  const seen: unknown[] = []
  host.register(
    plugin("first", (ctx) => {
      seen.push(ctx.storage.get("value"))
      ctx.storage.set("value", 7)
    }),
  )
  host.register(
    plugin("second", (ctx) => {
      seen.push(ctx.storage.get("value"))
    }),
  )
  await host.enable("first")
  await host.enable("second")
  await host.enable("first")
  expect(seen).toEqual([undefined, undefined, 7])
  expect(storage.get("opencode-front.plugin.first.value")).toBe("7")
  await host.dispose()
})

test("host disposal aborts pending setup and prevents new generations", async () => {
  const host = createPluginHost({ context })
  let ctx!: Context
  let release!: () => void
  const waiting = new Promise<void>((resolve) => {
    release = resolve
  })
  host.register(
    plugin("slow", async (context) => {
      ctx = context
      await waiting
    }),
  )
  const enabled = host.enable("slow")
  await Promise.resolve()
  await host.dispose()
  expect(ctx.signal.aborted).toBe(true)
  release()
  await enabled
  await host.enable("slow")
  expect(host.state.statuses[0].state).toBe("disabled")
  expect(host.state.claims).toHaveLength(0)
})

test("panel menu registrations open on demand, reopen after close, and clean up on reload", async () => {
  let sessionID: string | undefined
  let stop!: () => void | Promise<void>
  const host = createPluginHost({ context: { ...context, sessionID: () => sessionID } })
  host.register(
    plugin("menu", (ctx) => {
      stop = ctx.ui.panel.register({ name: "overview", title: "Overview", presentation: "fullscreen" })
    }),
  )
  try {
    await host.enable("menu")
    expect(host.state.panels).toHaveLength(0)
    const entry = host.state.availablePanels[0]
    const firstStop = stop
    expect(entry.open()).toBe(false)
    sessionID = "one"
    expect(entry.open()).toBe(true)
    expect(host.state.panel).toMatchObject({
      plugin: "menu",
      name: "overview",
      title: "Overview",
      sessionID: "one",
      presentation: "fullscreen",
    })
    host.closePanel()
    expect(host.state.availablePanels).toHaveLength(1)
    expect(entry.open()).toBe(true)
    await host.enable("menu")
    expect(host.state.availablePanels).toHaveLength(1)
    expect(host.state.panels).toHaveLength(0)
    expect(entry.open()).toBe(false)
    await firstStop()
    expect(host.state.availablePanels).toHaveLength(1)
    await stop()
    expect(host.state.availablePanels).toHaveLength(0)
    await host.enable("menu")
    await host.disable("menu")
    expect(host.state.availablePanels).toHaveLength(0)
  } finally {
    await host.dispose()
  }
})

test("panel registrations isolate owners and roll back duplicate or failed setup", async () => {
  const host = createPluginHost({ context })
  host.register(
    plugin("first", (ctx) => {
      ctx.ui.panel.register({ name: "overview", title: "First" })
    }),
  )
  host.register(
    plugin("second", (ctx) => {
      ctx.ui.panel.register({ name: "overview", title: "Second" })
    }),
  )
  host.register(
    plugin("duplicate", (ctx) => {
      ctx.ui.panel.register({ name: "overview", title: "One" })
      ctx.ui.panel.register({ name: "overview", title: "Two" })
    }),
  )
  host.register(
    plugin("broken-panel", (ctx) => {
      ctx.ui.panel.register({ name: "overview", title: "Broken" })
      throw new Error("setup failed")
    }),
  )
  try {
    await host.enable("first")
    await host.enable("second")
    await host.enable("duplicate")
    await host.enable("broken-panel")
    expect(host.state.availablePanels.map((panel) => panel.plugin)).toEqual(["first", "second"])
    expect(host.state.statuses.find((status) => status.id === "duplicate")?.state).toBe("error")
    expect(host.state.statuses.find((status) => status.id === "broken-panel")?.state).toBe("error")
    await host.disable("first")
    expect(host.state.availablePanels.map((panel) => panel.title)).toEqual(["Second"])
  } finally {
    await host.dispose()
  }
  expect(host.state.availablePanels).toHaveLength(0)
})

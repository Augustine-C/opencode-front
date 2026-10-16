import { expect, test } from "bun:test"
import { catchError, createEffect, createRoot } from "solid-js"
import { createStore } from "solid-js/store"
import { createPluginHost } from "../src/runtime"
import { define, type Context, type SlotClaim } from "../src/index"
import { resolveSlots, type Claim } from "../src/structure"
import { adaptConfig, parseConfig } from "../src/config"

const context: Omit<
  Context,
  "ui" | "storage" | "signal" | "options" | "assets"
> = {
  app: { version: "test", platform: "web" },
  client: () => undefined,
  sessionID: () => undefined,
  connection: () => undefined,
  data: { listen: () => () => {} },
}
const plugin = (
  id: string,
  setup: Parameters<typeof define>[0]["setup"] = () => {},
) =>
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

test("failed setup rolls back registrations and retry does not duplicate contributions", async () => {
  const outerErrors: unknown[] = []
  const [failure, setFailure] = createStore({ effect: false })
  const root = createRoot((dispose) => ({
    host: catchError(() => createPluginHost({ context }), (error) => outerErrors.push(error))!,
    dispose,
  }))
  const host = root.host
  host.register(
    plugin("broken", (ctx) => {
      ctx.ui.slot({ append: "app", render: () => "partial" })
      ctx.ui.command({ id: "retry", title: "Retry", run: () => {} })
      ctx.ui.panel.register({ name: "retry", title: "Retry" })
      if (ctx.options.fail !== false) throw new Error("Invalid credential")
      createEffect(() => {
        if (failure.effect) throw new Error("Plugin effect failed")
      })
    }),
  )
  await host.enable("broken")
  expect(host.state.claims).toHaveLength(0)
  expect(host.state.statuses[0]).toMatchObject({
    state: "error",
    error: "Invalid credential",
  })
  expect(outerErrors).toEqual([])
  await host.enable("broken", { fail: false })
  await host.enable("broken", { fail: false })
  expect(host.state.statuses[0].state).toBe("enabled")
  expect(host.state.claims).toHaveLength(1)
  expect(host.state.commands).toHaveLength(1)
  expect(host.state.availablePanels).toHaveLength(1)
  setFailure("effect", true)
  expect(host.state.commands).toHaveLength(0)
  expect(host.state.statuses[0]).toMatchObject({ state: "error", error: "Plugin effect failed" })
  expect(outerErrors).toEqual([])
  await host.dispose()
  root.dispose()
})

test("disabled asynchronous setup cannot register stale contributions", async () => {
  const values = new Map<string, string>()
  const host = createPluginHost({
    context,
    storage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value)
      },
    },
  })
  let release!: () => void
  let aborted = false
  let cleaned = false
  let completed!: () => void
  const cleanupDone = new Promise<void>((resolve) => {
    completed = resolve
  })
  const ready = new Promise<void>((resolve) => {
    release = resolve
  })
  host.register(
    plugin("slow", async (ctx) => {
      await ready
      aborted = ctx.signal.aborted
      ctx.storage.set("stale", true)
      ctx.ui.slot({ append: "app", render: () => "stale" })
      return () => {
        cleaned = true
        completed()
      }
    }),
  )
  const enabled = host.enable("slow")
  await Promise.resolve()
  await host.disable("slow")
  release()
  await enabled
  await cleanupDone
  expect(aborted).toBe(true)
  expect(cleaned).toBe(true)
  expect(values.size).toBe(0)
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
  const status = {
    ...plugin("browser-status"),
    tui: ["@acme/tui-status@1.0.0"],
  }
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
    {
      id: "browser-status",
      package: "@acme/tui-status@1.0.0",
      options: { token: "configured" },
      enabled: false,
    },
  ])
  expect(result.unsupported).toEqual(["missing-adapter"])
  expect(() =>
    adaptConfig({ plugins: [{ package: "bad", options: [] }] }, [status]),
  ).toThrow()
})

function claim(
  key: string,
  target: string,
  kind: "append" | "replace" | "before",
): Claim<string> {
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
  expect(
    result.slotted.get("prompt.footer")?.before.map((item) => item.key),
  ).toEqual(["sibling"])
  expect(result.suppressed.map((item) => item.claim.key)).toEqual([
    "first",
    "status",
  ])
})
test("missing additive slots degrade to ancestors, missing replacements are suppressed", () => {
  const result = resolveSlots({
    paths: new Set(["prompt.footer"]),
    claims: [
      claim("status", "prompt.footer.status", "append"),
      claim("replace", "prompt.footer.file", "replace"),
    ],
  })
  expect(result.degraded[0].to).toBe("prompt.footer")
  expect(result.slotted.get("prompt.footer")?.append[0].key).toBe("status")
  expect(result.suppressed[0].claim.key).toBe("replace")
})

// SDK placement exclusivity must be enforced by TypeScript as well as the runtime boundary.
const invalid: SlotClaim = {
  append: "app",
  // @ts-expect-error A claim cannot have two placement keys.
  before: "app",
  render: () => "invalid",
}
void invalid

test("JSONC import accepts comments and trailing commas and rejects invalid JSON", () => {
  expect(
    parseConfig('{ // inherited TUI config\n "plugins": ["status",], }'),
  ).toEqual({ plugins: ["status"] })
  expect(() => parseConfig('{ "plugins": [ }')).toThrow("Invalid JSONC")
})

test("TUI namespace and negative directives preserve options", () => {
  const result = adaptConfig(
    {
      plugins: [
        {
          package: "acme.status",
          options: { endpoint: "https://example.com" },
        },
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
  expect(result.plugins[0].options).toEqual({
    endpoint: "https://example.com",
  })
})

test("panel ownership prevents another plugin from closing it and disable removes it", async () => {
  let sessionID: string | undefined
  const host = createPluginHost({
    context: { ...context, sessionID: () => sessionID },
  })
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
  expect(first.ui.panel.open("details", { presentation: "fullscreen" })).toBe(
    true,
  )
  second.ui.panel.close()
  expect(host.state.panel?.plugin).toBe("first")
  expect(host.state.panel?.title).toBe("first")
  expect(first.ui.panel.current()).toEqual({
    name: "details",
    sessionID: "session_one",
  })
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
  const storageVersions: number[] = []
  host.register(
    plugin("example.foo", (ctx) => {
      storageVersions.push(ctx.storage.version)
      seen.push(ctx.storage.get("bar.value"))
      ctx.storage.set("bar.value", 7)
    }),
  )
  host.register(
    plugin("example.foo.bar", (ctx) => {
      seen.push(ctx.storage.get("value"))
      ctx.storage.set("value", 9)
    }),
  )
  await host.enable("example.foo")
  await host.enable("example.foo.bar")
  await host.enable("example.foo")
  expect(seen).toEqual([undefined, undefined, 7])
  expect(storageVersions).toEqual([1, 1])
  expect(storage.get("opencode-front.plugin.v2:example.foo:bar.value")).toBe("7")
  expect(storage.get("opencode-front.plugin.v2:example.foo.bar:value")).toBe("9")
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
  // Cancellation must settle enable even if the plugin never resolves setup.
  await enabled
  release()
  await enabled
  await host.enable("slow")
  expect(host.state.statuses[0].state).toBe("disabled")
  expect(host.state.claims).toHaveLength(0)
})

test("disable cancels an enable still waiting for the previous generation's cleanup", async () => {
  const host = createPluginHost({ context })
  let finish!: () => void
  const waiting = new Promise<void>((resolve) => {
    finish = resolve
  })
  let setups = 0
  host.register(
    plugin("waiting", () => {
      setups++
      return () => waiting
    }),
  )
  await host.enable("waiting")
  const next = host.enable("waiting")
  await host.disable("waiting")
  finish()
  await next
  expect(setups).toBe(1)
  expect(host.state.statuses[0].state).toBe("disabled")
  await host.dispose()
})

test("panel menu registrations open on demand, reopen after close, and clean up on reload", async () => {
  let sessionID: string | undefined
  let stop!: () => void | Promise<void>
  const host = createPluginHost({
    context: { ...context, sessionID: () => sessionID },
  })
  host.register(
    plugin("menu", (ctx) => {
      stop = ctx.ui.panel.register({
        name: "overview",
        title: "Overview",
        presentation: "fullscreen",
      })
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
    expect(host.state.availablePanels.map((panel) => panel.plugin)).toEqual([
      "first",
      "second",
    ])
    expect(
      host.state.statuses.find((status) => status.id === "duplicate")?.state,
    ).toBe("error")
    expect(
      host.state.statuses.find((status) => status.id === "broken-panel")?.state,
    ).toBe("error")
    await host.disable("first")
    expect(host.state.availablePanels.map((panel) => panel.title)).toEqual([
      "Second",
    ])
  } finally {
    await host.dispose()
  }
  expect(host.state.availablePanels).toHaveLength(0)
})

test("import preview describes replacement and ignored adapters without applying runtime changes", async () => {
  const { previewConfig } = await import("../src/config")
  const available = [plugin("old"), plugin("new")]
  const current = [{ id: "old", package: "old", enabled: true, options: {} }]
  const preview = previewConfig(
    { plugins: ["new", "uninstalled"] },
    available,
    current,
  )
  expect(preview.changes.map(({ id, action }) => [id, action])).toEqual([
    ["old", "disable"],
    ["new", "enable"],
  ])
  expect(preview.unsupported).toEqual(["uninstalled"])
  expect(current).toEqual([
    { id: "old", package: "old", enabled: true, options: {} },
  ])
})

test("dynamic definitions appear reactively and unregister waits for contribution cleanup", async () => {
  const cleaned: string[] = []
  const host = createPluginHost({ context })
  const definition = plugin("independent.dynamic", (ctx) => {
    ctx.ui.command({ id: "hello", title: "Hello", run: () => {} })
    ctx.ui.slot({ append: "app", render: () => "loaded" })
    return () => {
      cleaned.push("done")
    }
  })
  host.register(definition)
  expect(host.definitions()).toEqual([definition])
  await host.enable(definition.id)
  expect(host.state.commands).toHaveLength(1)
  expect(await host.unregister(definition.id, definition)).toBe(true)
  expect(host.definitions()).toEqual([])
  expect(host.state.commands).toHaveLength(0)
  expect(host.state.claims).toHaveLength(0)
  expect(cleaned).toEqual(["done"])
  expect(await host.unregister(definition.id)).toBe(false)
  await host.dispose()
})

test("runtime gives plugins an explicit failure when no package resource owner exists", async () => {
  const host = createPluginHost({ context })
  host.register(
    plugin("built-in", (ctx) => {
      expect(() => ctx.assets.url("image.svg")).toThrow("has no package asset")
    }),
  )
  await host.enable("built-in")
  expect(host.state.statuses[0].state).toBe("enabled")
  await host.dispose()
})

test("declared options gate setup and resolve imported defaults without losing saved values", async () => {
  const { resetConfiguration, resolveConfiguration } = await import("../src/configuration")
  const seen: Readonly<Record<string, unknown>>[] = []
  const definition = define({
    ...plugin("configured", (ctx) => {
      seen.push(ctx.options)
    }),
    configuration: {
      fields: [
        { key: "endpoint", type: "string", label: "Endpoint", required: true },
        { key: "interval", type: "number", label: "Interval", default: 10, min: 5, max: 100 },
        { key: "visible", type: "boolean", label: "Visible", default: true, required: true },
        { key: "mode", type: "select", label: "Mode", default: "panel", options: [{ value: "panel", label: "Panel" }] },
      ],
    },
  })
  const host = createPluginHost({ context })
  host.register(definition)
  try {
    for (const options of [
      {},
      { endpoint: " " },
      { endpoint: 123 },
      { endpoint: "ok", interval: "10" },
      { endpoint: "ok", interval: 4 },
      { endpoint: "ok", interval: 101 },
      { endpoint: "ok", interval: NaN },
      { endpoint: "ok", visible: null },
      { endpoint: "ok", mode: "unknown" },
      { endpoint: "ok", mode: "" },
    ]) {
      await host.enable(definition.id, options)
      expect(host.state.statuses[0].state).toBe("configuration-required")
    }
    expect(seen).toEqual([])
    const imported = adaptConfig(
      { plugins: [{ package: definition.id, options: { endpoint: "ok", visible: false, extra: { keep: 1 } } }] },
      [definition],
    )
    await host.enable(definition.id, imported.plugins[0].options)
    expect(host.state.statuses[0].state).toBe("enabled")
    expect(seen).toEqual([{ endpoint: "ok", interval: 10, visible: false, mode: "panel", extra: { keep: 1 } }])
    const saved = { endpoint: "ok", interval: "old incompatible value", extra: { keep: 1 } }
    const resolved = resolveConfiguration(definition.configuration, saved)
    expect(resolved.issues).toEqual([{ key: "interval", code: "type" }])
    expect(resolved.options.interval).toBe("old incompatible value")
    expect(resetConfiguration(definition.configuration!, saved)).toEqual({
      interval: 10,
      visible: true,
      mode: "panel",
      extra: { keep: 1 },
    })
    expect(saved.interval).toBe("old incompatible value")
  } finally {
    await host.dispose()
  }
})

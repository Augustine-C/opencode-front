import { createRoot, getOwner, runWithOwner, type Owner } from "solid-js"
import { createStore } from "solid-js/store"
import type { Command, Context, Definition, Placement, SlotClaim, SlotPath } from "./index"
import type { Claim } from "./structure"

export type Render = SlotClaim["render"]
export type PluginStatus = { id: string; state: "disabled" | "loading" | "enabled" | "error"; error?: string }
export function createPluginHost(input: {
  context: Omit<Context, "ui" | "options" | "signal" | "storage">
  storage?: Pick<Storage, "getItem" | "setItem">
  owner?: Owner | null
}) {
  const owner = input.owner ?? getOwner()
  const [state, setState] = createStore({
    claims: [] as Claim<Render>[],
    commands: [] as (Command & { plugin: string })[],
    statuses: [] as PluginStatus[],
    panel: undefined as
      | { plugin: string; name: string; title: string; sessionID: string; presentation: "panel" | "fullscreen" }
      | undefined,
  })
  const definitions = new Map<string, Definition>()
  const active = new Map<string, { abort: AbortController; cleanup: Set<() => void | Promise<void>> }>()
  let sequence = 0
  let disposed = false
  function report(id: string, error: unknown) {
    status(id, "error", error instanceof Error ? error.message : String(error))
  }
  function status(id: string, next: PluginStatus["state"], error?: string) {
    const index = state.statuses.findIndex((value) => value.id === id)
    if (index < 0) {
      setState("statuses", state.statuses.length, { id, state: next, error })
      return
    }
    setState("statuses", index, { state: next, error })
  }
  function remove(id: string) {
    if (state.panel?.plugin === id) setState("panel", undefined)
    setState("claims", (claims) => claims.filter((claim) => claim.plugin !== id))
    setState("commands", (commands) => commands.filter((command) => command.plugin !== id))
  }
  async function disable(id: string) {
    const generation = active.get(id)
    active.delete(id)
    generation?.abort.abort()
    remove(id)
    status(id, "disabled")
    if (!generation) return
    const results = await Promise.allSettled([...generation.cleanup].map((cleanup) => Promise.resolve().then(cleanup)))
    results.forEach((result) => {
      if (result.status === "rejected") report(id, result.reason)
    })
  }
  async function enable(id: string, options: Record<string, unknown> = {}) {
    await disable(id)
    if (disposed) return
    const plugin = definitions.get(id)
    if (!plugin) throw new Error(`Unknown frontend plugin: ${id}`)
    const generation = { abort: new AbortController(), cleanup: new Set<() => void | Promise<void>>() }
    active.set(id, generation)
    status(id, "loading")
    const alive = () => active.get(id) === generation && !generation.abort.signal.aborted
    function track(cleanup: () => void | Promise<void>) {
      generation.cleanup.add(cleanup)
      return () => {
        generation.cleanup.delete(cleanup)
        return cleanup()
      }
    }
    const context: Context = {
      ...input.context,
      options,
      signal: generation.abort.signal,
      data: {
        listen(handler) {
          if (!alive()) return () => {}
          const cleanup = runWithOwner(owner, () =>
            createRoot((dispose) => {
              const stop = input.context.data.listen(handler)
              return () => {
                stop()
                dispose()
              }
            }),
          )!
          return track(cleanup)
        },
      },
      storage: {
        get<T>(key: string): T | undefined {
          const value = input.storage?.getItem(`opencode-front.plugin.${id}.${key}`)
          return value === null || value === undefined ? undefined : (JSON.parse(value) as T)
        },
        set(key, value) {
          input.storage?.setItem(`opencode-front.plugin.${id}.${key}`, JSON.stringify(value))
        },
      },
      ui: {
        panel: {
          open(name, options) {
            const sessionID = input.context.sessionID()
            if (!alive() || !sessionID) return false
            setState("panel", {
              plugin: id,
              name,
              title: options?.title ?? plugin.name,
              sessionID,
              presentation: options?.presentation ?? "panel",
            })
            return true
          },
          close() {
            if (state.panel?.plugin === id) setState("panel", undefined)
          },
          current() {
            const panel = state.panel
            if (panel?.plugin !== id || panel.sessionID !== input.context.sessionID()) return
            return { name: panel.name, sessionID: panel.sessionID }
          },
        },
        slot<P extends SlotPath>(claim: SlotClaim<P>) {
          const keys = (["before", "after", "prepend", "append", "replace"] as const).filter(
            (key) => claim[key] !== undefined,
          )
          if (keys.length !== 1) throw new Error("A slot claim must specify exactly one placement")
          if (!alive()) return () => {}
          const kind: Placement = keys[0]
          const key = `${id}:${++sequence}`
          setState("claims", state.claims.length, {
            key,
            plugin: id,
            placement: { kind, target: claim[kind]! },
            render: claim.render as Render,
          })
          return track(() => setState("claims", (claims) => claims.filter((claim) => claim.key !== key)))
        },
        command(command) {
          if (!alive()) return () => {}
          const key = `${id}:${command.id}`
          if (state.commands.some((entry) => entry.id === key)) throw new Error(`Duplicate command: ${key}`)
          setState("commands", state.commands.length, { ...command, id: key, plugin: id })
          return track(() => setState("commands", (commands) => commands.filter((command) => command.id !== key)))
        },
      },
    }
    try {
      const pending = runWithOwner(owner, () =>
        createRoot((dispose) => {
          generation.cleanup.add(dispose)
          return plugin.setup(context)
        }),
      )
      const cleanup = await pending
      if (cleanup) {
        if (alive()) generation.cleanup.add(cleanup)
        else await cleanup()
      }
      if (alive()) status(id, "enabled")
    } catch (error) {
      if (!alive()) return
      await disable(id)
      report(id, error)
    }
  }
  return {
    state,
    enable,
    disable,
    report,
    closePanel: () => setState("panel", undefined),
    togglePanel: () => {
      if (state.panel) setState("panel", "presentation", state.panel.presentation === "panel" ? "fullscreen" : "panel")
    },
    register(plugin: Definition) {
      if (disposed) throw new Error("Plugin host is disposed")
      if (plugin.apiVersion !== 1) throw new Error(`Unsupported plugin API: ${plugin.id}`)
      if (definitions.has(plugin.id)) throw new Error(`Duplicate plugin: ${plugin.id}`)
      definitions.set(plugin.id, plugin)
      status(plugin.id, "disabled")
    },
    definitions: () => [...definitions.values()],
    dispose: () => {
      disposed = true
      return Promise.all([...active.keys()].map(disable))
    },
  }
}
export type PluginHost = ReturnType<typeof createPluginHost>

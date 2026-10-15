import * as solid from "solid-js"
import * as solidWeb from "solid-js/web"
import * as solidStore from "solid-js/store"
import { createRoot, getOwner, runWithOwner } from "solid-js"
import type { Context, Definition } from "@opencode/frontend-plugin"
import { PLUGIN_RUNTIME_SYMBOL } from "@opencode/frontend-plugin/independent"
import type { IndependentPluginRepository } from "./repository"
import { createPluginResources } from "./resources"

type Entrypoint = {
  setup?: (
    context: Context,
  ) =>
    | void
    | (() => void | Promise<void>)
    | Promise<void | (() => void | Promise<void>)>
}

export function exposeSharedPluginRuntime() {
  Reflect.set(globalThis, Symbol.for(PLUGIN_RUNTIME_SYMBOL), {
    solid,
    web: solidWeb,
    store: solidStore,
  })
}

function moduleURL(bytes: Uint8Array) {
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer
  return URL.createObjectURL(new Blob([buffer], { type: "text/javascript" }))
}

export function createIndependentPluginDefinition(input: {
  repository: Pick<IndependentPluginRepository, "module">
  id: string
  name: string
  digest: string
}): Definition {
  return {
    id: input.id,
    name: input.name,
    apiVersion: 1,
    async setup(context) {
      const owner = getOwner()
      const module = await input.repository.module(input.digest)
      if (module.manifest.id !== input.id)
        throw new Error(
          "Plugin package ID does not match its installation record",
        )
      const entry = module.files.find(
        (file) => file.path === module.manifest.entry,
      )?.bytes
      if (!entry)
        throw new Error(
          `Plugin ${input.id} package is missing its entry module`,
        )
      const resources = createPluginResources(module)
      const release = () => resources.dispose()
      if (context.signal.aborted) {
        release()
        throw new DOMException("Plugin activation was cancelled", "AbortError")
      }
      context.signal.addEventListener("abort", release, { once: true })
      let moduleDispose: (() => void) | undefined
      try {
        await resources.attachStyles(context.signal)
        if (context.signal.aborted)
          throw new DOMException(
            "Plugin activation was cancelled",
            "AbortError",
          )
        const url = moduleURL(entry)
        let namespace: Entrypoint
        try {
          namespace = (await import(/* @vite-ignore */ url)) as Entrypoint
        } finally {
          URL.revokeObjectURL(url)
        }
        if (context.signal.aborted)
          throw new DOMException(
            "Plugin activation was cancelled",
            "AbortError",
          )
        if (typeof namespace.setup !== "function")
          throw new Error(
            `Plugin ${input.id} entry does not export setup(context)`,
          )
        const moduleCleanup = await runWithOwner(owner ?? null, () =>
          createRoot((dispose) => {
            moduleDispose = dispose
            return namespace.setup!({ ...context, assets: resources.assets })
          }),
        )
        const cleanup =
          typeof moduleCleanup === "function" ? moduleCleanup : undefined
        if (cleanup !== undefined && typeof cleanup !== "function") {
          throw new Error(
            `Plugin ${input.id} setup returned an unsupported cleanup value`,
          )
        }
        let closed = false
        return async () => {
          if (closed) return
          closed = true
          context.signal.removeEventListener("abort", release)
          try {
            await cleanup?.()
          } finally {
            moduleDispose?.()
            release()
          }
        }
      } catch (error) {
        context.signal.removeEventListener("abort", release)
        moduleDispose?.()
        release()
        throw error
      }
    },
  }
}

import { parse, printParseErrorCode, type ParseError } from "jsonc-parser"
import type { Definition } from "./index"

export type PluginConfig = { plugins?: Array<string | { package: string; options?: Record<string, unknown> }> }
export type ResolvedPlugin = { id: string; package: string; options: Record<string, unknown>; enabled: boolean }
export type ConfigResult = { plugins: ResolvedPlugin[]; unsupported: string[] }
export function parseConfig(text: string): unknown {
  const errors: ParseError[] = []
  const value: unknown = parse(text, errors, { allowTrailingComma: true })
  if (errors.length)
    throw new Error(`Invalid JSONC: ${printParseErrorCode(errors[0].error)} at offset ${errors[0].offset}`)
  return value
}

// Config selects explicitly installed browser adapters. Imported package paths never execute.
export function adaptConfig(value: unknown, available: readonly Definition[]): ConfigResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected a configuration object")
  const entries = (value as PluginConfig).plugins ?? []
  if (!Array.isArray(entries)) throw new Error("plugins must be an array")
  const plugins = new Map<string, ResolvedPlugin>(
    available
      .filter((plugin) => plugin.defaultEnabled)
      .map((plugin) => [plugin.id, { id: plugin.id, package: plugin.id, options: {}, enabled: true }]),
  )
  const unsupported: string[] = []
  for (const item of entries) {
    const entry = typeof item === "string" ? { package: item } : item
    if (!entry || typeof entry.package !== "string") throw new Error("Each plugin needs a package name")
    if (
      entry.options !== undefined &&
      (!entry.options || typeof entry.options !== "object" || Array.isArray(entry.options))
    )
      throw new Error("Plugin options must be an object")
    const enabled = !entry.package.startsWith("-")
    const source = entry.package.replace(/^-/, "")
    const selected = available.filter(
      (plugin) =>
        source === "*" ||
        plugin.id === source ||
        plugin.tui?.includes(source) ||
        (source.endsWith(".*") && plugin.id.startsWith(source.slice(0, -1))),
    )
    if (!selected.length) {
      if (enabled) unsupported.push(entry.package)
      continue
    }
    for (const plugin of selected) {
      const previous = plugins.get(plugin.id)
      plugins.set(plugin.id, {
        id: plugin.id,
        package: previous?.package ?? source,
        options: entry.options ?? previous?.options ?? {},
        enabled,
      })
    }
  }
  return { plugins: [...plugins.values()], unsupported }
}

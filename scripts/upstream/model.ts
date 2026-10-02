import { createHash } from "node:crypto"

export type Rules = {
  version: 1
  imports: { source: string; target: string; exclude?: string[]; only?: string[]; keep?: string[] }[]
  overlays: { id: string; reason: string; files: string[]; adapters?: string[] }[]
  local: { patterns: string[]; reason: string }[]
}
export type SourceFile = { path: string; blob: string; mode: string }
export type ImportFile = SourceFile & { target: string }
export type Inventory = { commit: string; files: ImportFile[] }
const matches = (path: string, pattern: string) => new Bun.Glob(pattern).match(path)

export function validateRules(rules: Rules) {
  if (rules.version !== 1) throw new Error("Unsupported import rule version")
  const safe = (path: string) => {
    if (
      !path ||
      path.startsWith("/") ||
      path.includes("\\") ||
      path.split("/").some((part) => part === ".." || part === ".") ||
      path.includes("\0")
    ) {
      throw new Error(`Unsafe import path: ${path}`)
    }
  }
  const seen = new Set<string>()
  for (const rule of rules.imports) {
    safe(rule.source)
    safe(rule.target)
    for (const file of [...(rule.only ?? []), ...(rule.keep ?? [])]) safe(file)
  }
  for (const overlay of rules.overlays) {
    if (!overlay.id || !overlay.reason) throw new Error("Overlays require an id and a reason")
    for (const file of overlay.files) {
      safe(file)
      if (seen.has(file)) throw new Error(`Duplicate overlay: ${file}`)
      seen.add(file)
    }
  }
}

export function selectImports(source: readonly SourceFile[], rules: Rules): ImportFile[] {
  const selected = new Map<string, ImportFile>()
  for (const file of source) {
    for (const rule of rules.imports) {
      const relative =
        file.path === rule.source
          ? ""
          : file.path.startsWith(`${rule.source}/`)
            ? file.path.slice(rule.source.length + 1)
            : undefined
      if (relative === undefined || (rule.only && !rule.only.includes(relative))) continue
      if (rule.exclude?.some((pattern) => matches(relative, pattern)) && !rule.keep?.includes(relative)) continue
      const target = relative ? `${rule.target}/${relative}` : rule.target
      if (selected.has(target)) throw new Error(`Overlapping import target: ${target}`)
      if (file.mode !== "100644" && file.mode !== "100755" && file.mode !== "120000")
        throw new Error(`Unsupported import mode: ${file.path}`)
      selected.set(target, { ...file, target })
    }
  }
  return [...selected.values()].sort((a, b) => a.target.localeCompare(b.target, "en"))
}
export const gitBlob = (bytes: Uint8Array) =>
  createHash("sha1").update(`blob ${bytes.byteLength}\0`).update(bytes).digest("hex")

export function auditImports(input: { inventory: Inventory; rules: Rules; files: ReadonlyMap<string, string> }) {
  const overlays = new Map(
    input.rules.overlays.flatMap((layer) => layer.files.map((file) => [file, layer.id] as const)),
  )
  const imported = new Set(input.inventory.files.map((file) => file.target))
  const errors: string[] = []
  let pristine = 0,
    adapted = 0,
    local = 0
  for (const file of input.inventory.files) {
    const hash = input.files.get(file.target)
    if (!hash) {
      errors.push(`Missing imported file: ${file.target}`)
      continue
    }
    if (overlays.has(file.target)) adapted++
    else if (hash !== file.blob) errors.push(`Undeclared upstream modification: ${file.target}`)
    else pristine++
  }
  for (const [file] of input.files) {
    if (imported.has(file)) continue
    if (input.rules.local.some((rule) => rule.patterns.some((pattern) => matches(file, pattern)))) local++
    else errors.push(`Unclassified local file: ${file}`)
  }
  for (const [file] of overlays)
    if (!imported.has(file)) errors.push(`Overlay does not target an imported file: ${file}`)
  for (const layer of input.rules.overlays)
    for (const file of layer.adapters ?? []) {
      if (!input.files.has(file)) errors.push(`Missing adapter: ${file}`)
    }
  return { pristine, adapted, local, errors }
}

// A read-only upgrade report: never copies files or merges local overlays.
export function planImports(previous: Inventory, next: readonly ImportFile[], rules: Rules) {
  const old = new Map(previous.files.map((file) => [file.target, file]))
  const current = new Set(next.map((file) => file.target))
  const overlays = new Map(rules.overlays.flatMap((layer) => layer.files.map((file) => [file, layer.id] as const)))
  const changes = next.flatMap((file) => {
    const before = old.get(file.target)
    if (before?.blob === file.blob && before.mode === file.mode && before.path === file.path) return []
    return [
      {
        target: file.target,
        change: before ? "changed" : "added",
        review: overlays.get(file.target) ?? "upstream-copy",
      },
    ]
  })
  for (const file of previous.files)
    if (!current.has(file.target))
      changes.push({ target: file.target, change: "removed", review: overlays.get(file.target) ?? "upstream-copy" })
  return changes
}

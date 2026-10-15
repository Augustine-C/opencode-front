import type { ResolvedPlugin } from "@opencode/frontend-plugin/config"

// Only diagnostics are rendered; imported configuration/options are never echoed into the preview.
export function pluginDiagnostic(error: unknown, config: readonly ResolvedPlugin[] = []) {
  const values = (value: unknown): string[] => {
    if (typeof value === "string") return value ? [value, encodeURIComponent(value)] : []
    if (Array.isArray(value)) return value.flatMap(values)
    if (value && typeof value === "object") return Object.values(value).flatMap(values)
    return []
  }
  let text = error instanceof Error ? error.message : String(error)
  for (const value of [...new Set(config.flatMap((entry) => values(entry.options)))].sort(
    (a, b) => b.length - a.length,
  ))
    text = text.split(value).join("[redacted]")
  return text
    .replace(/https?:\/\/[^\s"'<>]+/g, (value) => {
      const url = URL.parse(value)
      if (!url) return "[redacted URL]"
      url.username = ""
      url.password = ""
      url.search = ""
      url.hash = ""
      return url.href
    })
    .replace(/\bBearer\s+[^\s,"']+/gi, "Bearer [redacted]")
    .replace(/\b(password|token|secret|api[-_]?key|authorization)\b\s*[:=]\s*["']?[^\s,"']+/gi, "$1=[redacted]")
}

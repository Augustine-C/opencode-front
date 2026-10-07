import { Option, Schema } from "effect"

export const defaults = { enabled: false, endpoint: "http://127.0.0.1:8787", interval: 60000 }
export const Preferences = Schema.Struct({
  enabled: Schema.Boolean,
  endpoint: Schema.String,
  interval: Schema.Number.check(Schema.isFinite(), Schema.isGreaterThanOrEqualTo(5000)),
})

const Legacy = Schema.Struct({
  plugins: Schema.Array(
    Schema.Union([
      Schema.String,
      Schema.Struct({
        package: Schema.String,
        options: Schema.optional(Schema.Record(Schema.String, Schema.Json)),
      }),
    ]),
  ),
})

// The native store imports this older config once, leaving other browser plugins' data in place.
export function legacyPreferences(value: unknown) {
  const saved = Schema.decodeUnknownOption(Legacy)(value)
  if (Option.isNone(saved)) return
  const entry = saved.value.plugins.find((entry) => {
    const name = typeof entry === "string" ? entry : entry.package
    return name === "codearts-proxy" || name === "-codearts-proxy"
  })
  if (!entry) return
  const name = typeof entry === "string" ? entry : entry.package
  const options = typeof entry === "string" ? undefined : entry.options
  return {
    enabled: !name.startsWith("-"),
    endpoint: typeof options?.baseURL === "string" ? options.baseURL : defaults.endpoint,
    interval:
      typeof options?.interval === "number" && Number.isFinite(options.interval)
        ? Math.max(5000, options.interval)
        : defaults.interval,
  }
}

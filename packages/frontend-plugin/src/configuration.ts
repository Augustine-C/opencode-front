export type ConfigurationField = {
  key: string
  label: string
  description?: string
  required?: boolean
} & (
  | { type: "string"; default?: string }
  | { type: "number"; default?: number; min?: number; max?: number }
  | { type: "boolean"; default?: boolean }
  | { type: "select"; default?: string; options: Array<{ value: string; label: string }> }
)

export type PluginConfiguration = { fields: ConfigurationField[] }
export type ConfigurationIssue = { key: string; code: "required" | "type" | "range" | "option" }

const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key)
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value)
const text = (value: unknown): value is string => typeof value === "string" && !!value.trim()

/** Validate declarations without importing or executing the plugin's entry module. */
export function validateConfiguration(value: unknown): PluginConfiguration {
  if (!object(value) || Object.keys(value).some((key) => key !== "fields") || !Array.isArray(value.fields))
    throw new Error("Plugin configuration must declare fields")
  if (value.fields.length > 100) throw new Error("Plugin configuration declares too many fields")
  const keys = new Set<string>()
  for (const field of value.fields) {
    if (!object(field) || !text(field.key) || !text(field.label))
      throw new Error("Configuration fields need a key and label")
    if (["__proto__", "prototype", "constructor"].includes(field.key) || keys.has(field.key))
      throw new Error(`Invalid or duplicate configuration key: ${field.key}`)
    keys.add(field.key)
    if (!["string", "number", "boolean", "select"].includes(field.type as string))
      throw new Error(`Unsupported configuration field type: ${field.key}`)
    const allowed = new Set(["key", "label", "description", "required", "type", "default"])
    if (field.type === "number") {
      allowed.add("min")
      allowed.add("max")
      for (const bound of ["min", "max"])
        if (own(field, bound) && (typeof field[bound] !== "number" || !Number.isFinite(field[bound])))
          throw new Error(`Invalid configuration number bound: ${field.key}`)
      if (typeof field.min === "number" && typeof field.max === "number" && field.min > field.max)
        throw new Error(`Invalid configuration number range: ${field.key}`)
    }
    if (field.type === "select") {
      allowed.add("options")
      if (!Array.isArray(field.options) || !field.options.length || field.options.length > 100)
        throw new Error(`Configuration select needs options: ${field.key}`)
      const values = new Set<string>()
      for (const option of field.options) {
        if (
          !object(option) ||
          !text(option.value) ||
          !text(option.label) ||
          values.has(option.value) ||
          Object.keys(option).some((key) => key !== "value" && key !== "label")
        )
          throw new Error(`Invalid or duplicate configuration option: ${field.key}`)
        values.add(option.value)
      }
    }
    if (
      Object.keys(field).some((key) => !allowed.has(key)) ||
      (own(field, "description") && typeof field.description !== "string") ||
      (own(field, "required") && typeof field.required !== "boolean")
    )
      throw new Error(`Invalid configuration field declaration: ${field.key}`)
    if (own(field, "default")) {
      const issue = fieldIssue(field as ConfigurationField, field.default)
      if (
        issue ||
        field.default === undefined ||
        (field.type === "select" &&
          !(field.options as Array<{ value: string }>).some((option) => option.value === field.default))
      )
        throw new Error(`Invalid configuration default: ${field.key}`)
    }
  }
  return value as PluginConfiguration
}

function fieldIssue(field: ConfigurationField, value: unknown): ConfigurationIssue["code"] | undefined {
  if (value === undefined) return field.required ? "required" : undefined
  if (
    field.required &&
    (field.type === "string" || field.type === "select") &&
    typeof value === "string" &&
    !value.trim()
  )
    return "required"
  if (field.type === "select")
    return typeof value !== "string"
      ? "type"
      : field.options.some((option) => option.value === value)
        ? undefined
        : "option"
  if (typeof value !== field.type || (typeof value === "number" && !Number.isFinite(value))) return "type"
  if (
    field.type === "number" &&
    typeof value === "number" &&
    ((field.min !== undefined && value < field.min) || (field.max !== undefined && value > field.max))
  )
    return "range"
}

/** Defaults fill missing keys only. Unknown and incompatible saved values are retained for repair. */
export function resolveConfiguration(
  configuration: PluginConfiguration | undefined,
  saved: Readonly<Record<string, unknown>>,
) {
  const options = { ...saved }
  const issues: ConfigurationIssue[] = []
  for (const field of configuration?.fields ?? []) {
    if (!own(options, field.key) && field.default !== undefined) options[field.key] = field.default
    const code = fieldIssue(field, own(options, field.key) ? options[field.key] : undefined)
    if (code) issues.push({ key: field.key, code })
  }
  return { options, issues }
}

/** Reset declared fields only, preserving options owned by older or more advanced plugins. */
export function resetConfiguration(configuration: PluginConfiguration, saved: Readonly<Record<string, unknown>>) {
  const options = { ...saved }
  for (const field of configuration.fields) delete options[field.key]
  return resolveConfiguration(configuration, options).options
}

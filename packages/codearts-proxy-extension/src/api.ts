export type Usage = {
  used: number | null
  limit: number | null
  remaining: number | null
  balance?: number | null
  monthly_used?: number | null
  monthly_limit?: number | null
  name?: string | null
  start_date?: string | null
  end_date?: string | null
}
export type Overview = {
  version: 1
  login: {
    logged_in: boolean
    account_name: string | null
    user_name: string | null
    domain_id: string | null
    creds_expire_at: string | null
    obtained_at: string | null
  }
  default_model: string
  api_key_required: boolean
  telemetry_enabled: boolean
  usage: {
    benefit: Usage | null
    benefit_error: string | null
    package: Usage | null
    package_error: string | null
    fetched_at: number
  } | null
  usage_error: string | null
}
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value)
const count = (value: unknown) =>
  value === null || (typeof value === "number" && Number.isSafeInteger(value) && value >= 0)
const text = (value: unknown) => value === null || typeof value === "string"
const usage = (value: unknown) =>
  value === null ||
  (object(value) &&
    ["used", "limit", "remaining"].every((key) => count(value[key])) &&
    ["balance", "monthly_used", "monthly_limit"].every((key) => value[key] === undefined || count(value[key])) &&
    ["name", "start_date", "end_date"].every((key) => value[key] === undefined || text(value[key])))

// Validate at the external-service boundary so incompatible/unknown quotas never become zero.
export function parseOverview(value: unknown): Overview {
  if (
    !object(value) ||
    value.version !== 1 ||
    !object(value.login) ||
    typeof value.login.logged_in !== "boolean" ||
    !["account_name", "user_name", "domain_id", "creds_expire_at", "obtained_at"].every((key) =>
      text(value.login && (value.login as Record<string, unknown>)[key]),
    ) ||
    typeof value.default_model !== "string" ||
    typeof value.api_key_required !== "boolean" ||
    typeof value.telemetry_enabled !== "boolean" ||
    !text(value.usage_error) ||
    !(
      value.usage === null ||
      (object(value.usage) &&
        usage(value.usage.benefit) &&
        usage(value.usage.package) &&
        text(value.usage.benefit_error) &&
        text(value.usage.package_error) &&
        typeof value.usage.fetched_at === "number" &&
        Number.isFinite(value.usage.fetched_at))
    )
  )
    throw new Error("invalid_overview")
  return value as Overview
}

export function overviewURL(baseURL: string) {
  let url: URL
  try {
    url = new URL(baseURL)
  } catch {
    throw new Error("invalid_endpoint")
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash)
    throw new Error("invalid_endpoint")
  url.pathname = `${url.pathname.replace(/\/(?:v1\/?)?$/, "").replace(/\/$/, "")}/api/overview`
  return url
}

export async function fetchOverview(baseURL: string, apiKey: string, signal: AbortSignal) {
  const response = await fetch(overviewURL(baseURL), {
    signal,
    credentials: "omit",
    cache: "no-store",
    redirect: "error",
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return parseOverview(await response.json())
}

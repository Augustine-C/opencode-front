export * as SidecarCredentials from "./connection"

export type Connection = {
  id: string
  url: string
  username?: string
  password?: string
  sameMachine: boolean
}
let current: Connection | undefined
export function set(connection: Connection | undefined) {
  current = connection
}
export const get = () => current
// A host belongs to one endpoint; the shell disposes it before replacing the endpoint.
export const onChange = (_listener: () => void) => () => {}
export function authorization(connection: Connection | undefined, url: string) {
  if (!connection?.password || !URL.canParse(url) || new URL(url).origin !== new URL(connection.url).origin) return
  return `Basic ${Buffer.from(`${connection.username ?? "opencode"}:${connection.password}`).toString("base64")}`
}

import { createSimpleContext } from "@opencode/ui/context"
import { batch, createMemo } from "solid-js"
import { Persist, persisted } from "@/runtime/persistence/storage"
import { createServerProjects } from "@/extensions/project-inventory"
import { ServerScope } from "@/runtime/server/scope"
import type { ServerEntry } from "@opencode/gui-extensions/sdk"
import { ServerHttp, ServerHttpBase, ServerKey, serverState } from "./persistence"

export { createServerProjects } from "@/extensions/project-inventory"

// Retain closed paths until reopened so settings can exclude them from the server inventory.
// The Home page independently limits the visible recently closed entries.
export const RECENTLY_CLOSED_DISPLAY_LIMIT = 5

export function normalizeServerUrl(input: string) {
  const trimmed = input.trim()

  if (!trimmed) return
  const withProtocol = /^https?:\/\//.test(trimmed) ? trimmed : `http://${trimmed}`

  return withProtocol.replace(/\/+$/, "")
}

export function serverName(conn?: ServerConnection.Any, ignoreDisplayName = false) {
  if (!conn) return ""

  if (conn.displayName && !ignoreDisplayName) return conn.displayName

  return conn.http.url.replace(/^https?:\/\//, "").replace(/\/+$/, "")
}

function isLocalHost(url: string) {
  const host = url.replace(/^https?:\/\//, "").split(":")[0]

  if (host === "localhost" || host === "127.0.0.1") return "local"
}

export function resolveServerList(input: {
  props?: Array<ServerConnection.Any>
  stored: ServerConnection.Http[]
}): Array<ServerConnection.Any> {
  const deduped = new Map<ServerConnection.Key, ServerConnection.Any>(
    input.props?.map((v) => [ServerConnection.key(v), v]) ?? [],
  )

  for (const conn of input.stored) {
    const key = ServerConnection.key(conn)

    const existing = deduped.get(key)

    if (existing)
      deduped.set(key, {
        ...existing,
        ...conn,
        http: { ...existing.http, ...conn.http },
      })
    else deduped.set(key, conn)
  }

  return [...deduped.values()]
}

export function canRemoveServer(input: {
  key: ServerConnection.Key
  provided?: Array<ServerConnection.Any>
  stored: ServerConnection.Http[]
}) {
  if (input.provided?.some((server) => ServerConnection.key(server) === input.key)) return false

  return input.stored.some((server) => server.http.url === input.key)
}

export namespace ServerConnection {
  type Base = { displayName?: string; label?: string }

  export type HttpBase = typeof ServerHttpBase.Type

  // Regular web connections
  export type Http = typeof ServerHttp.Type

  // Regular desktop server
  export type Sidecar = {
    type: "sidecar"
    variant: "base"
    http: HttpBase
    reconnect?: (signal: AbortSignal) => Promise<HttpBase>
  } & Base

  // A server a GUI extension contributes (e.g. SSH or WSL), keyed `${extension}:${id}`
  export type Extension = {
    type: "extension"
    key: string
    extension: string
    state: ServerEntry["state"]
    connecting: boolean
    authenticationRequired: boolean
    /** The extension re-resolves the endpoint (e.g. a tunnel), so the connection can drop and come back. */
    managed: boolean
    http: HttpBase
    reconnect?: (signal: AbortSignal) => Promise<HttpBase>
    /** Called before opening a server that is not ready. Resolves true once it is. */
    connect?: () => Promise<boolean>
  } & Base

  export type Any =
    | Http
    // All these are desktop-only
    | (Sidecar | Extension)

  export const key = (conn: Any): Key => {
    switch (conn.type) {
      case "http":
        return Key.make(conn.http.url)
      case "sidecar":
        return Key.make("sidecar")
      case "extension":
        return Key.make(conn.key)
    }
  }

  export const Key = ServerKey
  export type Key = typeof Key.Type

  export const builtin = (conn: Any) => conn.type === "sidecar" && conn.variant === "base"
  /** Starts sign-in for a server that asks for it; false when it does not. */
  export const authenticate = (conn: Any, onConnected?: () => void) => {
    if (conn.type !== "extension" || !conn.authenticationRequired || !conn.connect) return false
    void conn.connect().then((ready) => {
      if (ready) onConnected?.()
    })

    return true
  }

  export const local = (conn?: Any) =>
    !!conn && (builtin(conn) || (conn.type === "http" && isLocalHost(conn.http.url) === "local"))
}

export const { use: useServers, provider: ServersProvider } = createSimpleContext({
  name: "Server",
  gate: true,
  init: (props: { canonicalLocalServer?: ServerConnection.Key; servers?: Array<ServerConnection.Any> }) => {
    const [store, setStore, _, hydrated] = persisted(
      {
        ...Persist.global("server"),
        sync: true,
        previousKey: "server.v3",
      },
      serverState(() => props.canonicalLocalServer),
      { list: [], hidden: {}, projects: {}, lastProject: {}, recentlyClosed: {} },
    )

    const allServers = createMemo((): Array<ServerConnection.Any> => {
      return resolveServerList({ stored: store.list, props: props.servers })
    })

    const visibleServers = createMemo(() => allServers().filter((conn) => !store.hidden[ServerConnection.key(conn)]))

    function add(input: ServerConnection.Http) {
      const url_ = normalizeServerUrl(input.http.url)

      if (!url_) return
      const conn: ServerConnection.Http = { ...input, authToken: undefined, http: { ...input.http, url: url_ } }

      return batch(() => {
        const existing = store.list.findIndex((x) => x.http.url === url_)

        if (existing !== -1) {
          setStore("list", existing, conn)
        } else {
          setStore("list", store.list.length, conn)
        }

        return conn
      })
    }

    function remove(key: ServerConnection.Key) {
      const list = store.list.filter((x) => x.http.url !== key)
      batch(() => {
        setStore("list", list)
      })
    }

    function canRemove(key: ServerConnection.Key) {
      return canRemoveServer({ key, provided: props.servers, stored: store.list })
    }

    const scope = (key: ServerConnection.Key) => ServerScope.fromServerKey(key, props.canonicalLocalServer)
    const projectStores = new Map<ServerConnection.Key, ReturnType<typeof createServerProjects>>()

    const projectsForServer = (key: ServerConnection.Key) => {
      const existing = projectStores.get(key)

      if (existing) return existing
      const next = createServerProjects({ scope: () => scope(key), store, setStore })
      projectStores.set(key, next)

      return next
    }

    return {
      get list() {
        return allServers()
      },
      get visible() {
        return visibleServers()
      },
      // Named to avoid the context `ready` gate: consumers that derive from persisted project
      // state wait on this, but the provider must not block first render on storage.
      hydrated,
      isHidden(key: ServerConnection.Key) {
        return store.hidden[key] ?? false
      },
      setHidden(key: ServerConnection.Key, hidden: boolean) {
        setStore("hidden", key, hidden)
      },
      add,
      remove,
      canRemove,
      scope,
      projects: {
        forServer: projectsForServer,
      },
    }
  },
})

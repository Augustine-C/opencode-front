import { invokeNative } from "@opencode/desktop/plugins"
import { createEffect, createMemo, onCleanup } from "solid-js"
import { createStore } from "solid-js/store"
import { useLocation } from "@solidjs/router"
import { ServerConnection } from "@/runtime/server/registry"
import { useGlobal } from "@/runtime/server/runtime"
import { useSettingsSurface } from "@/settings/surface"

const [source, setSource] = createStore({ key: undefined as ServerConnection.Key | undefined, ready: false })
export const desktopPluginServer = () => source.key
export const desktopPluginReady = () => !window.electron || source.ready

/** Bind the official app-scoped main host to the explicitly selected, configured service. */
export function DesktopPluginConnection() {
  const native = window.electron
  if (!native) return null
  const global = useGlobal()
  const surface = useSettingsSurface()
  const location = useLocation()
  const selected = createMemo(() => {
    const requested = location.pathname === "/settings" ? new URLSearchParams(location.search).get("server") : null
    const connections = global.servers.list()
    const selected = connections.find(
      (connection) => ServerConnection.key(connection) === (requested ?? surface.server()?.key),
    )
    // A plugin-managed endpoint (SSH/WSL) belongs to the main host that created it.
    // Keep that host alive while using the contributed server.
    return selected?.type === "http"
      ? selected
      : (connections.find(
          (connection) => connection.type === "http" && ServerConnection.key(connection) === source.key,
        ) ?? connections.find((connection) => connection.type === "http"))
  })
  createEffect(() => {
    const connection = selected()
    const key = connection && ServerConnection.key(connection)
    setSource({ key, ready: false })
    const endpoint = connection && {
      id: key,
      url: connection.http.url,
      ...(connection.http.password ? { password: connection.http.password } : {}),
    }
    let disposed = false
    onCleanup(() => {
      disposed = true
    })
    void invokeNative("NativeSelect", endpoint ?? null)
      .then(() => {
        if (!disposed) setSource("ready", true)
      })
      .catch((cause) => console.error("[plugin] service selection failed", cause))
  })
  onCleanup(() => setSource("key", undefined))
  return null
}

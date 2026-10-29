import type { WebContents } from "electron"
import type { DesktopEvent } from "../shared/ipc-rpc/events"
export const PLUGIN_EVENT = "opencode-front:plugin-event"
let publishing = true
let generation = 0
export function setPublication(enabled: boolean, next: number) {
  publishing = enabled
  generation = next
}
export function guiRevisions<T extends { plugins: readonly { revision: string }[] }>(value: T): T {
  return {
    ...value,
    plugins: value.plugins.map((plugin) => ({ ...plugin, revision: `${generation}:${plugin.revision}` })),
  }
}
export function emitIpcEvent(sender: WebContents, event: DesktopEvent) {
  if (!publishing || sender.isDestroyed()) return
  sender.send(PLUGIN_EVENT, event._tag === "PluginGuisChanged" ? guiRevisions(event) : event)
}

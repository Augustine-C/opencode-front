import type { Accessor, JSX } from "solid-js"
import type { OpenCodeClient, OpenCodeEvent } from "@opencode/client"

export type Cleanup = () => void | Promise<void>
export type SlotMap = {
  app: Record<string, never>
  "home.footer": Record<string, never>
  "home.footer.status": Record<string, never>
  "prompt.footer": { sessionID?: string; mode: "normal" | "shell"; showDetails: boolean }
  "prompt.footer.status": SlotMap["prompt.footer"]
  "prompt.footer.file": SlotMap["prompt.footer"]
  "session.composer.top": { sessionID: string }
  "session.header": { sessionID: string }
  "session.panel": {
    sessionID: string
    name: string
    width: number
    presentation: "panel" | "fullscreen"
    close: () => void
    toggleFullscreen: () => void
  }
  "sidebar.content": { sessionID: string }
  "sidebar.footer": { sessionID: string }
}
export type SlotPath = keyof SlotMap
export type Placement = "before" | "after" | "prepend" | "append" | "replace"
export type SlotClaim<P extends SlotPath = SlotPath> = P extends SlotPath
  ? { render: (input: SlotMap[P]) => JSX.Element } & {
      [K in Placement]: Record<K, P> & Partial<Record<Exclude<Placement, K>, never>>
    }[Placement]
  : never

export type Panel = { name: string; title: string; presentation?: "panel" | "fullscreen" }
export type Command = { id: string; title: string; run: () => void | Promise<void> }
export type Context = {
  options: Readonly<Record<string, unknown>>
  signal: AbortSignal
  app: { version: string; platform: "web" | "desktop" }
  // Accessors always resolve against the active server. Plugins must not retain a client across switches.
  client: Accessor<OpenCodeClient | undefined>
  sessionID: Accessor<string | undefined>
  connection: Accessor<{ key: string; url: string; healthy: boolean } | undefined>
  data: { listen: (handler: (event: OpenCodeEvent) => void) => Cleanup }
  storage: { get<T>(key: string): T | undefined; set(key: string, value: unknown): void }
  ui: {
    slot<P extends SlotPath>(claim: SlotClaim<P>): Cleanup
    command(command: Command): Cleanup
    panel: {
      // Adds an entry to the native Add tab menu without opening a session panel.
      register(panel: Panel): Cleanup
      open(name: string, options?: { presentation?: "panel" | "fullscreen"; title?: string }): boolean
      close(): void
      current(): { name: string; sessionID: string } | undefined
    }
  }
}
export type Definition = {
  id: string
  name: string
  apiVersion: 1
  defaultEnabled?: boolean
  // Maps exact TUI package identities to this explicitly authored browser adapter.
  tui?: readonly string[]
  setup(context: Context): void | Cleanup | Promise<void | Cleanup>
}
export function define(plugin: Definition) {
  return plugin
}

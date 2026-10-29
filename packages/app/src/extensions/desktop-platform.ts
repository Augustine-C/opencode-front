import { createPluginBridge, invokeNative } from "@opencode/desktop/plugins"
import type { Platform } from "@/runtime/platform/platform"

export function withDesktopPlatform(web: Platform): Platform {
  const native = window.electron
  if (!native) return web
  return {
    ...web,
    platform: "desktop",
    os: native.os,
    windowID: native.windowID,
    plugins: createPluginBridge(),
    openDirectoryPickerDialog: () => invokeNative("NativeDirectory") as Promise<string[]>,
  }
}

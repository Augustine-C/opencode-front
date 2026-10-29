import { compose } from "@opencode/plugin/gui/host"
import codeartsProxy from "@opencode-front/codearts-proxy-extension"

export const nativePlugins = compose({
  "codearts-proxy": { ...codeartsProxy, windowEntry: () => import("@opencode-front/codearts-proxy-extension/renderer") },
})

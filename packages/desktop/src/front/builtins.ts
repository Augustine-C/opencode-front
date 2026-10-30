import { builtins as official } from "@opencode/gui-plugins/main"
// This distribution has its own release channel. Never install an upstream desktop binary over it.
// All official main plugin hosts/APIs remain available to external GUI plugins.
import { compose } from "@opencode/plugin/gui/host"
import codeartsProxy from "@opencode-front/codearts-proxy-extension"
export const builtins = [
  ...compose({ "codearts-proxy": codeartsProxy }),
  ...official.map((entry) => (entry.id === "updater" ? { ...entry, mainEntry: undefined } : entry)),
]

import { Extension, type Definition } from "@opencode/gui-extensions/sdk"
import codeartsProxy from "@opencode-front/codearts-proxy-extension"

// Port-owned native definitions, composed with the same SDK as the upstream built-ins.
export const nativeExtensions: readonly Definition[] = Extension.compose(codeartsProxy)

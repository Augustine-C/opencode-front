// Encode the ID and terminate it with a character that cannot occur in the encoding.
// A dotted ID (or storage key) must never extend another plugin's namespace.
export function pluginStoragePrefix(id: string) {
  return `opencode-front.plugin.v2:${encodeURIComponent(id)}:`
}

import type { Definition } from "@opencode/frontend-plugin"
import type { useLanguage } from "@/runtime/i18n/language"

// Add explicitly installed browser adapters here. Vite compiles them with the host's Solid runtime.
// Imported TUI configurations only select these definitions; they never load arbitrary code.
export function createCatalog(_language: ReturnType<typeof useLanguage>): Definition[] {
  return []
}

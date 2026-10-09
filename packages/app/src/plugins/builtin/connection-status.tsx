import { define } from "@opencode/frontend-plugin"
import type { useLanguage } from "@/runtime/i18n/language"

export function connectionStatus(language: ReturnType<typeof useLanguage>) {
  return define({
    id: "connection-status",
    get name() {
      return language.t("plugins.connectionStatus")
    },
    apiVersion: 1,
    defaultEnabled: true,
    setup(context) {
      const status = () => context.connection()
      const content = () => (
        <span class="text-xs px-3 py-1" style={{ color: "var(--v2-text-weaker)" }}>
          {status()
            ? `${status()!.url} · ${language.t(status()!.healthy ? "plugins.connected" : "plugins.offline")}`
            : language.t("plugins.noServer")}
        </span>
      )
      context.ui.slot({ append: "home.footer.status", render: content })
      context.ui.slot({ append: "prompt.footer.status", render: content })
    },
  })
}

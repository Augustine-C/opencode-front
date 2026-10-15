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
        <span
          title={status()?.url}
          class="text-xs px-3 py-1 max-w-full truncate"
          style={{ color: "var(--v2-text-weaker)" }}
        >
          {status()
            ? language.t("plugins.connectionSummary", {
                name: status()!.name ?? URL.parse(status()!.url)?.host ?? status()!.url,
                status: language.t(status()!.healthy ? "plugins.connected" : "plugins.offline"),
              })
            : language.t("plugins.noServer")}
        </span>
      )
      context.ui.slot({ append: "home.footer.status", render: content })
      context.ui.slot({ append: "prompt.footer.status", render: content })
    },
  })
}

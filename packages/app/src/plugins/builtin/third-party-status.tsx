import { define } from "@opencode/frontend-plugin"
import { createStore } from "solid-js/store"
import type { useLanguage } from "@/runtime/i18n/language"

// An opt-in example: no requests run until the user supplies an endpoint.
// Expected JSON: { "label": "Build queue", "value": "3 pending" }.
export function thirdPartyStatus(language: ReturnType<typeof useLanguage>) {
  return define({
    id: "third-party-status",
    name: language.t("plugins.thirdPartyStatus"),
    apiVersion: 1,
    setup(context) {
      const [state, setState] = createStore({ label: "", value: "", error: "", loading: false })
      const endpoint = typeof context.options.endpoint === "string" ? context.options.endpoint : undefined
      const interval =
        typeof context.options.interval === "number" && Number.isFinite(context.options.interval)
          ? Math.max(5000, context.options.interval)
          : 60000
      let timer: ReturnType<typeof setTimeout> | undefined
      async function refresh() {
        if (!endpoint || state.loading || context.signal.aborted) return
        clearTimeout(timer)
        setState({ loading: true, error: "" })
        try {
          const url = new URL(endpoint)
          if (url.protocol !== "https:" && url.protocol !== "http:")
            throw new Error(language.t("plugins.statusUnavailable"))
          const response = await fetch(url, { signal: context.signal, credentials: "omit" })
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          const result: unknown = await response.json()
          if (
            !result ||
            typeof result !== "object" ||
            !("label" in result) ||
            !("value" in result) ||
            typeof result.label !== "string" ||
            typeof result.value !== "string"
          )
            throw new Error(language.t("plugins.statusInvalid"))
          if (!context.signal.aborted) setState({ label: result.label, value: result.value })
        } catch (error) {
          if (!context.signal.aborted)
            setState({ value: "", error: error instanceof Error ? error.message : String(error) })
        } finally {
          setState("loading", false)
          if (!context.signal.aborted) timer = setTimeout(() => void refresh(), interval)
        }
      }
      const content = () => (
        <span class="text-xs px-3 py-1">
          {!endpoint
            ? language.t("plugins.statusConfigure")
            : state.error
              ? language.t("plugins.statusUnavailable")
              : state.value
                ? `${state.label}: ${state.value}`
                : language.t("plugins.statusLoading")}
        </span>
      )
      context.ui.slot({ append: "home.footer.status", render: content })
      context.ui.slot({ append: "prompt.footer.status", render: content })
      context.ui.slot({ append: "sidebar.footer", render: content })
      context.ui.slot({
        append: "session.panel",
        render: (input) =>
          input.name === "third-party-status" ? (
            <div class="flex flex-col gap-3">
              {content()}
              <p role={state.error ? "alert" : undefined}>{state.error}</p>
              <button onClick={() => void refresh()} disabled={state.loading}>
                {language.t("plugins.statusRefresh")}
              </button>
            </div>
          ) : null,
      })
      context.ui.command({ id: "refresh", title: language.t("plugins.statusRefresh"), run: refresh })
      context.ui.command({
        id: "panel",
        title: language.t("plugins.statusPanel"),
        run: () => {
          context.ui.panel.open("third-party-status")
        },
      })
      void refresh()
      return () => clearTimeout(timer)
    },
  })
}

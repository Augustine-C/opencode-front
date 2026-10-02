import { define } from "@opencode/frontend-plugin"
import { For, Show, onCleanup, onMount } from "solid-js"
import { createStore } from "solid-js/store"
import { Button } from "@opencode/ui/button"
import type { useLanguage } from "@/runtime/i18n/language"
import { fetchOverview, type Overview, type Usage } from "./codearts-proxy-api"
import "./codearts-proxy.css"

export function codeartsProxy(language: ReturnType<typeof useLanguage>) {
  return define({
    id: "codearts-proxy",
    name: language.t("plugins.codearts.name"),
    apiVersion: 1,
    setup(context) {
      const [state, setState] = createStore({
        endpoint: typeof context.options.baseURL === "string" ? context.options.baseURL : "http://127.0.0.1:8787",
        apiKey: "",
        overview: undefined as Overview | undefined,
        loading: false,
        error: "",
      })
      const interval =
        typeof context.options.interval === "number" && Number.isFinite(context.options.interval)
          ? Math.max(5000, context.options.interval)
          : 60000
      let timer: ReturnType<typeof setTimeout> | undefined
      let request: AbortController | undefined
      let mounted = 0
      const stop = () => {
        clearTimeout(timer)
        request?.abort()
        request = undefined
        setState("loading", false)
      }
      const refresh = async () => {
        if (state.loading || context.signal.aborted) return
        clearTimeout(timer)
        const controller = new AbortController()
        request = controller
        setState({ loading: true, error: "", overview: undefined })
        try {
          const overview = await fetchOverview(
            state.endpoint,
            state.apiKey,
            AbortSignal.any([controller.signal, context.signal, AbortSignal.timeout(25000)]),
          )
          if (!controller.signal.aborted && !context.signal.aborted) setState("overview", overview)
        } catch (error) {
          if (!controller.signal.aborted && !context.signal.aborted) {
            const message = error instanceof Error ? error.message : ""
            setState(
              "error",
              language.t(
                message === "invalid_overview"
                  ? "plugins.codearts.invalid"
                  : message === "invalid_endpoint"
                    ? "plugins.codearts.invalidEndpoint"
                    : message === "HTTP 401"
                      ? "plugins.codearts.unauthorized"
                      : "plugins.codearts.unavailable",
              ),
            )
          }
        } finally {
          if (request === controller) {
            request = undefined
            setState("loading", false)
            if (mounted && !context.signal.aborted) timer = setTimeout(() => void refresh(), interval)
          }
        }
      }
      const unknown = () => language.t("plugins.codearts.unknown")
      const number = (value: number | null | undefined) => (value == null ? unknown() : value.toLocaleString())
      const enabled = (value: boolean) => language.t(value ? "plugins.codearts.enabled" : "plugins.codearts.disabled")
      const quota = (title: string, data: Usage | null | undefined, error: string | null | undefined) => (
        <section class="codearts-card">
          <h3>{title}</h3>
          <Show when={data} fallback={<p role={error ? "alert" : undefined}>{error || unknown()}</p>}>
            <Show when={data?.name}>
              <p>{data?.name}</p>
            </Show>
            <dl class="codearts-metrics">
              <For each={["used", "limit", "remaining"] as const}>
                {(key) => (
                  <div>
                    <dt>{language.t(`plugins.codearts.${key}`)}</dt>
                    <dd>{number(data?.[key])}</dd>
                  </div>
                )}
              </For>
            </dl>
            <Show when={data?.used != null && data?.limit != null && data!.limit! > 0}>
              <progress aria-label={title} max={data!.limit!} value={Math.min(data!.used!, data!.limit!)} />
            </Show>
            <Show when={data?.balance != null}>
              <p>{language.t("plugins.codearts.balance", { value: number(data?.balance) })}</p>
            </Show>
            <Show when={data?.end_date}>
              <p>
                {language.t("plugins.codearts.validity", {
                  start: data?.start_date || unknown(),
                  end: data!.end_date!,
                })}
              </p>
            </Show>
            <Show when={error}>
              <p role="alert">{error}</p>
            </Show>
          </Show>
        </section>
      )
      const Content = () => {
        onMount(() => {
          mounted++
          void refresh()
        })
        onCleanup(() => {
          if (--mounted === 0) stop()
        })
        return (
          <section data-component="codearts-proxy-overview">
            <p>{language.t("plugins.codearts.description")}</p>
            <form
              class="codearts-connection"
              onSubmit={(event) => {
                event.preventDefault()
                void refresh()
              }}
            >
              <label>
                {language.t("plugins.codearts.endpoint")}
                <input
                  type="url"
                  required
                  value={state.endpoint}
                  onInput={(event) => {
                    stop()
                    setState({ endpoint: event.currentTarget.value, overview: undefined, error: "" })
                  }}
                />
              </label>
              <label>
                {language.t("plugins.codearts.apiKey")}
                <input
                  type="password"
                  autocomplete="off"
                  value={state.apiKey}
                  onInput={(event) => {
                    stop()
                    setState({ apiKey: event.currentTarget.value, overview: undefined, error: "" })
                  }}
                />
              </label>
              <Button type="submit" size="small" variant="outline" disabled={state.loading}>
                {language.t(state.loading ? "plugins.codearts.loading" : "plugins.codearts.refresh")}
              </Button>
            </form>
            <Show when={state.error}>
              <p role="alert">{state.error}</p>
            </Show>
            <Show when={state.overview}>
              {(overview) => (
                <>
                  <section class="codearts-card">
                    <h3>{language.t("plugins.codearts.account")}</h3>
                    <dl class="codearts-details">
                      <dt>{language.t("plugins.codearts.login")}</dt>
                      <dd>
                        {language.t(
                          overview().login.logged_in ? "plugins.codearts.loggedIn" : "plugins.codearts.loggedOut",
                        )}
                      </dd>
                      <For each={["account_name", "user_name", "domain_id", "creds_expire_at", "obtained_at"] as const}>
                        {(key) => (
                          <>
                            <dt>{language.t(`plugins.codearts.${key}`)}</dt>
                            <dd>{overview().login[key] || unknown()}</dd>
                          </>
                        )}
                      </For>
                      <dt>{language.t("plugins.codearts.model")}</dt>
                      <dd>{overview().default_model}</dd>
                      <dt>{language.t("plugins.codearts.auth")}</dt>
                      <dd>{enabled(overview().api_key_required)}</dd>
                      <dt>{language.t("plugins.codearts.telemetry")}</dt>
                      <dd>{enabled(overview().telemetry_enabled)}</dd>
                    </dl>
                  </section>
                  <Show when={overview().usage_error}>
                    <p role="alert">{overview().usage_error}</p>
                  </Show>
                  <div class="codearts-quotas">
                    {quota(
                      language.t("plugins.codearts.benefit"),
                      overview().usage?.benefit,
                      overview().usage?.benefit_error,
                    )}
                    {quota(
                      language.t("plugins.codearts.package"),
                      overview().usage?.package,
                      overview().usage?.package_error,
                    )}
                  </div>
                  <p>{language.t("plugins.codearts.separate")}</p>
                  <Show when={overview().usage?.fetched_at}>
                    {(at) => <p>{language.t("plugins.codearts.updated", { time: new Date(at()).toLocaleString() })}</p>}
                  </Show>
                </>
              )}
            </Show>
          </section>
        )
      }
      const title = language.t("plugins.codearts.name")
      context.ui.panel.register({ name: "overview", title })
      context.ui.command({
        id: "open",
        title: language.t("plugins.codearts.open"),
        run: () => {
          context.ui.panel.open("overview", { title })
        },
      })
      context.ui.command({ id: "refresh", title: language.t("plugins.codearts.refresh"), run: refresh })
      context.ui.slot({ append: "session.panel", render: (input) => (input.name === "overview" ? <Content /> : null) })
      return stop
    },
  })
}

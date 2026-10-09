import { For, Show, onCleanup, onMount } from "solid-js"
import { Button } from "@opencode/ui/button"
import { useExtension } from "@opencode/gui-extensions/sdk"
import type definition from "./index"
import type { Usage } from "./api"
import type { OverviewModel } from "./model"

export default function OverviewPage(props: { model: OverviewModel }) {
  const ctx = useExtension<typeof definition>()
  const model = props.model
  const state = model.state
  const unknown = () => ctx.t("unknown")
  const number = (value: number | null | undefined) => (value == null ? unknown() : value.toLocaleString())
  const enabled = (value: boolean) => ctx.t(value ? "enabled" : "disabled")
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
                <dt>{ctx.t(`${key}`)}</dt>
                <dd>{number(data?.[key])}</dd>
              </div>
            )}
          </For>
        </dl>
        <Show when={data?.used != null && data?.limit != null && data!.limit! > 0}>
          <progress aria-label={title} max={data!.limit!} value={Math.min(data!.used!, data!.limit!)} />
        </Show>
        <Show when={data?.balance != null}>
          <p>{ctx.t("balance", { value: number(data?.balance) })}</p>
        </Show>
        <Show when={data?.end_date}>
          <p>
            {ctx.t("validity", {
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
  onMount(model.mount)
  onCleanup(model.unmount)
  return (
    <section data-component="codearts-proxy-overview">
      <p>{ctx.t("description")}</p>
      <form
        class="codearts-connection"
        onSubmit={(event) => {
          event.preventDefault()
          void model.refresh()
        }}
      >
        <label>
          {ctx.t("endpoint")}
          <input
            type="url"
            required
            value={ctx.stores.preferences.value.endpoint}
            onInput={(event) => {
              model.endpoint(event.currentTarget.value)
            }}
          />
        </label>
        <label>
          {ctx.t("apiKey")}
          <input
            type="password"
            autocomplete="off"
            value={state.apiKey}
            onInput={(event) => {
              model.apiKey(event.currentTarget.value)
            }}
          />
        </label>
        <Button type="submit" size="small" variant="outline" disabled={state.loading}>
          {ctx.t(state.loading ? "loading" : "refresh")}
        </Button>
      </form>
      <Show when={state.error}>
        <p role="alert">{state.error}</p>
      </Show>
      <Show when={state.overview}>
        {(overview) => (
          <>
            <section class="codearts-card">
              <h3>{ctx.t("account")}</h3>
              <dl class="codearts-details">
                <dt>{ctx.t("login")}</dt>
                <dd>{ctx.t(overview().login.logged_in ? "loggedIn" : "loggedOut")}</dd>
                <For each={["account_name", "user_name", "domain_id", "creds_expire_at", "obtained_at"] as const}>
                  {(key) => (
                    <>
                      <dt>{ctx.t(`${key}`)}</dt>
                      <dd>{overview().login[key] || unknown()}</dd>
                    </>
                  )}
                </For>
                <dt>{ctx.t("model")}</dt>
                <dd>{overview().default_model}</dd>
                <dt>{ctx.t("auth")}</dt>
                <dd>{enabled(overview().api_key_required)}</dd>
                <dt>{ctx.t("telemetry")}</dt>
                <dd>{enabled(overview().telemetry_enabled)}</dd>
              </dl>
            </section>
            <Show when={overview().usage_error}>
              <p role="alert">{overview().usage_error}</p>
            </Show>
            <div class="codearts-quotas">
              {quota(ctx.t("benefit"), overview().usage?.benefit, overview().usage?.benefit_error)}
              {quota(ctx.t("package"), overview().usage?.package, overview().usage?.package_error)}
            </div>
            <p>{ctx.t("separate")}</p>
            <Show when={overview().usage?.fetched_at}>
              {(at) => <p>{ctx.t("updated", { time: new Date(at()).toLocaleString() })}</p>}
            </Show>
          </>
        )}
      </Show>
    </section>
  )
}

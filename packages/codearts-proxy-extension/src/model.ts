import { onCleanup } from "solid-js"
import { createStore } from "solid-js/store"
import type { SetupContext } from "@opencode/gui-extensions/sdk"
import type definition from "./index"
import { fetchOverview, type Overview } from "./api"

export function createOverview(ctx: Pick<SetupContext<typeof definition>, "stores" | "signal" | "t">) {
  const preferences = ctx.stores.preferences
  const [state, setState] = createStore({
    apiKey: "",
    overview: undefined as Overview | undefined,
    loading: false,
    error: "",
  })
  let timer: ReturnType<typeof setTimeout> | undefined
  let request: AbortController | undefined
  let mounted = 0
  let disposed = false
  const stop = () => {
    clearTimeout(timer)
    request?.abort()
    request = undefined
    setState("loading", false)
  }
  const refresh = async () => {
    if (state.loading || disposed || ctx.signal.aborted) return
    clearTimeout(timer)
    const controller = new AbortController()
    request = controller
    setState({ loading: true, error: "", overview: undefined })
    try {
      const overview = await fetchOverview(
        preferences.value.endpoint,
        state.apiKey,
        AbortSignal.any([controller.signal, ctx.signal, AbortSignal.timeout(25000)]),
      )
      if (!controller.signal.aborted && !disposed && !ctx.signal.aborted) setState("overview", overview)
    } catch (error) {
      if (!controller.signal.aborted && !disposed && !ctx.signal.aborted) {
        const message = error instanceof Error ? error.message : ""
        setState(
          "error",
          ctx.t(
            message === "invalid_overview"
              ? "invalid"
              : message === "invalid_endpoint"
                ? "invalidEndpoint"
                : message === "HTTP 401"
                  ? "unauthorized"
                  : "unavailable",
          ),
        )
      }
    } finally {
      if (request === controller) {
        request = undefined
        setState("loading", false)
        if (mounted && !disposed && !ctx.signal.aborted)
          timer = setTimeout(() => void refresh(), preferences.value.interval)
      }
    }
  }
  onCleanup(() => {
    disposed = true
    stop()
    setState({ apiKey: "", overview: undefined, error: "" })
  })
  return {
    state,
    refresh,
    stop,
    mount() {
      mounted++
      void refresh()
    },
    unmount() {
      if (--mounted === 0) stop()
    },
    endpoint(value: string) {
      stop()
      preferences.update((draft) => {
        draft.endpoint = value
      })
      setState({ overview: undefined, error: "" })
    },
    apiKey(value: string) {
      stop()
      setState({ apiKey: value, overview: undefined, error: "" })
    },
  }
}

export type OverviewModel = ReturnType<typeof createOverview>

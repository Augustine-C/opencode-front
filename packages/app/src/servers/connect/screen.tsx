import { lazy, onCleanup, Show, Suspense } from "solid-js"
import { createStore } from "solid-js/store"
import { Button } from "@opencode/ui/button"
import { TextInput } from "@opencode/ui/text-input"
import { Wordmark } from "@opencode/ui/wordmark"
import { useLanguage } from "@/runtime/i18n/language"
import { usePlatform } from "@/runtime/platform/platform"
import { useCheckServerHealth } from "@/runtime/server/health"
import { ServerConnection, useServers } from "@/runtime/server/registry"
import { bareServerAddress, serverAddress, type Pairing } from "./pairing"
import { useRedeemPairing } from "./redeem"
import { isMixedContent } from "./browser"
import { cameraHint, createCameraAvailability } from "./camera"
import { ConnectMethodSwitch, type ConnectMethod } from "./method"
import "./screen.css"

const PairingScanner = lazy(() => import("./scanner").then((module) => ({ default: module.PairingScanner })))

export function ConnectServerScreen(props: { url?: string } = {}) {
  const language = useLanguage()
  const platform = usePlatform()
  const servers = useServers()
  const check = useCheckServerHealth()
  const redeem = useRedeemPairing()
  const camera = createCameraAvailability()

  const [state, setState] = createStore<{
    method: ConnectMethod
    link: string
    url: string
    password: string
    error: string
    scanning: boolean
    pending: boolean
    unauthorized: boolean
  }>({
    method: "link",
    link: "",
    url: props.url ?? "",
    password: "",
    error: "",
    scanning: false,
    pending: false,
    unauthorized: false,
  })

  let controller: AbortController | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  const cancel = (error = "") => {
    controller?.abort()
    controller = undefined
    clearTimeout(timer)
    setState({ pending: false, error, unauthorized: false })
  }
  onCleanup(() => cancel())

  const connectionError = (url: string) =>
    language.t(
      platform.platform === "web" && isMixedContent(location.href, url)
        ? "server.connect.mixedContent"
        : "server.connect.recovery.network",
    )

  const submit = async () => {
    if (state.pending) return
    const snapshot = { method: state.method, link: state.link, url: state.url, password: state.password }
    const attempt = new AbortController()
    controller = attempt
    const current = () => controller === attempt && !attempt.signal.aborted
    setState({ pending: true, error: "", unauthorized: false })
    timer = setTimeout(() => cancel(language.t("server.connect.recovery.timeout")), 30_000)
    const target = async (pairing: Pairing) => {
      if (!props.url || props.url === pairing.url) return pairing
      const http = { url: props.url, password: pairing.password }
      return (await check(http, { signal: attempt.signal })).healthy ? http : pairing
    }
    const connect = async (http: ServerConnection.HttpBase) => {
      if (!current()) return
      const result = await check(http, { signal: attempt.signal })
      if (!current()) return
      if (!result.healthy) {
        // Pairing forms contain a link or QR payload, not the endpoint needed for password recovery.
        if (result.unauthorized) setState("url", http.url)
        setState({
          unauthorized: !!result.unauthorized,
          error: result.unauthorized ? language.t("server.connect.recovery.unauthorized") : connectionError(http.url),
        })
        return
      }
      const existing = servers.list.find(
        (server): server is ServerConnection.Http => server.type === "http" && server.http.url === http.url,
      )
      servers.add(existing ? { ...existing, http } : { type: "http", http })
    }
    try {
      const value = snapshot.method === "link" ? snapshot.link : snapshot.url
      const redeemed = await redeem(value)
      if (!current()) return
      if (redeemed && "error" in redeemed) return void setState("error", redeemed.error)
      if (redeemed) return await connect(await target(redeemed.pairing))
      if (snapshot.method === "link") {
        const address = bareServerAddress(snapshot.link)
        if (address) return void setState({ method: "password", url: address, link: "", error: "" })
        return void setState("error", language.t("server.connect.link.invalid"))
      }
      const url = serverAddress(snapshot.url)
      if (!url) return void setState("error", language.t("server.connect.address.invalid"))
      if (platform.platform === "web" && isMixedContent(location.href, url))
        return void setState("error", language.t("server.connect.mixedContent"))
      await connect({ url, password: snapshot.password || undefined })
    } catch {
      if (current()) setState("error", connectionError(snapshot.method === "link" ? snapshot.link : snapshot.url))
    } finally {
      if (controller === attempt) {
        controller = undefined
        clearTimeout(timer)
        setState("pending", false)
      }
    }
  }

  const edit = () => {
    if (state.unauthorized) setState("method", "password")
    requestAnimationFrame(() => {
      const field = document.getElementById(
        state.unauthorized
          ? "server-connect-password"
          : state.method === "link"
            ? "server-connect-link"
            : "server-connect-url",
      )
      if (field instanceof HTMLInputElement) {
        field.focus()
        field.select()
      }
    })
  }

  return (
    <main data-component="connect-server" aria-labelledby="server-connect-title">
      <div class="server-connect-content">
        <div class="server-connect-brand" role="img" aria-label="OpenCode">
          <Wordmark />
        </div>
        <header>
          <h1 id="server-connect-title">{language.t("server.connect.title")}</h1>
          <p>
            {language.t(state.method === "link" ? "server.connect.description.pairing" : "server.connect.description")}
          </p>
        </header>
        <Show
          when={!state.scanning}
          fallback={
            <Suspense fallback={<p role="status">{language.t("server.connect.camera.starting")}</p>}>
              <PairingScanner
                redeem={redeem}
                onCancel={() => {
                  setState("scanning", false)
                  void camera.refetch()
                }}
                onScan={(link) => {
                  setState({ method: "link", link, error: "", scanning: false })
                  void submit()
                }}
              />
            </Suspense>
          }
        >
          <form
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
          >
            <Show
              when={state.method === "password"}
              fallback={
                <div class="server-connect-field">
                  <label for="server-connect-link">{language.t("server.connect.link")}</label>
                  <TextInput
                    id="server-connect-link"
                    name="link"
                    dir="ltr"
                    type="text"
                    inputMode="url"
                    autocapitalize="off"
                    spellcheck={false}
                    required
                    appearance="large"
                    placeholder={language.t("server.connect.link.placeholder")}
                    value={state.link}
                    disabled={state.pending}
                    aria-describedby={state.error ? "server-connect-error" : undefined}
                    onInput={(event) => setState({ link: event.currentTarget.value, error: "" })}
                  />
                </div>
              }
            >
              <div class="server-connect-field">
                <label for="server-connect-url">{language.t("dialog.server.add.url")}</label>
                <TextInput
                  id="server-connect-url"
                  name="server"
                  dir="ltr"
                  type="text"
                  inputMode="url"
                  autocomplete="url"
                  autocapitalize="off"
                  spellcheck={false}
                  required
                  appearance="large"
                  placeholder={language.t("dialog.server.add.placeholder")}
                  value={state.url}
                  disabled={state.pending}
                  aria-describedby={state.error ? "server-connect-error" : undefined}
                  onInput={(event) => setState({ url: event.currentTarget.value, error: "" })}
                />
              </div>
              <div class="server-connect-field">
                <label for="server-connect-password">{language.t("dialog.server.add.password")}</label>
                <TextInput
                  id="server-connect-password"
                  name="password"
                  type="password"
                  autocomplete="current-password"
                  appearance="large"
                  value={state.password}
                  disabled={state.pending}
                  aria-describedby="server-connect-password-hint"
                  onInput={(event) => setState({ password: event.currentTarget.value, error: "" })}
                />
                <p id="server-connect-password-hint" class="server-connect-hint">
                  {language.t("server.connect.password.hint")}
                </p>
              </div>
            </Show>
            <Show when={state.error}>
              <p id="server-connect-error" class="server-connect-error" role="alert">
                {state.error}
              </p>
              <Button type="button" variant="outline" onClick={edit}>
                {language.t(
                  state.unauthorized ? "server.connect.recovery.credentials" : "server.connect.recovery.edit",
                )}
              </Button>
              <details>
                <summary>{language.t("server.connect.recovery.diagnostics")}</summary>
                <p>{language.t("server.connect.recovery.steps")}</p>
              </details>
            </Show>
            <Button
              type="submit"
              variant="contrast"
              size="large"
              disabled={state.pending || !(state.method === "link" ? state.link : state.url).trim()}
            >
              {language.t(
                state.pending
                  ? "dialog.server.add.checking"
                  : state.error
                    ? "server.connect.recovery.retry"
                    : "server.connect.button",
              )}
            </Button>
            <Show when={state.pending}>
              <Button type="button" variant="outline" onClick={() => cancel()}>
                {language.t("common.cancel")}
              </Button>
            </Show>
          </form>
          <Show when={state.method === "link" && platform.platform === "web"}>
            <Show
              when={camera.available.latest || camera.available.loading}
              fallback={<p>{language.t(cameraHint())}</p>}
            >
              <Button
                variant="neutral"
                size="large"
                disabled={state.pending || !camera.available.latest}
                onClick={() => setState("scanning", true)}
              >
                {language.t("server.connect.scan")}
              </Button>
            </Show>
          </Show>
          <ConnectMethodSwitch
            method={state.method}
            disabled={state.pending}
            onChange={(method) => setState({ method, error: "" })}
          />
          <Show when={state.method === "link"}>
            <footer>
              <p>{language.t("server.connect.pair.link")}</p>
              <code dir="ltr">opencode pair</code>
            </footer>
          </Show>
        </Show>
      </div>
    </main>
  )
}

import { parseConfig } from "@opencode/frontend-plugin/config"
import { For, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { Dialog, DialogHeader, DialogTitle } from "@opencode/ui/dialog"
import { Button } from "@opencode/ui/button"
import { Switch } from "@opencode/ui/switch"
import { useLanguage } from "@/runtime/i18n/language"
import { SettingsList } from "@/settings/list"
import { SettingsRow } from "@/settings/row"
import { pluginDiagnostic } from "./diagnostics"
import { usePlugins, type PluginsApi } from "./context"

function PluginSettingsBody(props: { plugins: PluginsApi }) {
  const plugins = props.plugins
  const language = useLanguage()
  const [state, setState] = createStore<{
    error: "" | "parse" | "configuration" | "apply"
    detail: string
    importing: boolean
    preview?: { value: unknown; result: ReturnType<PluginsApi["previewConfig"]> }
  }>({ error: "", detail: "", importing: false })
  let importButton: HTMLButtonElement | undefined
  let previewHeading: HTMLHeadingElement | undefined
  const diagnostics = (error: unknown) =>
    pluginDiagnostic(error, [...plugins.state.config, ...(state.preview?.result.plugins ?? [])])
  const apply = async () => {
    const preview = state.preview
    if (!preview || state.importing) return
    setState({ importing: true, error: "", detail: "" })
    try {
      await plugins.importConfig(preview.value)
      const available = new Set(plugins.host.definitions().map((plugin) => plugin.id))
      const failed = plugins.host.state.statuses.filter(
        (status) => available.has(status.id) && status.state === "error",
      )
      if (failed.length) {
        setState({ error: "apply", detail: failed.map((status) => `${status.id}: ${status.error ?? ""}`).join("\n") })
        return
      }
      setState("preview", undefined)
      importButton?.focus()
    } catch (error) {
      setState({ error: "apply", detail: String(error) })
    } finally {
      setState("importing", false)
    }
  }
  let fileInput!: HTMLInputElement
  return (
    <div class="settings-tab-body settings-tab-body--sectioned" data-component="plugin-manager">
      <div class="settings-section">
        <h3 class="settings-section-title">{language.t("plugins.installed")}</h3>
        <SettingsList>
          <For each={plugins.host.definitions()}>
            {(plugin) => {
              const status = () => plugins.host.state.statuses.find((entry) => entry.id === plugin.id)
              return (
                <SettingsRow
                  title={plugin.name}
                  description={
                    <div class="flex flex-col gap-1">
                      <span>
                        {language.t(`plugins.state.${status()?.state ?? "disabled"}`)}
                        <span class="mx-1" aria-hidden="true">
                          ·
                        </span>
                        <code>{plugin.id}</code>
                      </span>
                      <Show when={status()?.error}>
                        <div class="text-v2-text-text-base break-words" role="alert">
                          <p>{language.t("plugins.error.initialization")}</p>
                          <details>
                            <summary>{language.t("plugins.error.details")}</summary>
                            <pre class="whitespace-pre-wrap">{diagnostics(status()?.error)}</pre>
                          </details>
                        </div>
                      </Show>
                    </div>
                  }
                >
                  <Switch
                    hideLabel
                    checked={plugins.state.config.find((entry) => entry.id === plugin.id)?.enabled ?? false}
                    disabled={state.importing || !!state.preview || status()?.state === "loading"}
                    onChange={async (enabled) => {
                      setState("error", "")
                      try {
                        await plugins.toggle(plugin.id, enabled)
                      } catch (error) {
                        setState({ error: "apply", detail: String(error) })
                      }
                    }}
                  >
                    {plugin.name}
                  </Switch>
                </SettingsRow>
              )
            }}
          </For>
        </SettingsList>
        <p class="text-12-regular text-v2-text-text-muted leading-5">{language.t("plugins.visibility")}</p>
      </div>
      <div class="settings-section">
        <h3 class="settings-section-title">{language.t("plugins.configuration")}</h3>
        <SettingsList>
          <SettingsRow title={language.t("plugins.import.button")} description={language.t("plugins.import")}>
            <Button
              ref={importButton}
              variant="outline"
              size="normal"
              disabled={state.importing}
              onClick={() => fileInput.click()}
            >
              {language.t("plugins.import.button")}
            </Button>
            <input
              ref={fileInput}
              type="file"
              hidden
              accept=".json,.jsonc,application/json"
              aria-label={language.t("plugins.import")}
              disabled={state.importing}
              onChange={async (event) => {
                const input = event.currentTarget
                const file = input.files?.[0]
                if (!file) return
                setState({ importing: true, error: "", detail: "", preview: undefined })
                try {
                  let value: unknown
                  try {
                    value = parseConfig(await file.text())
                  } catch (error) {
                    setState({ error: "parse", detail: String(error) })
                    return
                  }
                  const result = plugins.previewConfig(value)
                  setState("preview", { value, result })
                  requestAnimationFrame(() => previewHeading?.focus())
                } catch (error) {
                  setState({ error: "configuration", detail: String(error) })
                } finally {
                  input.value = ""
                  setState("importing", false)
                }
              }}
            />
          </SettingsRow>
        </SettingsList>
        <p class="text-12-regular text-v2-text-text-muted leading-5">{language.t("plugins.trust")}</p>
        <Show when={state.preview}>
          {(preview) => (
            <section aria-label={language.t("plugins.preview.title")} class="flex flex-col gap-3">
              <h3 ref={previewHeading} tabIndex={-1} class="settings-section-title outline-none">
                {language.t("plugins.preview.title")}
              </h3>
              <p>{language.t("plugins.preview.replacement")}</p>
              <p>{language.t("plugins.preview.code")}</p>
              <SettingsList>
                <For each={preview().result.changes}>
                  {(change) => (
                    <SettingsRow
                      title={change.name}
                      description={language.t(`plugins.preview.${change.action}`)}
                      children={null}
                    />
                  )}
                </For>
              </SettingsList>
              <Show when={preview().result.unsupported.length}>
                <div role="status">
                  <p>{language.t("plugins.preview.ignored")}</p>
                  <For each={preview().result.unsupported}>
                    {(source) => (
                      <p>
                        <code>{diagnostics(source)}</code>
                      </p>
                    )}
                  </For>
                </div>
              </Show>
              <p>{language.t("plugins.preview.recovery")}</p>
              <div class="flex gap-2">
                <Button variant="contrast" disabled={state.importing} onClick={() => void apply()}>
                  {language.t("plugins.preview.apply")}
                </Button>
                <Button
                  variant="outline"
                  disabled={state.importing}
                  onClick={() => {
                    setState({ preview: undefined, error: "", detail: "" })
                    importButton?.focus()
                  }}
                >
                  {language.t("plugins.preview.back")}
                </Button>
              </div>
            </section>
          )}
        </Show>
        <Show when={plugins.state.unsupported.length}>
          <div role="status" class="text-12-regular text-v2-text-text-muted">
            <p>{language.t("plugins.unsupported")}</p>
            <For each={plugins.state.unsupported}>
              {(source) => (
                <p class="break-words">
                  <code>{diagnostics(source)}</code>
                </p>
              )}
            </For>
          </div>
        </Show>
        <Show when={state.error}>
          <div role="alert" class="text-12-regular text-v2-text-text-base break-words">
            <p>{language.t(`plugins.error.${state.error}`)}</p>
            <details>
              <summary>{language.t("plugins.error.details")}</summary>
              <pre class="whitespace-pre-wrap">{diagnostics(state.detail)}</pre>
            </details>
          </div>
        </Show>
      </div>
    </div>
  )
}

export function PluginSettings() {
  const plugins = usePlugins()
  const language = useLanguage()
  return (
    <>
      <div class="settings-tab-header">
        <div class="settings-tab-header-row">
          <div class="flex flex-col gap-1">
            <h2 class="settings-tab-title">{language.t("plugins.title")}</h2>
            <span class="text-11-regular text-v2-text-text-muted">{language.t("plugins.description")}</span>
          </div>
        </div>
      </div>
      <PluginSettingsBody plugins={plugins} />
    </>
  )
}

// Before connecting a service, the settings shell is unavailable.
export function PluginManager(props: { plugins: PluginsApi }) {
  const language = useLanguage()
  return (
    <Dialog size="large">
      <DialogHeader>
        <DialogTitle>{language.t("plugins.title")}</DialogTitle>
      </DialogHeader>
      <div class="px-5 pb-5">
        <p class="text-12-regular text-v2-text-text-muted mb-4">{language.t("plugins.description")}</p>
        <PluginSettingsBody plugins={props.plugins} />
      </div>
    </Dialog>
  )
}

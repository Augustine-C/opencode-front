import { parseConfig } from "@opencode/frontend-plugin/config"
import { For, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { Dialog, DialogHeader, DialogTitle } from "@opencode/ui/dialog"
import { Button } from "@opencode/ui/button"
import { Switch } from "@opencode/ui/switch"
import { useLanguage } from "@/runtime/i18n/language"
import { SettingsList } from "@/settings/list"
import { SettingsRow } from "@/settings/row"
import { usePlugins, type PluginsApi } from "./context"

function PluginSettingsBody(props: { plugins: PluginsApi }) {
  const plugins = props.plugins
  const language = useLanguage()
  const [state, setState] = createStore({ error: "", importing: false })
  const diagnostics = plugins.resolution
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
                        <span class="text-v2-text-text-base break-words" role="alert">
                          {status()?.error}
                        </span>
                      </Show>
                    </div>
                  }
                >
                  <Switch
                    aria-label={plugin.name}
                    checked={plugins.state.config.find((entry) => entry.id === plugin.id)?.enabled ?? false}
                    disabled={state.importing || status()?.state === "loading"}
                    onChange={async (enabled) => {
                      setState("error", "")
                      try {
                        await plugins.toggle(plugin.id, enabled)
                      } catch (error) {
                        setState("error", String(error))
                      }
                    }}
                  />
                </SettingsRow>
              )
            }}
          </For>
        </SettingsList>
      </div>
      <div class="settings-section">
        <h3 class="settings-section-title">{language.t("plugins.configuration")}</h3>
        <SettingsList>
          <SettingsRow title={language.t("plugins.import.button")} description={language.t("plugins.import")}>
            <Button variant="outline" size="normal" disabled={state.importing} onClick={() => fileInput.click()}>
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
                setState({ importing: true, error: "" })
                try {
                  await plugins.importConfig(parseConfig(await file.text()))
                } catch (error) {
                  setState("error", String(error))
                } finally {
                  input.value = ""
                  setState("importing", false)
                }
              }}
            />
          </SettingsRow>
        </SettingsList>
        <p class="text-12-regular text-v2-text-text-muted leading-5">{language.t("plugins.trust")}</p>
        <Show when={plugins.state.unsupported.length}>
          <div role="status" class="text-12-regular text-v2-text-text-muted">
            <p>{language.t("plugins.unsupported")}</p>
            <For each={plugins.state.unsupported}>
              {(source) => (
                <p class="break-words">
                  <code>{source}</code>
                </p>
              )}
            </For>
          </div>
        </Show>
        <Show when={diagnostics().suppressed.length || diagnostics().degraded.length}>
          <p class="text-12-regular text-v2-text-text-muted">
            {language.t("plugins.diagnostics", {
              suppressed: diagnostics().suppressed.length,
              degraded: diagnostics().degraded.length,
            })}
          </p>
        </Show>
        <Show when={state.error}>
          <p role="alert" class="text-12-regular text-v2-text-text-base break-words">
            {state.error}
          </p>
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

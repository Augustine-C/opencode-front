import { parseConfig } from "@opencode/frontend-plugin/config"
import { For, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { Dialog, DialogHeader, DialogTitle } from "@opencode/ui/dialog"
import { useLanguage } from "@/runtime/i18n/language"
import type { PluginsApi } from "./context"

export function PluginManager(props: { plugins: PluginsApi }) {
  const plugins = props.plugins
  const language = useLanguage()
  const [state, setState] = createStore({ error: "", importing: false })
  const diagnostics = plugins.resolution
  return (
    <Dialog fit containerClass="!max-h-[calc(100dvh-32px)] !max-w-[calc(100vw-32px)]">
      <DialogHeader>
        <DialogTitle>{language.t("plugins.title")}</DialogTitle>
      </DialogHeader>
      <div class="p-5 flex flex-col gap-4 text-sm" data-component="plugin-manager">
        <p>{language.t("plugins.description")}</p>
        <For each={plugins.host.definitions()}>
          {(plugin) => {
            const status = () => plugins.host.state.statuses.find((entry) => entry.id === plugin.id)
            return (
              <label class="flex items-start gap-3 border-b pb-3">
                <input
                  type="checkbox"
                  checked={plugins.state.config.find((entry) => entry.id === plugin.id)?.enabled ?? false}
                  onChange={(event) =>
                    void plugins
                      .toggle(plugin.id, event.currentTarget.checked)
                      ?.catch((error) => setState("error", String(error)))
                  }
                />
                <span class="flex flex-col gap-1">
                  <strong>{plugin.name}</strong>
                  <code>{plugin.id}</code>
                  <span>{language.t(`plugins.state.${status()?.state ?? "disabled"}`)}</span>
                  <Show when={status()?.error}>
                    <span role="alert">{status()?.error}</span>
                  </Show>
                </span>
              </label>
            )
          }}
        </For>
        <label class="flex flex-col gap-2">
          <span>{language.t("plugins.import")}</span>
          <input
            type="file"
            accept=".json,.jsonc,application/json"
            disabled={state.importing}
            onChange={async (event) => {
              const file = event.currentTarget.files?.[0]
              if (!file) return
              setState({ importing: true, error: "" })
              try {
                await plugins.importConfig(parseConfig(await file.text()))
              } catch (error) {
                setState("error", String(error))
              } finally {
                setState("importing", false)
              }
            }}
          />
        </label>
        <p>{language.t("plugins.trust")}</p>
        <Show when={plugins.state.unsupported.length}>
          <div role="status">
            {language.t("plugins.unsupported")}
            <For each={plugins.state.unsupported}>
              {(source) => (
                <p>
                  <code>{source}</code>
                </p>
              )}
            </For>
          </div>
        </Show>
        <Show when={diagnostics().suppressed.length || diagnostics().degraded.length}>
          <p>
            {language.t("plugins.diagnostics", {
              suppressed: diagnostics().suppressed.length,
              degraded: diagnostics().degraded.length,
            })}
          </p>
        </Show>
        <Show when={state.error}>
          <p role="alert">{state.error}</p>
        </Show>
      </div>
    </Dialog>
  )
}

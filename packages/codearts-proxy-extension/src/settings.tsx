import { useExtension } from "@opencode/gui-extensions/sdk"
import { Switch } from "@opencode/ui/switch"
import type definition from "./index"

export default function ProxySettings() {
  const ctx = useExtension<typeof definition>()
  const preferences = ctx.stores.preferences
  return (
    <section data-component="codearts-proxy-settings">
      <p>{ctx.t("settings.description")}</p>
      <Switch
        checked={preferences.value.enabled}
        onChange={(enabled) =>
          preferences.update((draft) => {
            draft.enabled = enabled
          })
        }
      >
        {ctx.t("settings.enabled")}
      </Switch>
      <label>
        {ctx.t("endpoint")}
        <input
          type="url"
          value={preferences.value.endpoint}
          onInput={(event) =>
            preferences.update((draft) => {
              draft.endpoint = event.currentTarget.value
            })
          }
        />
      </label>
      <label>
        {ctx.t("settings.interval")}
        <input
          type="number"
          min="5"
          step="1"
          value={preferences.value.interval / 1000}
          onChange={(event) => {
            const seconds = event.currentTarget.valueAsNumber
            if (!Number.isFinite(seconds) || seconds < 5) return
            preferences.update((draft) => {
              draft.interval = seconds * 1000
            })
          }}
        />
      </label>
    </section>
  )
}

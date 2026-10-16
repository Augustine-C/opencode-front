import type { Definition } from "@opencode/frontend-plugin"
import { resetConfiguration, resolveConfiguration } from "@opencode/frontend-plugin/configuration"
import { Button } from "@opencode/ui/button"
import { For, Show, createUniqueId, onMount } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { useLanguage } from "@/runtime/i18n/language"
import type { PluginsApi } from "./context"
import "./configuration-form.css"

export function PluginConfigurationForm(props: { definition: Definition; plugins: PluginsApi; onClose: () => void }) {
  const language = useLanguage()
  const configuration = props.definition.configuration!
  const initial = props.plugins.state.config.find((entry) => entry.id === props.definition.id)?.options ?? {}
  const [state, setState] = createStore({
    draft: resolveConfiguration(configuration, JSON.parse(JSON.stringify(initial))).options,
    saving: false,
    failed: false,
  })
  const id = createUniqueId()
  const resolved = () => resolveConfiguration(configuration, state.draft)
  let heading!: HTMLHeadingElement
  onMount(() => {
    heading.focus()
    heading.scrollIntoView({ block: "nearest" })
  })
  const display = (value: unknown) =>
    value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value)
  return (
    <form
      class="plugin-configuration settings-section"
      aria-labelledby={`${id}-title`}
      noValidate
      onSubmit={async (event) => {
        event.preventDefault()
        if (state.saving || resolved().issues.length) return
        setState({ saving: true, failed: false })
        try {
          await props.plugins.saveOptions(props.definition.id, resolved().options)
          props.onClose()
        } catch {
          setState("failed", true)
        } finally {
          setState("saving", false)
        }
      }}
    >
      <h3 ref={heading} id={`${id}-title`} tabIndex={-1} class="settings-section-title outline-none">
        {language.t("plugins.options.title", { name: props.definition.name })}
      </h3>
      <p>{language.t("plugins.options.description")}</p>
      <For each={configuration.fields}>
        {(field, index) => {
          const fieldID = `${id}-${index()}`
          const issue = () => resolved().issues.find((entry) => entry.key === field.key)
          const error = () => {
            const code = issue()?.code
            if (!code) return ""
            return language.t(`plugins.options.validation.${code}`, {
              min: "min" in field ? String(field.min ?? "−∞") : "",
              max: "max" in field ? String(field.max ?? "∞") : "",
            })
          }
          const value = () =>
            Object.prototype.hasOwnProperty.call(state.draft, field.key) ? state.draft[field.key] : undefined
          return (
            <div class="plugin-configuration-field">
              <label for={fieldID}>
                {field.label}
                <Show when={field.required}>
                  <span class="text-v2-text-text-muted"> {language.t("plugins.options.required")}</span>
                </Show>
              </label>
              <Show when={field.description}>
                <p id={`${fieldID}-description`} class="text-v2-text-text-muted">
                  {field.description}
                </p>
              </Show>
              <Show
                when={field.type === "boolean"}
                fallback={
                  <Show
                    when={field.type === "select"}
                    fallback={
                      <input
                        id={fieldID}
                        type={field.type === "number" ? "number" : "text"}
                        step={field.type === "number" ? "any" : undefined}
                        min={field.type === "number" ? field.min : undefined}
                        max={field.type === "number" ? field.max : undefined}
                        required={field.required}
                        disabled={state.saving}
                        value={display(value())}
                        aria-invalid={!!issue()}
                        aria-describedby={`${fieldID}-description ${fieldID}-error`}
                        onInput={(event) => {
                          const input = event.currentTarget
                          setState(
                            "draft",
                            field.key,
                            field.type === "number"
                              ? input.value === "" && !input.validity.badInput
                                ? undefined
                                : input.valueAsNumber
                              : input.value,
                          )
                        }}
                      />
                    }
                  >
                    <select
                      id={fieldID}
                      required={field.required}
                      disabled={state.saving}
                      value={display(value())}
                      aria-invalid={!!issue()}
                      aria-describedby={`${fieldID}-description ${fieldID}-error`}
                      onChange={(event) => setState("draft", field.key, event.currentTarget.value || undefined)}
                    >
                      <option value="">{language.t("plugins.options.select")}</option>
                      <Show
                        when={
                          value() !== undefined &&
                          field.type === "select" &&
                          !field.options.some((option) => option.value === value())
                        }
                      >
                        <option value={display(value())} disabled>
                          {display(value())}
                        </option>
                      </Show>
                      <For each={field.type === "select" ? field.options : []}>
                        {(option) => <option value={option.value}>{option.label}</option>}
                      </For>
                    </select>
                  </Show>
                }
              >
                <input
                  id={fieldID}
                  type="checkbox"
                  checked={value() === true}
                  disabled={state.saving}
                  aria-required={field.required}
                  aria-invalid={!!issue()}
                  aria-describedby={`${fieldID}-description ${fieldID}-error`}
                  onChange={(event) => setState("draft", field.key, event.currentTarget.checked)}
                />
              </Show>
              <Show when={issue()}>
                <p id={`${fieldID}-error`} role="alert">
                  {error()}
                </p>
              </Show>
            </div>
          )
        }}
      </For>
      <Show when={state.failed}>
        <p role="alert">{language.t("plugins.options.saveError")}</p>
      </Show>
      <div class="flex flex-wrap gap-2">
        <Button type="submit" disabled={state.saving || !!resolved().issues.length}>
          {language.t("plugins.options.save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={state.saving}
          onClick={() => setState("draft", reconcile(resetConfiguration(configuration, state.draft)))}
        >
          {language.t("plugins.options.reset")}
        </Button>
        <Button type="button" variant="ghost-muted" disabled={state.saving} onClick={props.onClose}>
          {language.t("plugins.options.cancel")}
        </Button>
      </div>
    </form>
  )
}

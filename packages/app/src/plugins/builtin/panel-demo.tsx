import { define } from "@opencode/frontend-plugin"
import { createEffect, For, onCleanup, untrack } from "solid-js"
import { createStore } from "solid-js/store"
import { Button } from "@opencode/ui/button"
import { Checkbox } from "@opencode/ui/checkbox"
import type { useLanguage } from "@/runtime/i18n/language"
import "./panel-demo.css"

// A local-only example: no client requests, endpoints, or project mutations.
export function panelDemo(language: ReturnType<typeof useLanguage>) {
  return define({
    id: "panel-demo",
    get name() {
      return language.t("plugins.demo.name")
    },
    apiVersion: 1,
    setup(context) {
      const [state, setState] = createStore({ completed: [true, false, false], note: "" })
      const title = () =>
        typeof context.options.title === "string" && context.options.title.trim()
          ? context.options.title.trim()
          : language.t("plugins.demo.title")
      const presentation = context.options.presentation === "fullscreen" ? "fullscreen" : "panel"
      const open = () => {
        context.ui.panel.open("panel-demo", { title: title(), presentation })
      }
      const tasks = ["plugins.demo.task.review", "plugins.demo.task.checks", "plugins.demo.task.release"] as const
      const completed = () => state.completed.filter(Boolean).length

      createEffect(() => {
        const label = language.t("plugins.demo.open")
        onCleanup(untrack(() => context.ui.command({ id: "open", title: label, run: open })))
      })
      createEffect(() => {
        if (context.options.showLauncher === false) return
        const label = title()
        onCleanup(untrack(() => context.ui.panel.register({ name: "panel-demo", title: label, presentation })))
      })
      context.ui.slot({
        append: "session.panel",
        render: (input) =>
          input.name === "panel-demo" ? (
            <section data-component="plugin-panel-demo">
              <div class="panel-demo-intro">
                <span class="panel-demo-badge">{language.t("plugins.demo.sample")}</span>
                <p>{language.t("plugins.demo.description")}</p>
              </div>
              <dl class="panel-demo-metrics">
                <div>
                  <dt>{language.t("plugins.demo.build")}</dt>
                  <dd class="panel-demo-ready">{language.t("plugins.demo.ready")}</dd>
                </div>
                <div>
                  <dt>{language.t("plugins.demo.completed")}</dt>
                  <dd>
                    {completed()} / {tasks.length}
                  </dd>
                </div>
              </dl>
              <div class="panel-demo-sections">
                <section class="panel-demo-card">
                  <h3>{language.t("plugins.demo.checklist")}</h3>
                  <div
                    role="progressbar"
                    aria-label={language.t("plugins.demo.checklist")}
                    aria-valuemin={0}
                    aria-valuemax={tasks.length}
                    aria-valuenow={completed()}
                    class="panel-demo-progress"
                  >
                    <span style={{ width: `${(completed() / tasks.length) * 100}%` }} />
                  </div>
                  <div class="panel-demo-tasks">
                    <For each={tasks}>
                      {(task, index) => (
                        <Checkbox
                          checked={state.completed[index()]}
                          onChange={(checked) => setState("completed", index(), checked)}
                        >
                          {language.t(task)}
                        </Checkbox>
                      )}
                    </For>
                  </div>
                </section>
                <section class="panel-demo-card">
                  <label for="panel-demo-note">{language.t("plugins.demo.notes")}</label>
                  <textarea
                    id="panel-demo-note"
                    rows={4}
                    value={state.note}
                    placeholder={language.t("plugins.demo.notesPlaceholder")}
                    onInput={(event) => setState("note", event.currentTarget.value)}
                  />
                  <span class="panel-demo-session-label">{language.t("plugins.demo.session")}</span>
                  <code class="panel-demo-session-id">{input.sessionID}</code>
                </section>
              </div>
              <div class="panel-demo-actions">
                <Button
                  size="small"
                  variant="ghost-muted"
                  onClick={() => setState({ completed: [true, false, false], note: "" })}
                >
                  {language.t("plugins.demo.reset")}
                </Button>
              </div>
            </section>
          ) : null,
      })
    },
  })
}

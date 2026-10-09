import { define } from "@opencode/frontend-plugin"
import { createEffect, For, onCleanup, untrack } from "solid-js"
import { createStore } from "solid-js/store"
import "./panel-demo.css"

// A local-only example: no client requests, endpoints, or project mutations.
export function panelDemo() {
  return define({
    id: "panel-demo",
    name: "Example panel",
    apiVersion: 1,
    setup(context) {
      const [state, setState] = createStore({ completed: [true, false, false], note: "" })
      const title = () =>
        typeof context.options.title === "string" && context.options.title.trim()
          ? context.options.title.trim()
          : "Project overview"
      const presentation = context.options.presentation === "fullscreen" ? "fullscreen" : "panel"
      const open = () => {
        context.ui.panel.open("panel-demo", { title: title(), presentation })
      }
      const tasks = ["Review changes", "Run checks", "Prepare release"]
      const completed = () => state.completed.filter(Boolean).length

      createEffect(() => {
        onCleanup(untrack(() => context.ui.command({ id: "open", title: "Open example plugin panel", run: open })))
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
                <span class="panel-demo-badge">Sample data</span>
                <p>Explore a sample project overview, checklist, and notes.</p>
              </div>
              <dl class="panel-demo-metrics">
                <div>
                  <dt>Build status</dt>
                  <dd class="panel-demo-ready">Ready</dd>
                </div>
                <div>
                  <dt>Completed checks</dt>
                  <dd>
                    {completed()} / {tasks.length}
                  </dd>
                </div>
              </dl>
              <div class="panel-demo-sections">
                <section class="panel-demo-card">
                  <h3>Checklist</h3>
                  <div
                    role="progressbar"
                    aria-label="Checklist"
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
                        <label class="panel-demo-task">
                          <input
                            type="checkbox"
                            checked={state.completed[index()]}
                            onChange={(event) => setState("completed", index(), event.currentTarget.checked)}
                          />
                          <span>{task}</span>
                        </label>
                      )}
                    </For>
                  </div>
                </section>
                <section class="panel-demo-card">
                  <label for="panel-demo-note">Notes</label>
                  <textarea
                    id="panel-demo-note"
                    rows={4}
                    value={state.note}
                    placeholder="Try adding a note…"
                    onInput={(event) => setState("note", event.currentTarget.value)}
                  />
                  <span class="panel-demo-session-label">Current session</span>
                  <code class="panel-demo-session-id">{input.sessionID}</code>
                </section>
              </div>
              <div class="panel-demo-actions">
                <button
                  type="button"
                  class="panel-demo-reset"
                  onClick={() => setState({ completed: [true, false, false], note: "" })}
                >
                  Reset example
                </button>
              </div>
            </section>
          ) : null,
      })
    },
  })
}

import type { Context } from "@opencode/frontend-plugin"
import { createSignal } from "solid-js"
import "./style.css"

export function setup(context: Context) {
  const [greetings, setGreetings] = createSignal(
    context.storage.get<number>("greetings") ?? 0,
  )
  const removeCommand = context.ui.command({
    id: "hello",
    title: "Open Hello panel",
    run() {
      context.ui.panel.open("hello")
    },
  })
  const removePanel = context.ui.panel.register({
    name: "hello",
    title: "Hello plugin",
  })
  const removeSlot = context.ui.slot({
    append: "session.panel",
    render(input) {
      if (input.name !== "hello") return null
      return (
        <section class="hello-independent-plugin">
          <img
            src={context.assets.url("assets/hello.svg")}
            alt="Hello"
            width="32"
            height="32"
          />
          <p>Greetings saved: {greetings()}</p>
          <button
            type="button"
            onClick={() => {
              const next = greetings() + 1
              setGreetings(next)
              context.storage.set("greetings", next)
            }}
          >
            Add greeting
          </button>
        </section>
      )
    },
  })
  return () => {
    removeSlot()
    removePanel()
    removeCommand()
  }
}

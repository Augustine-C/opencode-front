import { WebContentsView } from "electron"
import { Schema } from "effect"
import { NativeCounter } from "./contract"
import { MenuItem, Panel, Plugin, SettingsPage } from "@opencode/plugin/gui"

// An independently built official GUI bundle. Its settings and side panel exercise
// the same exports a third-party package serves from ./gui-experimental.
export default Plugin.define({
  main(ctx) {
    const stored = ctx.storage.store("count", { schema: Schema.Number, initial: 0 })
    const provider = ctx.provide(NativeCounter, {
      state: () => stored.value,
      wait(_input, caller) {
        return new Promise((_resolve, reject) => {
          caller.signal.addEventListener("abort", () => reject(new Error("cancelled fixture call")), { once: true })
          provider.emit("waiting", true)
        })
      },
      embed(_input, caller) {
        const window = ctx.windows.get(caller.window)
        if (!window) throw new Error("missing caller window")
        const embed = ctx.embeds.create(new WebContentsView(), window)
        embed.show(true)
        return embed.id
      },
      increment(value) {
        stored.set(stored.value + value)
        provider.changed()
        provider.emit("changed", stored.value)
        return stored.value
      },
    })
  },
  setup(ctx) {
    const counter = ctx.main(NativeCounter)
    const content = () => (
      <>
        <p>External sidebar content: {String(ctx.options.label ?? "default")}</p>
        <input aria-label="Plugin draft" />
        <button onClick={() => void counter.increment(1)}>Call native main</button>
        <p>Native count: {counter.state()}</p>
      </>
    )
    ctx.add(Panel, {
      id: "overview",
      region: "side",
      list: () => [{ id: "main", title: "External overview", icon: "server" }],
      render: content,
    })
    ctx.add(MenuItem, {
      id: "overview",
      menu: "session.panel",
      title: "External overview",
      icon: "server",
      run: () => {
        const session = ctx.sessions.current()
        if (session) ctx.layout.open(`${ctx.id}:main`, session, { tab: "select" })
      },
    })
    ctx.add(SettingsPage, { id: ctx.id, title: "External sidebar", icon: "server", render: content })
  },
})

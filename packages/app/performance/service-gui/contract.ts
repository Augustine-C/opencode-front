import { Ipc } from "@opencode/plugin/gui"
import { Schema } from "effect"
export const NativeCounter = Ipc.define({
  id: "third-party-sidebar.native",
  state: Schema.Number,
  methods: {
    increment: { input: Schema.Number, output: Schema.Number },
    wait: { output: Schema.Boolean },
    embed: { output: Schema.String },
  },
  events: { changed: Schema.Number, waiting: Schema.Boolean },
})

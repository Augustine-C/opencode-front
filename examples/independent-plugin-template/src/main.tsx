import type { Context } from "@opencode/frontend-plugin";
import { createSignal } from "solid-js";
import "./style.css";

export function setup(context: Context) {
  const [greetings, setGreetings] = createSignal(
    context.storage.get<number>("greetings") ?? 0,
  );
  const removeCommand = context.ui.command({
    id: "hello",
    title: "Say hello",
    run() {
      const next = greetings() + 1;
      setGreetings(next);
      context.storage.set("greetings", next);
    },
  });
  const removePanel = context.ui.panel.register({
    name: "hello",
    title: "Hello plugin",
  });
  return () => {
    removePanel();
    removeCommand();
  };
}

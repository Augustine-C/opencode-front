import { render } from "solid-js/web"
import { useProjectTabGroups } from "../../src/extensions/project-tabs"
import { TabGroupNavigator } from "../../src/extensions/tab-group-navigator"
import { items, state, setState } from "./context"
import "../../src/index.css"
function App() {
  const groups = useProjectTabGroups({ tabs: () => items, current: () => state.current })
  return (
    <main style={{ padding: "24px" }}>
      <TabGroupNavigator
        groups={groups}
        tabs={groups.ordered}
        current={state.current}
        onNavigate={(tab) => setState("current", tab)}
      />
      <p id="selection">{state.current.sessionId}</p>
      <button id="attention" onClick={() => setState("attention", !state.attention)}>
        Toggle attention
      </button>
    </main>
  )
}
render(App, document.getElementById("root")!)

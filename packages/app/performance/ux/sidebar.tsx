import { createMemo, For, Show } from "solid-js"
import { useProjectTabGroups } from "../../src/extensions/project-tabs"
import { useProjectTabLayers } from "../../src/extensions/project-tab-layers"
import { TabNavItem } from "../../src/shell/titlebar/tab-nav"
import { items, state, setState, session } from "./context"

export default function SidebarFixture() {
  const tabs = createMemo(() => items.filter((tab) => !state.removed.includes(tab.sessionId)))
  const groups = useProjectTabGroups({ tabs, current: () => state.current })
  const layers = useProjectTabLayers({
    groups,
    tabs: groups.ordered,
    current: () => state.current,
    vertical: () => state.vertical,
  })
  return (
    <>
      <div class="flex gap-4 my-4">
        <button
          id="layout"
          onClick={() => setState("projectLayout", state.projectLayout === "layered" ? "single" : "layered")}
        >
          Toggle layout
        </button>
        <button id="grouping" onClick={() => setState("grouped", !state.grouped)}>
          Toggle grouping
        </button>
        <button id="orientation" onClick={() => setState("vertical", !state.vertical)}>
          Toggle orientation
        </button>
        <button id="navigate-other" onClick={() => setState("current", items.at(-1)!)}>
          Navigate to another project
        </button>
        <button
          id="close-all"
          onClick={() =>
            setState(
              "removed",
              items.map((tab) => tab.sessionId),
            )
          }
        >
          Close all tabs
        </button>
      </div>
      <div data-slot="vertical-tabs-sidebar" style={{ width: "580px", height: "540px", "max-width": "100%" }}>
        <div
          data-slot="vertical-tabs"
          data-grouped={state.grouped}
          data-orientation={state.vertical ? "vertical" : "horizontal"}
          data-project-layout={layers.enabled() ? "layered" : "single"}
          style={{ height: "100%" }}
        >
          {layers.sidebar()}
          <div data-slot="vertical-tabs-scroll" class="min-h-0 overflow-y-auto flex flex-col" data-scrollable>
            {layers.header()}
            <div data-titlebar-tab-list data-orientation={state.vertical ? "vertical" : "horizontal"}>
              <For each={groups.ordered()}>
                {(tab) => (
                  <>
                    <Show when={!layers.enabled()}>{groups.heading(tab, groups.ordered)}</Show>
                    <div data-titlebar-tab-slot hidden={layers.enabled() ? layers.hidden(tab) : groups.collapsed(tab)}>
                      <TabNavItem
                        href="#"
                        server={tab.server}
                        session={session(tab.sessionId)}
                        preparing={false}
                        unread={state.unread}
                        attention={state.attention}
                        loading={state.status === "running"}
                        grouped={state.grouped}
                        orientation={state.vertical ? "vertical" : "horizontal"}
                        active={tab.server === state.current.server && tab.sessionId === state.current.sessionId}
                        onNavigate={() => setState("current", tab)}
                        onClose={() => setState("removed", [...state.removed, tab.sessionId])}
                        onDelete={() => {}}
                        onRememberTitle={() => {}}
                        onSaveTitle={async () => {}}
                      />
                    </div>
                  </>
                )}
              </For>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

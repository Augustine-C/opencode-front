import "../../src/shell/titlebar/titlebar.css"
import { Icon } from "@opencode/ui/icon"
import { IconButton } from "@opencode/ui/icon-button"
import { ResizeHandle } from "@opencode/ui/resize-handle"
import { useProjectSidebarLayout } from "../../src/extensions/project-sidebar-layout"
import { SidebarToolbar } from "../../src/extensions/sidebar-toolbar"
import { createMemo, For, Show } from "solid-js"
import { useProjectTabGroups } from "../../src/extensions/project-tabs"
import { useProjectTabLayers } from "../../src/extensions/project-tab-layers"
import { TabNavItem } from "../../src/shell/titlebar/tab-nav"
import { items, state, setState, session } from "./context"

export default function SidebarFixture() {
  const tabs = createMemo(() => items.filter((tab) => !state.removed.includes(tab.sessionId)))
  const groups = useProjectTabGroups({ tabs, current: () => state.current })
  const sizing = useProjectSidebarLayout()
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
      <div
        data-slot="vertical-tabs-sidebar"
        class="relative flex flex-col"
        style={{
          width: `${layers.enabled() ? sizing.width() : 244}px`,
          height: "540px",
          "--sidebar-inset-end": "3px",
          "max-width": "100%",
        }}
      >
        <SidebarToolbar
          toggle={<IconButton icon={<Icon name="layout-left" />} aria-label="Toggle sidebar" />}
          home={<IconButton icon={<Icon name="grid-plus" />} aria-label="Home" />}
          search={
            <button type="button" class="flex w-full items-center gap-2 px-2 rounded">
              <Icon name="magnifying-glass" size="small" />
              Search sessions
            </button>
          }
        />
        <div
          class="relative min-w-0 min-h-0 overflow-hidden"
          data-slot="vertical-tabs"
          data-grouped={state.grouped}
          data-orientation={state.vertical ? "vertical" : "horizontal"}
          data-project-layout={layers.enabled() ? "layered" : "single"}
          data-project-compact={layers.enabled() && layers.compact()}
          style={{ "--project-column-width": `${layers.projectColumn()}px` }}
        >
          {layers.sidebar()}
          <div data-slot="tab-session-column">
            {layers.header(() => (
              <button type="button" onClick={layers.createSession}>
                New session
              </button>
            ))}
            <div data-slot="vertical-tabs-scroll" class="min-h-0 overflow-y-auto flex flex-col" data-scrollable>
              <div data-titlebar-tab-list data-orientation={state.vertical ? "vertical" : "horizontal"}>
                <For each={groups.ordered()}>
                  {(tab) => (
                    <>
                      <Show when={!layers.enabled()}>{groups.heading(tab, groups.ordered)}</Show>
                      <div
                        data-titlebar-tab-slot
                        hidden={layers.enabled() ? layers.hidden(tab) : groups.collapsed(tab)}
                      >
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
            {layers.footer()}
          </div>
        </div>
        <Show when={layers.enabled()}>
          <ResizeHandle
            direction="horizontal"
            size={sizing.width()}
            min={sizing.min()}
            max={sizing.max()}
            onResize={sizing.resize}
          />
        </Show>
      </div>
    </>
  )
}

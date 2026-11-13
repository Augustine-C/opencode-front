import { createMediaQuery } from "@solid-primitives/media"
import { createMemo, For, on, Show, type Accessor } from "solid-js"
import { createStore } from "solid-js/store"
import { Icon } from "@opencode/ui/icon"
import { ProjectAvatar } from "@opencode/ui/project-avatar"
import { useLanguage } from "@/runtime/i18n/language"
import { useSettings } from "@/settings/model"
import { tabKey, useTabs, type Tab } from "@/shell/tabs/tabs"
import type { useProjectTabGroups } from "./project-tabs"

// Keep every native tab mounted: loading, shortcuts and navigation retain their owners when a project is hidden.
export function useProjectTabLayers(input: {
  groups: ReturnType<typeof useProjectTabGroups>
  tabs: Accessor<readonly Tab[]>
  current: Accessor<Tab | undefined>
  vertical: Accessor<boolean>
}) {
  const settings = useSettings()
  const language = useLanguage()
  const tabs = useTabs()
  const desktop = createMediaQuery("(min-width: 768px)")
  const enabled = () =>
    desktop() && input.vertical() && input.groups.enabled() && settings.appearance.projectTabLayout() === "layered"
  const projects = createMemo(() => {
    const seen = new Set<string>()
    return input.tabs().filter((tab) => {
      const key = input.groups.key(tab)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  })
  // A new navigation visit follows its project. Browsing the project rail within that visit leaves the chat alone.
  const navigation = createMemo(() => {
    const current = input.current()
    return current ? JSON.stringify([tabKey(current), input.groups.key(current)]) : undefined
  })
  const visit = createMemo(on(navigation, () => Symbol()))
  const [state, setState] = createStore<{ selection?: { visit: symbol; key: string } }>({})
  const selected = createMemo(() => {
    const selection = state.selection
    if (selection?.visit === visit() && projects().some((tab) => input.groups.key(tab) === selection.key))
      return selection.key
    const current = input.current()
    if (current && projects().some((tab) => input.groups.key(tab) === input.groups.key(current)))
      return input.groups.key(current)
    const first = projects()[0]
    return first ? input.groups.key(first) : undefined
  })
  const current = createMemo(() => projects().find((tab) => input.groups.key(tab) === selected()))
  const project = () => {
    const tab = current()
    return tab ? input.groups.project(tab) : undefined
  }
  return {
    enabled,
    hidden: (tab: Tab) => enabled() && input.groups.key(tab) !== selected(),
    sidebar: () => (
      <Show when={enabled()}>
        <nav data-slot="tab-project-rail" aria-label={language.t("session.tab.group.projects")} data-scrollable>
          <div data-slot="tab-project-rail-title">{language.t("session.tab.group.projects")}</div>
          <For each={projects()}>
            {(tab, index) => {
              const project = () => input.groups.project(tab)
              const instance = () => input.groups.instanceKey(tab)
              return (
                <>
                  <Show when={index() === 0 || input.groups.instanceKey(projects()[index() - 1]) !== instance()}>
                    <div data-slot="tab-project-rail-instance">{input.groups.instanceLabel(instance())}</div>
                  </Show>
                  <button
                    type="button"
                    data-slot="tab-project-rail-item"
                    aria-current={selected() === input.groups.key(tab) ? "true" : undefined}
                    title={project()?.title}
                    disabled={!settings.ready()}
                    onClick={() => setState("selection", { visit: visit(), key: input.groups.key(tab) })}
                  >
                    <ProjectAvatar
                      fallback={project()?.label ?? ""}
                      src={project()?.src}
                      variant={project()?.variant}
                    />
                    <span data-slot="tab-project-rail-label">
                      <span>{project()?.label}</span>
                      <small>{project()?.directory}</small>
                    </span>
                    <Show when={input.groups.status(tab)}>
                      {(status) => (
                        <span
                          data-slot="tab-group-status"
                          data-status={status()}
                          role="img"
                          aria-label={language.t(`session.tab.group.status.${status()}`)}
                        >
                          <Icon name={status() === "unread" ? "bullet-list" : "circle-exclamation"} size="small" />
                        </span>
                      )}
                    </Show>
                  </button>
                </>
              )
            }}
          </For>
        </nav>
      </Show>
    ),
    header: () => (
      <Show when={enabled() && current()}>
        <div data-slot="tab-project-session-header">
          <strong>{project()?.label}</strong>
          <span title={project()?.directory}>{project()?.directory}</span>
          <button
            type="button"
            disabled={!settings.ready() || !project()?.directory}
            onClick={() => {
              const tab = current()
              const directory = project()?.directory
              if (tab && directory) void tabs.newDraft({ server: tab.server, directory })
            }}
          >
            <Icon name="edit" size="small" />
            {language.t("command.session.new")}
          </button>
        </div>
      </Show>
    ),
  }
}

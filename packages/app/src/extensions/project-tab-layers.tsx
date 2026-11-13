import { createMediaQuery } from "@solid-primitives/media"
import { createMemo, For, on, Show, type Accessor, type JSX } from "solid-js"
import { createStore } from "solid-js/store"
import { Icon } from "@opencode/ui/icon"
import { IconButton } from "@opencode/ui/icon-button"
import { Menu } from "@opencode/ui/menu"
import { ProjectAvatar } from "@opencode/ui/project-avatar"
import { ResizeHandle } from "@opencode/ui/resize-handle"
import { useLanguage } from "@/runtime/i18n/language"
import { useSettings } from "@/settings/model"
import { useSettingsSurface } from "@/settings/surface"
import { useCommand } from "@/shell/commands/command"
import { setPanelResizing } from "@/shell/panel-motion"
import { tabKey, useTabs, type Tab } from "@/shell/tabs/tabs"
import { useProjectSidebarLayout } from "./project-sidebar-layout"
import type { useProjectTabGroups } from "./project-tabs"

// Keep every native tab mounted: loading, shortcuts and navigation retain their owners when a project is hidden.
export function useProjectTabLayers(input: {
  groups: ReturnType<typeof useProjectTabGroups>
  tabs: Accessor<readonly Tab[]>
  current: Accessor<Tab | undefined>
  vertical: Accessor<boolean>
}) {
  const settings = useSettings()
  const surface = useSettingsSurface()
  const language = useLanguage()
  const tabs = useTabs()
  const command = useCommand()
  const sizing = useProjectSidebarLayout()
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
  const instances = createMemo(() => [...new Set(projects().map(input.groups.instanceKey))])
  // A new navigation visit follows its project. Browsing projects within that visit leaves the chat alone.
  const navigation = createMemo(() => {
    const current = input.current()
    return current ? JSON.stringify([tabKey(current), input.groups.key(current)]) : undefined
  })
  const visit = createMemo(on(navigation, () => Symbol()))
  const [state, setState] = createStore<{
    selection?: { visit: symbol; key: string }
    instance?: { visit: symbol; key: string }
    filter?: { visit: symbol; project: string; text: string }
  }>({})
  const instance = () => (state.instance?.visit === visit() ? state.instance.key : undefined)
  const listed = createMemo(() =>
    projects().filter((tab) => !instance() || input.groups.instanceKey(tab) === instance()),
  )
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
  const query = () => (state.filter?.visit === visit() && state.filter.project === selected() ? state.filter.text : "")
  const matches = (tab: Tab) =>
    (input.groups.project(tab)?.conversation ?? "").toLowerCase().includes(query().trim().toLowerCase())
  const sessions = createMemo(() => input.tabs().filter((tab) => input.groups.key(tab) === selected()))
  const count = () => sessions().length
  const noMatches = () => !!query().trim() && !sessions().some(matches)
  const createSession = () => {
    const tab = current()
    const directory = project()?.directory
    if (!settings.ready()) return
    if (tab && directory) void tabs.newDraft({ server: tab.server, directory })
    else command.trigger("tab.new")
  }
  return {
    enabled,
    compact: sizing.compact,
    projectColumn: sizing.projectColumn,
    createSession,
    hidden: (tab: Tab) => enabled() && (input.groups.key(tab) !== selected() || !matches(tab)),
    sidebar: () => (
      <Show when={enabled()}>
        <div data-slot="tab-project-rail-container">
          <div data-slot="tab-project-rail-heading">
            <div data-slot="tab-project-rail-title">{language.t("session.tab.group.projects")}</div>
            <IconButton
              size="small"
              variant="ghost-muted"
              icon={<Icon name="plus" size="small" />}
              aria-label={language.t("session.tab.group.openProject")}
              title={language.t("session.tab.group.openProject")}
              onClick={() => command.trigger("project.select")}
            />
          </div>
          <Menu>
            <Menu.Trigger
              as="button"
              type="button"
              data-slot="tab-project-server-picker"
              title={
                instance() ? input.groups.instanceLabel(instance()!) : language.t("session.tab.group.allInstances")
              }
            >
              <Icon name="globe" size="small" />
              <span>
                {instance() ? input.groups.instanceLabel(instance()!) : language.t("session.tab.group.allInstances")}
              </span>
              <Icon name="chevron-down" size="small" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Content>
                <Menu.Item onSelect={() => setState("instance", undefined)}>
                  {language.t("session.tab.group.allInstances")}
                </Menu.Item>
                <For each={instances()}>
                  {(key) => (
                    <Menu.Item
                      onSelect={() => {
                        const first = projects().find((tab) => input.groups.instanceKey(tab) === key)
                        setState({
                          instance: { visit: visit(), key },
                          selection: first ? { visit: visit(), key: input.groups.key(first) } : undefined,
                        })
                      }}
                    >
                      {input.groups.instanceLabel(key)}
                    </Menu.Item>
                  )}
                </For>
              </Menu.Content>
            </Menu.Portal>
          </Menu>
          <nav data-slot="tab-project-rail" aria-label={language.t("session.tab.group.projects")} data-scrollable>
            <For each={listed()}>
              {(tab, index) => {
                const project = () => input.groups.project(tab)
                const instanceKey = () => input.groups.instanceKey(tab)
                return (
                  <>
                    <Show
                      when={
                        !instance() &&
                        instances().length > 1 &&
                        (index() === 0 || input.groups.instanceKey(listed()[index() - 1]) !== instanceKey())
                      }
                    >
                      <div data-slot="tab-project-rail-instance" title={input.groups.instanceLabel(instanceKey())}>
                        {input.groups.instanceLabel(instanceKey())}
                      </div>
                    </Show>
                    <button
                      type="button"
                      data-slot="tab-project-rail-item"
                      aria-label={project()?.title}
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
          <button
            type="button"
            data-slot="tab-project-settings"
            aria-label={language.t("command.settings.open")}
            title={language.t("command.settings.open")}
            onClick={() => surface.open()}
          >
            <Icon name="settings-gear" size="small" />
            <span>{language.t("sidebar.settings")}</span>
          </button>
          <Show when={!sizing.compact()}>
            <ResizeHandle
              direction="horizontal"
              size={sizing.projects()}
              min={160}
              max={sizing.projectMax()}
              aria-label={language.t("session.tab.group.resizeProjects")}
              role="separator"
              tabIndex={0}
              aria-orientation="vertical"
              aria-valuenow={sizing.projects()}
              aria-valuemin={160}
              aria-valuemax={sizing.projectMax()}
              onKeyDown={(event) => {
                if (event.ctrlKey || event.metaKey || event.altKey) return
                const direction = language.direction() === "rtl" ? -1 : 1
                const next =
                  event.key === "Home"
                    ? 160
                    : event.key === "End"
                      ? sizing.projectMax()
                      : event.key === "ArrowLeft"
                        ? sizing.projects() - 10 * direction
                        : event.key === "ArrowRight"
                          ? sizing.projects() + 10 * direction
                          : undefined
                if (next === undefined) return
                event.preventDefault()
                event.stopPropagation()
                sizing.resizeProjects(next)
              }}
              onResize={sizing.resizeProjects}
              onDraggingChange={setPanelResizing}
            />
          </Show>
        </div>
      </Show>
    ),
    header: (newSession: () => JSX.Element) => (
      <Show when={enabled()}>
        <div data-slot="tab-project-session-header">
          <div data-slot="tab-project-session-title">
            <strong>{project()?.label ?? language.t("titlebar.tabs")}</strong>
            <Show when={current() && project()?.directory}>
              <Menu>
                <Menu.Trigger
                  as={IconButton}
                  size="small"
                  variant="ghost-muted"
                  icon={<Icon name="outline-dots" size="small" />}
                  aria-label={language.t("common.moreOptions")}
                />
                <Menu.Portal>
                  <Menu.Content>
                    <Menu.Item onSelect={createSession}>{language.t("command.session.new")}</Menu.Item>
                    <Menu.Item
                      onSelect={() => {
                        const tab = current()
                        const directory = project()?.directory
                        if (tab && directory) surface.openProject({ server: tab.server, project: directory })
                      }}
                    >
                      {language.t("dialog.project.edit.title")}
                    </Menu.Item>
                  </Menu.Content>
                </Menu.Portal>
              </Menu>
            </Show>
          </div>
          <Show when={project()?.directory}>
            <span data-slot="tab-project-session-path" title={project()?.directory}>
              {project()?.directory}
            </span>
          </Show>
          <div data-slot="tab-project-session-actions">
            <div data-slot="tab-project-create">{newSession()}</div>
            <details
              data-slot="tab-project-filter"
              onToggle={(event) => {
                if (!event.currentTarget.open) setState("filter", undefined)
                else event.currentTarget.querySelector("input")?.focus()
              }}
            >
              <summary
                aria-label={language.t("session.tab.group.filter")}
                title={language.t("session.tab.group.filter")}
              >
                <Icon name="magnifying-glass" size="small" />
              </summary>
              <input
                type="search"
                aria-label={language.t("session.tab.group.filter")}
                placeholder={language.t("session.tab.group.filter")}
                value={query()}
                onInput={(event) =>
                  setState("filter", { visit: visit(), project: selected() ?? "", text: event.currentTarget.value })
                }
              />
            </details>
          </div>
          <Show when={noMatches()}>
            <span role="status">{language.t("session.tab.group.noResults")}</span>
          </Show>
        </div>
      </Show>
    ),
    footer: () => (
      <Show when={enabled()}>
        <div data-slot="tab-project-session-footer">
          <span>{language.plural("session.tab.group.openSessions", count(), { count: count() })}</span>
          <button
            type="button"
            onClick={() => command.trigger("tab.reopenClosed")}
            title={language.t("command.tab.reopenClosed")}
          >
            <Icon name="arrow-left" size="small" />
            {language.t("home.recentlyClosed")}
          </button>
        </div>
      </Show>
    ),
  }
}

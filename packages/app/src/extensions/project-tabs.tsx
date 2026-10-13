import { createEffect, createMemo, on, Show, type Accessor } from "solid-js"
import { Icon } from "@opencode/ui/icon"
import { ProjectAvatar, type ProjectAvatarStyle } from "@opencode/ui/project-avatar"
import { useSettings } from "@/settings/model"
import { useGlobal } from "@/runtime/server/runtime"
import { ServerConnection, serverName } from "@/runtime/server/registry"
import { tabKey, useTabs, type Tab } from "@/shell/tabs/tabs"
import { useLanguage } from "@/runtime/i18n/language"
import { displayName, getProjectAvatarSource, getProjectAvatarVariant } from "@opencode/ui/project-avatar"
import { pathKey } from "@/workspaces/path-key"
import { groupTabs, tabProject } from "./project-tab-model"
import "./project-tabs.css"

export function useProjectTabGroups(input: { tabs: Accessor<Tab[]>; current: Accessor<Tab | undefined> }) {
  const settings = useSettings()
  const global = useGlobal()
  const tabs = useTabs()
  const language = useLanguage()
  const enabled = () => settings.appearance.groupTabsByProject()
  const groups = createMemo(() => {
    if (!enabled())
      return new Map<
        string,
        { key: string; label: string; title: string; name: string; src?: string; variant?: ProjectAvatarStyle }
      >()
    return new Map(
      input.tabs().map((tab) => {
        const conn = global.servers.list().find((item) => ServerConnection.key(item) === tab.server)
        const ctx = conn ? global.ensureServerCtx(conn) : undefined
        const session = tab.type === "session" ? ctx?.data.session.get(tab.sessionId) : undefined
        const draft = tab.type === "draft" ? tab : tabs.pendingSession(tab.server, tab.sessionId)?.draft
        const directory = session?.location.directory ?? draft?.directory ?? tabs.info[tabKey(tab)]?.directory
        const project = tabProject(draft?.worktree ?? directory, session?.projectID, ctx?.sync.data.project ?? [])
        const root = project?.worktree ?? draft?.worktree ?? directory
        const label = root
          ? displayName({ name: project?.name, worktree: root })
          : language.t("session.tab.group.unassigned")
        const server = conn && global.servers.list().length > 1 ? serverName(conn) : undefined
        return [
          tabKey(tab),
          {
            key: JSON.stringify([tab.server, root ? pathKey(root) : null]),
            label: server ? `${label} · ${server}` : label,
            title: [label, root, server].filter(Boolean).join(" · "),
            name: label,
            src: getProjectAvatarSource(project?.id, project?.icon),
            variant: getProjectAvatarVariant(project?.icon?.color),
          },
        ] as const
      }),
    )
  })
  const key = (tab: Tab) => groups().get(tabKey(tab))?.key ?? JSON.stringify([tab.server, null])
  const ordered = createMemo(() => (enabled() ? groupTabs(input.tabs(), key) : input.tabs()))
  const counts = createMemo(() => {
    const result = new Map<string, number>()
    if (!enabled()) return result
    for (const tab of input.tabs()) {
      const group = key(tab)
      result.set(group, (result.get(group) ?? 0) + 1)
    }
    return result
  })
  const collapsed = (tab: Tab) => enabled() && settings.appearance.tabGroupCollapsed(key(tab))
  const selection = createMemo(() => {
    const tab = input.current()
    if (!enabled() || !settings.ready() || !tab) return
    return JSON.stringify([tabKey(tab), key(tab)])
  })

  // Reveal the selected session after navigation (including restored or newly resolved tabs).
  // Collapse writes are deliberately outside this dependency, so users can fold the active group.
  createEffect(
    on(selection, (selected) => {
      const tab = input.current()
      if (selected && tab) settings.appearance.setTabGroupCollapsed(key(tab), false)
    }),
  )

  return {
    enabled,
    key,
    ordered,
    collapsed,
    index(tab: Tab, visible: readonly Tab[]) {
      return enabled()
        ? visible.filter((item) => key(item) === key(tab)).findIndex((item) => tabKey(item) === tabKey(tab))
        : undefined
    },
    heading(tab: Tab, visible: Accessor<readonly Tab[]>) {
      return (
        <Show when={enabled() && visible().find((item) => key(item) === key(tab)) === tab}>
          <div
            data-slot="tab-project-group"
            data-active={!!input.current() && key(input.current()!) === key(tab)}
            data-collapsed={collapsed(tab)}
            role="heading"
            aria-level={3}
          >
            <button
              type="button"
              data-slot="tab-project-group-toggle"
              aria-expanded={!collapsed(tab)}
              aria-label={groups().get(tabKey(tab))?.title}
              title={groups().get(tabKey(tab))?.title}
              disabled={!settings.ready()}
              onClick={() => settings.appearance.setTabGroupCollapsed(key(tab), !collapsed(tab))}
            >
              <ProjectAvatar
                fallback={groups().get(tabKey(tab))?.name ?? ""}
                src={groups().get(tabKey(tab))?.src}
                variant={groups().get(tabKey(tab))?.variant}
                aria-hidden="true"
              />
              <span data-slot="tab-project-group-title">{groups().get(tabKey(tab))?.label}</span>
              <span data-slot="tab-project-group-count" aria-hidden="true">
                {counts().get(key(tab))}
              </span>
              <span data-slot="tab-project-group-chevron" aria-hidden="true">
                <Icon name="chevron-down" size="small" />
              </span>
            </button>
          </div>
        </Show>
      )
    },
  }
}

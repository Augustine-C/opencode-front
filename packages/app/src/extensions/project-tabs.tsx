import { createMemo, Show, type Accessor } from "solid-js"
import { ProjectAvatar, type ProjectAvatarStyle } from "@opencode/ui/project-avatar"
import { useSettings } from "@/settings/model"
import { useGlobal } from "@/runtime/server/runtime"
import { ServerConnection, serverName } from "@/runtime/server/registry"
import { tabKey, useTabs, type Tab } from "@/shell/tabs/tabs"
import { useLanguage } from "@/runtime/i18n/language"
import { getProjectAvatarVariant } from "@/shell/state/layout"
import { displayName, getProjectAvatarSource } from "@/shell/layout/helpers"
import { pathKey } from "@/workspaces/path-key"
import { groupTabs, tabProject } from "./project-tab-model"
import "./project-tabs.css"

export function useProjectTabGroups(input: {
  tabs: Accessor<Tab[]>
  current: Accessor<Tab | undefined>
  vertical: Accessor<boolean>
}) {
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
  return {
    enabled,
    key,
    ordered,
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
            title={groups().get(tabKey(tab))?.title}
            aria-label={groups().get(tabKey(tab))?.title}
            role={input.vertical() ? "heading" : "img"}
            aria-level={input.vertical() ? 3 : undefined}
          >
            <Show
              when={input.vertical()}
              fallback={
                <ProjectAvatar
                  fallback={groups().get(tabKey(tab))?.name ?? ""}
                  src={groups().get(tabKey(tab))?.src}
                  variant={groups().get(tabKey(tab))?.variant}
                  aria-hidden="true"
                />
              }
            >
              <span>{groups().get(tabKey(tab))?.label}</span>
            </Show>
          </div>
        </Show>
      )
    },
  }
}

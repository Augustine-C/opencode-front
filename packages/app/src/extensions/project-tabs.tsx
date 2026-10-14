import { createEffect, createMemo, on, onCleanup, Show, type Accessor } from "solid-js"
import { createStore } from "solid-js/store"
import type { ProjectAvatarStyle } from "@opencode/ui/project-avatar"
import { useSettings } from "@/settings/model"
import { useGlobal } from "@/runtime/server/runtime"
import { ServerConnection, serverName } from "@/runtime/server/registry"
import { tabKey, useTabs, type Tab } from "@/shell/tabs/tabs"
import { useLanguage } from "@/runtime/i18n/language"
import { displayName, getProjectAvatarSource, getProjectAvatarVariant } from "@opencode/ui/project-avatar"
import { pathKey } from "@/workspaces/path-key"
import { groupInstanceTabs, moveTabGroup, orderedGroupKeys, tabProject } from "./project-tab-model"
import { TabGroupHeading } from "./tab-group-heading"
import "./project-tabs.css"

type Group = { kind: "instance" | "project"; key: string; instance: string }
type ProjectGroup = { key: string; label: string; title: string; src?: string; variant?: ProjectAvatarStyle }

export function useProjectTabGroups(input: { tabs: Accessor<Tab[]>; current: Accessor<Tab | undefined> }) {
  const settings = useSettings()
  const global = useGlobal()
  const tabs = useTabs()
  const language = useLanguage()
  const enabled = () => settings.appearance.groupTabsByProject()
  const instanceKey = (tab: Tab) => JSON.stringify([tab.server])
  const connections = createMemo(
    () => new Map(global.servers.list().map((conn) => [JSON.stringify([ServerConnection.key(conn)]), conn])),
  )
  const groups = createMemo(() => {
    if (!enabled()) return new Map<string, ProjectGroup>()
    return new Map(
      input.tabs().map((tab) => {
        const conn = connections().get(instanceKey(tab))
        const ctx = conn ? global.ensureServerCtx(conn) : undefined
        const session = tab.type === "session" ? ctx?.data.session.get(tab.sessionId) : undefined
        const draft = tab.type === "draft" ? tab : tabs.pendingSession(tab.server, tab.sessionId)?.draft
        const directory = session?.location.directory ?? draft?.directory ?? tabs.info[tabKey(tab)]?.directory
        const project = tabProject(draft?.worktree ?? directory, session?.projectID, ctx?.sync.data.project ?? [])
        const root = project?.worktree ?? draft?.worktree ?? directory
        const label = root
          ? displayName({ name: project?.name, worktree: root })
          : language.t("session.tab.group.unassigned")
        return [
          tabKey(tab),
          {
            key: JSON.stringify([tab.server, root ? pathKey(root) : null]),
            label,
            title: [label, root, conn ? serverName(conn) : undefined].filter(Boolean).join(" · "),
            src: getProjectAvatarSource(project?.id, project?.icon),
            variant: getProjectAvatarVariant(project?.icon?.color),
          },
        ] as const
      }),
    )
  })
  const key = (tab: Tab) => groups().get(tabKey(tab))?.key ?? JSON.stringify([tab.server, null])
  const instanceOrder = () => [...settings.appearance.tabInstanceOrder(), ...connections().keys()]
  const projectOrder = (instance: string) => {
    const conn = connections().get(instance)
    const projects = conn ? global.ensureServerCtx(conn).sync.data.project : []
    return [
      ...settings.appearance.tabProjectOrder(instance),
      ...projects.map((project) => JSON.stringify([conn && ServerConnection.key(conn), pathKey(project.worktree)])),
    ]
  }
  const ordered = createMemo(() =>
    enabled()
      ? groupInstanceTabs(input.tabs(), {
          instance: instanceKey,
          project: key,
          instances: instanceOrder(),
          projects: projectOrder,
        })
      : input.tabs(),
  )
  const counts = createMemo(() => {
    const result = new Map<string, number>()
    if (!enabled()) return result
    for (const tab of input.tabs()) {
      for (const group of [instanceKey(tab), key(tab)]) result.set(group, (result.get(group) ?? 0) + 1)
    }
    return result
  })
  const instanceCollapsed = (tab: Tab) => settings.appearance.tabGroupCollapsed(instanceKey(tab))
  const collapsed = (tab: Tab) =>
    enabled() && (instanceCollapsed(tab) || settings.appearance.tabGroupCollapsed(key(tab)))
  const selection = createMemo(() => {
    const tab = input.current()
    if (!enabled() || !settings.ready() || !tab) return
    return JSON.stringify([tabKey(tab), key(tab)])
  })

  // Reveal the selected session after navigation, without undoing the user's own collapse action.
  createEffect(
    on(selection, (selected) => {
      const tab = input.current()
      if (!selected || !tab) return
      settings.appearance.setTabGroupCollapsed(instanceKey(tab), false)
      settings.appearance.setTabGroupCollapsed(key(tab), false)
    }),
  )

  const [state, setState] = createStore({
    drag: undefined as Group | undefined,
    target: "",
    announcement: "",
    announcedKey: "",
  })
  let focusFrame: number | undefined
  onCleanup(() => {
    if (focusFrame !== undefined) cancelAnimationFrame(focusFrame)
  })
  const siblings = (group: Group, visible: readonly Tab[]) =>
    group.kind === "instance"
      ? orderedGroupKeys(visible.map(instanceKey), instanceOrder())
      : orderedGroupKeys(
          visible.filter((tab) => instanceKey(tab) === group.instance).map(key),
          projectOrder(group.instance),
        )
  const canDrop = (group: Group) =>
    settings.ready() &&
    state.drag?.kind === group.kind &&
    state.drag.key !== group.key &&
    (group.kind === "instance" || state.drag.instance === group.instance)
  const clearDrag = () => setState({ drag: undefined, target: "" })
  createEffect(on(enabled, clearDrag, { defer: true }))

  function move(group: Group, target: string, visible: readonly Tab[], scope?: HTMLElement) {
    if (!settings.ready()) return
    const available = siblings(group, visible)
    if (!available.includes(group.key) || !available.includes(target) || group.key === target) return
    const stored = group.kind === "instance" ? instanceOrder() : projectOrder(group.instance)
    const next = moveTabGroup(stored, available, group.key, target)
    if (group.kind === "instance") settings.appearance.setTabInstanceOrder(next)
    else settings.appearance.setTabProjectOrder(group.instance, next)
    setState({
      announcedKey: group.key,
      announcement: language.t("session.tab.group.orderChanged", {
        name:
          group.kind === "instance"
            ? instanceLabel(group.instance)
            : ([...groups().values()].find((project) => project.key === group.key)?.label ??
              language.t("session.tab.group.unassigned")),
        position: orderedGroupKeys(available, next).indexOf(group.key) + 1,
        count: available.length,
      }),
    })
    focus(group.key, scope)
  }
  function focus(key: string, scope?: HTMLElement) {
    if (!scope) return
    if (focusFrame !== undefined) cancelAnimationFrame(focusFrame)
    // Instance headings can transfer to a different project's first tab after reordering.
    focusFrame = requestAnimationFrame(() => {
      focusFrame = undefined
      const heading = [...scope.querySelectorAll<HTMLElement>("[data-tab-group-key]")].find(
        (element) => element.dataset.tabGroupKey === key,
      )
      heading?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true })
    })
  }
  function instanceLabel(instance: string) {
    const conn = connections().get(instance)
    return conn ? serverName(conn) : language.t("session.tab.group.unknownInstance")
  }
  function heading(group: Group, tab: Tab, visible: Accessor<readonly Tab[]>) {
    const project = () => groups().get(tabKey(tab))
    const label = () => (group.kind === "instance" ? instanceLabel(group.instance) : (project()?.label ?? ""))
    const neighbor = (offset: -1 | 1) => {
      const available = siblings(group, visible())
      return available[available.indexOf(group.key) + offset]
    }
    return (
      <TabGroupHeading
        kind={group.kind}
        groupKey={group.key}
        label={label()}
        title={group.kind === "instance" ? label() : (project()?.title ?? "")}
        src={group.kind === "project" ? project()?.src : undefined}
        variant={group.kind === "project" ? project()?.variant : undefined}
        count={counts().get(group.key) ?? 0}
        active={
          !!input.current() &&
          (group.kind === "instance" ? instanceKey(input.current()!) : key(input.current()!)) === group.key
        }
        collapsed={settings.appearance.tabGroupCollapsed(group.key)}
        ready={settings.ready()}
        dropTarget={state.target === group.key}
        announcement={state.announcedKey === group.key ? state.announcement : ""}
        canMove={(offset) => settings.ready() && neighbor(offset) !== undefined}
        move={(offset, scope) => {
          const target = neighbor(offset)
          if (target !== undefined) move(group, target, visible(), scope)
        }}
        focus={(scope) => focus(group.key, scope)}
        toggle={() =>
          settings.appearance.setTabGroupCollapsed(group.key, !settings.appearance.tabGroupCollapsed(group.key))
        }
        drag={{
          start(event) {
            if (!settings.ready() || !event.dataTransfer) return event.preventDefault()
            event.stopPropagation()
            event.dataTransfer.effectAllowed = "move"
            event.dataTransfer.setData("application/x-opencode-tab-group", "group")
            setState("drag", group)
          },
          over(event) {
            if (!canDrop(group)) return
            event.preventDefault()
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move"
            setState("target", group.key)
          },
          leave(event) {
            if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return
            if (state.target === group.key) setState("target", "")
          },
          drop(event) {
            if (!canDrop(group) || !state.drag) return
            event.preventDefault()
            event.stopPropagation()
            move(state.drag, group.key, visible())
            clearDrag()
          },
          end: clearDrag,
        }}
      />
    )
  }
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
        <>
          <Show when={enabled() && visible().find((item) => instanceKey(item) === instanceKey(tab)) === tab}>
            {heading({ kind: "instance", key: instanceKey(tab), instance: instanceKey(tab) }, tab, visible)}
          </Show>
          <Show when={enabled() && !instanceCollapsed(tab) && visible().find((item) => key(item) === key(tab)) === tab}>
            {heading({ kind: "project", key: key(tab), instance: instanceKey(tab) }, tab, visible)}
          </Show>
        </>
      )
    },
  }
}

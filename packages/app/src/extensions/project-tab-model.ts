import { pathKey } from "../workspaces/path-key"

export type TabProject = {
  id?: string
  name?: string
  icon?: { color?: string; url?: string; override?: string }
  worktree: string
  sandboxes?: readonly string[]
  worktrees?: readonly { directory: string }[]
}

// Resolve cached and draft directories without fetching session transcripts.
export function tabProject(
  directory: string | undefined,
  projectID: string | undefined,
  projects: readonly TabProject[],
) {
  if (projectID && projectID !== "global") {
    const project = projects.find((item) => item.id === projectID)
    if (project) return project
  }
  if (!directory) return
  const key = pathKey(directory)
  return projects
    .filter((project) =>
      [project.worktree, ...(project.sandboxes ?? []), ...(project.worktrees ?? []).map((item) => item.directory)].some(
        (root) => {
          const base = pathKey(root)
          return base === key || (base !== "/" && key.startsWith(`${base.replace(/\/$/, "")}/`))
        },
      ),
    )
    .sort((a, b) => b.worktree.length - a.worktree.length)[0]
}

export function orderedGroupKeys(keys: readonly string[], preferred: readonly string[] = []) {
  const available = new Set(keys)
  return [...new Set([...preferred.filter((key) => available.has(key)), ...keys])]
}

export function groupTabs<T>(tabs: readonly T[], key: (tab: T) => string, order: readonly string[] = []): T[] {
  const groups = new Map<string, T[]>()
  for (const tab of tabs) {
    const project = key(tab)
    const group = groups.get(project)
    if (group) group.push(tab)
    else groups.set(project, [tab])
  }
  return orderedGroupKeys([...groups.keys()], order).flatMap((key) => groups.get(key) ?? [])
}

export function groupInstanceTabs<T>(
  tabs: readonly T[],
  input: {
    instance: (tab: T) => string
    project: (tab: T) => string
    instances: readonly string[]
    projects: (instance: string) => readonly string[]
  },
) {
  const instances = new Map<string, T[]>()
  for (const tab of tabs) {
    const key = input.instance(tab)
    const items = instances.get(key)
    if (items) items.push(tab)
    else instances.set(key, [tab])
  }
  return orderedGroupKeys([...instances.keys()], input.instances).flatMap((instance) =>
    groupTabs(instances.get(instance) ?? [], input.project, input.projects(instance)),
  )
}

// Keep temporarily closed groups in the preference, so reopening them restores their position.
export function moveTabGroup(
  stored: readonly string[],
  visible: readonly string[],
  source: string,
  target: string,
  placement?: "before" | "after",
) {
  const from = visible.indexOf(source)
  const to = visible.indexOf(target)
  if (from < 0 || to < 0 || from === to) return [...stored]
  const moved = [...visible]
  moved.splice(from, 1)
  moved.splice(placement ? moved.indexOf(target) + (placement === "after" ? 1 : 0) : to, 0, source)
  const available = new Set(visible)
  let index = 0
  return [...new Set([...stored, ...visible])].map((key) => (available.has(key) ? moved[index++] : key))
}

export type TabGroupStatus = "attention" | "offline" | "running" | "unread"

export function aggregateTabGroupStatus(entries: readonly { groups: readonly string[]; status?: TabGroupStatus }[]) {
  const priority: Record<TabGroupStatus, number> = { attention: 0, offline: 1, running: 2, unread: 3 }
  const result = new Map<string, TabGroupStatus>()
  for (const entry of entries) {
    if (!entry.status) continue
    for (const key of entry.groups) {
      const previous = result.get(key)
      if (!previous || priority[entry.status] < priority[previous]) result.set(key, entry.status)
    }
  }
  return result
}

export function indexTabGroups<T>(
  tabs: readonly T[],
  input: { id: (tab: T) => string; instance: (tab: T) => string; project: (tab: T) => string },
) {
  const instanceFirst = new Map<string, string>()
  const projectFirst = new Map<string, string>()
  const position = new Map<string, number>()
  const groupIndex = new Map<string, number>()
  const sizes = new Map<string, number>()
  tabs.forEach((tab, index) => {
    const id = input.id(tab)
    const instance = input.instance(tab)
    const project = input.project(tab)
    if (!instanceFirst.has(instance)) instanceFirst.set(instance, id)
    if (!projectFirst.has(project)) projectFirst.set(project, id)
    const offset = sizes.get(project) ?? 0
    groupIndex.set(id, offset)
    sizes.set(project, offset + 1)
    position.set(id, index)
  })
  return { instanceFirst, projectFirst, position, groupIndex }
}

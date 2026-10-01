import { pathKey } from "../../workspaces/path-key"

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

export function groupTabs<T>(tabs: readonly T[], key: (tab: T) => string): T[] {
  const groups = new Map<string, T[]>()
  for (const tab of tabs) {
    const project = key(tab)
    const group = groups.get(project)
    if (group) group.push(tab)
    else groups.set(project, [tab])
  }
  return [...groups.values()].flat()
}

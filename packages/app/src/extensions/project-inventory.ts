import { batch } from "solid-js"
import type { SetStoreFunction, Store } from "solid-js/store"
import { pathKey } from "../workspaces/path-key"
import type { ServerScope } from "../runtime/server/scope"
import type { serverState } from "../runtime/server/persistence"

type ServerState = ReturnType<typeof serverState>["current"]["Type"]

export function createServerProjects(input: {
  scope: () => ServerScope
  store: Store<ServerState>
  setStore: SetStoreFunction<ServerState>
}) {
  const setStore = input.setStore
  const current = () => input.store.projects[input.scope()] ?? []
  const currentClosed = () => input.store.recentlyClosed?.[input.scope()] ?? []
  const remove = (directory: string) => {
    setStore(
      "projects",
      input.scope(),
      current().filter((project) => project.worktree !== directory),
    )
  }
  return {
    list: current,
    closed: currentClosed,
    recentlyClosed: currentClosed,
    remove,
    discover(directories: readonly string[]) {
      const existing = current()
      const excluded = new Set([
        ...existing.map((project) => pathKey(project.worktree)),
        ...currentClosed().map(pathKey),
      ])
      const discovered: { worktree: string; expanded: boolean }[] = []
      for (const directory of directories) {
        const key = pathKey(directory)
        if (!key || excluded.has(key)) continue
        excluded.add(key)
        discovered.push({ worktree: directory, expanded: true })
      }
      if (discovered.length) setStore("projects", input.scope(), [...existing, ...discovered])
    },
    open(directory: string) {
      const scope = input.scope()
      const key = pathKey(directory)
      const closed = currentClosed()
      if (closed.some((worktree) => pathKey(worktree) === key)) {
        setStore(
          "recentlyClosed",
          scope,
          closed.filter((worktree) => pathKey(worktree) !== key),
        )
      }
      if (current().some((project) => pathKey(project.worktree) === key)) return
      setStore("projects", scope, [{ worktree: directory, expanded: true }, ...current()])
    },
    // User-initiated close: removes the project and records it in recently closed.
    // Internal, non-user removals (e.g. sandbox/worktree normalization) should use remove().
    close(directory: string) {
      batch(() => {
        remove(directory)
        const key = pathKey(directory)
        const closed = [directory, ...currentClosed().filter((worktree) => pathKey(worktree) !== key)]
        setStore("recentlyClosed", input.scope(), closed)
      })
    },
    expand(directory: string) {
      const index = current().findIndex((project) => project.worktree === directory)
      if (index !== -1) setStore("projects", input.scope(), index, "expanded", true)
    },
    collapse(directory: string) {
      const index = current().findIndex((project) => project.worktree === directory)
      if (index !== -1) setStore("projects", input.scope(), index, "expanded", false)
    },
    move(directory: string, toIndex: number) {
      const fromIndex = current().findIndex((project) => project.worktree === directory)
      if (fromIndex === -1 || fromIndex === toIndex) return
      const next = [...current()]
      const [item] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, item)
      setStore("projects", input.scope(), next)
    },
    last() {
      return input.store.lastProject[input.scope()]
    },
    touch(directory: string) {
      setStore("lastProject", input.scope(), directory)
    },
  }
}

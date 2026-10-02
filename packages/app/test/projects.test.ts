import { describe, expect, test } from "bun:test"
import { createComputed, createRoot } from "solid-js"
import { createStore } from "solid-js/store"
import { createServerProjects } from "../src/extensions/project-inventory"
import { ServerScope } from "../src/runtime/server/scope"
import type { serverState } from "../src/runtime/server/persistence"

type ServerState = ReturnType<typeof serverState>["current"]["Type"]

function fixture() {
  const [store, setStore] = createStore<ServerState>({
    list: [],
    hidden: {},
    projects: {},
    recentlyClosed: {},
    lastProject: {},
  })
  const local = createServerProjects({ scope: () => ServerScope.local, store, setStore })
  const remote = createServerProjects({ scope: () => "remote" as ServerScope, store, setStore })
  return { store, setStore, local, remote }
}

describe("server project discovery", () => {
  test("shows the initial inventory without opening a session or selecting a project", () => {
    const { local } = fixture()
    local.discover(["/work/one", "/work/two"])
    expect(local.list().map((project) => project.worktree)).toEqual(["/work/one", "/work/two"])
    expect(local.last()).toBeUndefined()
  })

  test("preserves saved order and expansion and appends new inventory entries", () => {
    const { local } = fixture()
    local.open("/work/one")
    local.open("/work/two")
    local.collapse("/work/two")
    local.discover(["/work/one/", "/work/two", "/work/three", "/work/three/", ""])
    expect(local.list()).toEqual([
      { worktree: "/work/two", expanded: false },
      { worktree: "/work/one", expanded: true },
      { worktree: "/work/three", expanded: true },
    ])
    const previous = local.list()
    local.discover(["/work/three", "/work/one", "/work/two"])
    expect(local.list()).toBe(previous)
    local.move("/work/three", 0)
    expect(local.list()[0].worktree).toBe("/work/three")
  })

  test("reactive inventory updates do not reopen closed projects", () => {
    createRoot((dispose) => {
      const { local } = fixture()
      const [inventory, setInventory] = createStore({ directories: ["/work/one", "/work/two"] })
      createComputed(() => local.discover(inventory.directories))
      local.close("/work/one")
      setInventory("directories", ["/work/one", "/work/two", "/work/three"])
      expect(local.list().map((project) => project.worktree)).toEqual(["/work/two", "/work/three"])
      expect(local.recentlyClosed()).toEqual(["/work/one"])
      local.open("/work/one/")
      expect(local.recentlyClosed()).toEqual([])
      expect(local.list()).toHaveLength(3)
      dispose()
    })
  })

  test("respects closed projects restored from storage, including older entries", () => {
    const { local, setStore } = fixture()
    const closed = Array.from({ length: 8 }, (_, index) => `/work/closed-${index}`)
    setStore("recentlyClosed", "local", closed)
    local.discover([...closed, "/work/new"])
    expect(local.list()).toEqual([{ worktree: "/work/new", expanded: true }])
    expect(local.recentlyClosed()).toEqual(closed)
  })

  test("keeps local and remote inventory and closed preferences independent", () => {
    const { local, remote } = fixture()
    local.discover(["/work/shared"])
    local.close("/work/shared")
    remote.discover(["/work/shared", "/work/remote"])
    local.discover(["/work/shared", "/work/local"])
    expect(local.list().map((project) => project.worktree)).toEqual(["/work/local"])
    expect(remote.list().map((project) => project.worktree)).toEqual(["/work/shared", "/work/remote"])
  })
})

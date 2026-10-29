import { expect, test } from "bun:test"
import { createStore } from "solid-js/store"
import { createServerProjects } from "../src/runtime/server/registry"
import { ServerScope } from "../src/runtime/server/scope"
import type { ServerState } from "../src/runtime/server/persistence"

test("official project identity migration preserves other servers and tracks hidden and reused projects", () => {
  const [store, setStore] = createStore<typeof ServerState.Type>({
    list: [], hidden: {}, lastProjectID: {}, usedProjectIDs: {}, hostnames: {},
    projects: { local: [{ worktree: "/work/one" }], remote: [{ worktree: "/work/remote" }] },
  })
  const local = createServerProjects({ scope: () => ServerScope.local, store, setStore })
  const remote = createServerProjects({ scope: () => "remote" as ServerScope, store, setStore })
  expect(local.legacy()).toEqual(["/work/one"])
  local.migrate(["one"])
  expect(local.legacy()).toBeUndefined()
  expect(local.used()).toEqual(["one"])
  expect(remote.legacy()).toEqual(["/work/remote"])
  local.touch("two")
  local.touch("two")
  expect(local.used()).toEqual(["one", "two"])
  expect(local.last()).toBe("two")
  local.hide(["one"])
  expect(local.used()).toEqual(["two"])
  local.touch("one")
  expect(local.used()).toEqual(["two", "one"])
  expect(remote.used()).toEqual([])
})

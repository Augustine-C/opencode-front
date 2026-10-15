import { describe, expect, test } from "bun:test"
import {
  aggregateTabGroupStatus,
  groupInstanceTabs,
  indexTabGroups,
  groupTabs,
  moveTabGroup,
  orderedGroupKeys,
  tabProject,
} from "../src/extensions/project-tab-model"
import { adjacentTabKey, mergeVisibleTabOrder } from "../src/shell/titlebar/tab-order"

const projects = [
  { id: "global", worktree: "/" },
  { id: "one", name: "One", worktree: "/code/one", worktrees: [{ directory: "/branches/one-feature" }] },
  { id: "nested", worktree: "/code/one/nested" },
  { id: "two", worktree: "/code/two", sandboxes: ["/branches/two-feature"] },
]

describe("project tab groups", () => {
  test("one-pass group indexes preserve visible ordering, positions and independent instance boundaries", () => {
    const tabs = [
      { id: "a1", server: "local", project: "a" },
      { id: "a2", server: "local", project: "a" },
      { id: "b1", server: "local", project: "b" },
      { id: "remote-a", server: "remote", project: "a" },
    ]
    const index = (items: typeof tabs) =>
      indexTabGroups(items, {
        id: (tab) => tab.id,
        instance: (tab) => tab.server,
        project: (tab) => `${tab.server}/${tab.project}`,
      })
    expect([...index(tabs).instanceFirst]).toEqual([
      ["local", "a1"],
      ["remote", "remote-a"],
    ])
    expect([...index(tabs).projectFirst]).toEqual([
      ["local/a", "a1"],
      ["local/b", "b1"],
      ["remote/a", "remote-a"],
    ])
    expect([...index(tabs).groupIndex]).toEqual([
      ["a1", 0],
      ["a2", 1],
      ["b1", 0],
      ["remote-a", 0],
    ])
    expect([...index([tabs[1], tabs[3]]).position]).toEqual([
      ["a2", 0],
      ["remote-a", 1],
    ])
    expect(index([tabs[1], tabs[3]]).projectFirst.get("local/a")).toBe("a2")
    expect(index([]).position.size).toBe(0)
  })
  test("folded status prioritizes action over connection, running and unread within its own instance", () => {
    const entries = [
      { groups: ["local", "local/project"], status: "unread" as const },
      { groups: ["local", "local/project"], status: "running" as const },
      { groups: ["local", "local/project"], status: "offline" as const },
      { groups: ["local", "local/project"], status: "attention" as const },
      { groups: ["remote", "remote/project"], status: "unread" as const },
    ]
    expect([...aggregateTabGroupStatus(entries)]).toEqual([
      ["local", "attention"],
      ["local/project", "attention"],
      ["remote", "unread"],
      ["remote/project", "unread"],
    ])
    expect(aggregateTabGroupStatus(entries.slice(0, 3)).get("local")).toBe("offline")
    expect(aggregateTabGroupStatus(entries.slice(0, 2)).get("local")).toBe("running")
    expect(aggregateTabGroupStatus([]).size).toBe(0)
  })
  test("keeps each instance contiguous and honors independent instance and project preferences", () => {
    const input = [
      { id: "local-a1", server: "local", project: "a" },
      { id: "remote-a1", server: "remote", project: "a" },
      { id: "local-b", server: "local", project: "b" },
      { id: "remote-b", server: "remote", project: "b" },
      { id: "local-a2", server: "local", project: "a" },
    ]
    const ordered = (instances: string[], projects: (instance: string) => string[]) =>
      groupInstanceTabs(input, {
        instance: (tab) => tab.server,
        project: (tab) => tab.project,
        instances,
        projects,
      })
    expect(ordered([], () => []).map((tab) => tab.id)).toEqual([
      "local-a1",
      "local-a2",
      "local-b",
      "remote-a1",
      "remote-b",
    ])
    const result = ordered(["remote", "local"], (server) => (server === "local" ? ["b", "a"] : ["a", "b"]))
    expect(result.map((tab) => tab.id)).toEqual(["remote-a1", "remote-b", "local-b", "local-a1", "local-a2"])
    expect(result[0]).toBe(input[1])
    expect(input.map((tab) => tab.id)).toEqual(["local-a1", "remote-a1", "local-b", "remote-b", "local-a2"])
  })

  test("retains temporarily closed group positions when moving visible groups", () => {
    const stored = ["a", "closed", "b", "c"]
    const moved = moveTabGroup(stored, ["a", "b", "c"], "c", "a")
    expect(moved).toEqual(["c", "closed", "a", "b"])
    expect(orderedGroupKeys(["a", "b", "c", "closed", "new"], moved)).toEqual(["c", "closed", "a", "b", "new"])
    expect(moveTabGroup(stored, ["a", "b"], "a", "outside")).toEqual(stored)
    expect(moveTabGroup(stored, ["a", "b"], "outside", "b")).toEqual(stored)
    expect(moveTabGroup(stored, ["a", "b", "c"], "c", "a", "after")).toEqual(["a", "closed", "c", "b"])
    expect(moveTabGroup(stored, ["a", "b", "c"], "a", "c", "before")).toEqual(["b", "closed", "a", "c"])
    expect(moveTabGroup(stored, ["a", "b", "c"], "a", "b", "before")).toEqual(stored)
    expect(stored).toEqual(["a", "closed", "b", "c"])
  })

  test("ignores stale and duplicate preferences and appends newly opened groups once", () => {
    expect(orderedGroupKeys(["a", "b", "a", "new"], ["missing", "b", "b"])).toEqual(["b", "a", "new"])
  })

  test("groups interleaved tabs with stable project and session order", () => {
    const input = [
      { id: "a1", server: "local", project: "a" },
      { id: "b1", server: "local", project: "b" },
      { id: "a2", server: "local", project: "a" },
      { id: "remote-a", server: "remote", project: "a" },
      { id: "b2", server: "local", project: "b" },
    ]
    const result = groupTabs(input, (tab) => JSON.stringify([tab.server, tab.project]))
    expect(result.map((tab) => tab.id)).toEqual(["a1", "a2", "b1", "b2", "remote-a"])
    expect(input.map((tab) => tab.id)).toEqual(["a1", "b1", "a2", "remote-a", "b2"])
    expect(result[0]).toBe(input[0])
    expect(
      adjacentTabKey(
        result.map((tab) => tab.id),
        "a2",
        1,
      ),
    ).toBe("b1")
  })

  test("drafts and restored tabs resolve subdirectories and worktrees to a project", () => {
    expect(tabProject("/code/one/src/", undefined, projects)?.id).toBe("one")
    expect(tabProject("/branches/one-feature/src", undefined, projects)?.id).toBe("one")
    expect(tabProject("/branches/two-feature", undefined, projects)?.id).toBe("two")
    expect(tabProject("/code/one/nested/src", undefined, projects)?.id).toBe("nested")
    expect(tabProject("/code/one-other", undefined, projects)).toBeUndefined()
  })

  test("session project identity overrides directory fallback without merging global directories", () => {
    expect(tabProject("/new/worktree", "one", projects)?.id).toBe("one")
    expect(tabProject("/code/two", "global", projects)?.id).toBe("two")
    expect(tabProject("/other", "global", projects)).toBeUndefined()
    expect(tabProject(undefined, undefined, projects)).toBeUndefined()
  })

  test("Windows worktrees and trailing separators share the canonical project", () => {
    const windows = [{ id: "windows", worktree: "C:\\code\\project\\" }]
    expect(tabProject("C:/code/project/src", undefined, windows)?.id).toBe("windows")
    expect(tabProject("C:/code/project-other", undefined, windows)).toBeUndefined()
  })

  test("within-project reordering preserves hidden tabs and the other project", () => {
    const stored = ["a1", "hidden", "b1", "a2", "b2"]
    const visible = ["a1", "a2", "b1", "b2"]
    const reordered = mergeVisibleTabOrder(visible, ["a1", "a2"], ["a2", "a1"])
    const next = mergeVisibleTabOrder(stored, visible, reordered)
    expect(next).toEqual(["a2", "hidden", "a1", "b1", "b2"])
    expect(
      groupTabs(
        next.filter((id) => id !== "hidden"),
        (id) => id[0],
      ),
    ).toEqual(["a2", "a1", "b1", "b2"])
  })
})

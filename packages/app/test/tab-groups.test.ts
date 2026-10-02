import { describe, expect, test } from "bun:test"
import { groupTabs, tabProject } from "../src/extensions/project-tab-model"
import { adjacentTabKey, mergeVisibleTabOrder } from "../src/shell/titlebar/tab-order"

const projects = [
  { id: "global", worktree: "/" },
  { id: "one", name: "One", worktree: "/code/one", worktrees: [{ directory: "/branches/one-feature" }] },
  { id: "nested", worktree: "/code/one/nested" },
  { id: "two", worktree: "/code/two", sandboxes: ["/branches/two-feature"] },
]

describe("project tab groups", () => {
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

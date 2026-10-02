import { expect, test } from "bun:test"
import { auditImports, gitBlob, planImports, selectImports, validateRules, type Rules, type Inventory } from "../model"

const rules: Rules = {
  version: 1,
  imports: [
    {
      source: "packages/app",
      target: "packages/app",
      exclude: ["**/*.test.*", "test/**"],
      keep: ["test/api.types.ts"],
    },
    { source: "packages/plugin-browser", target: "packages/plugin-browser", only: ["package.json", "src/rpc.ts"] },
  ],
  overlays: [
    {
      id: "panels",
      reason: "Native panel mount point",
      files: ["packages/app/src/session.tsx"],
      adapters: ["packages/app/src/extensions/panels.tsx"],
    },
  ],
  local: [{ patterns: ["packages/app/src/extensions/**"], reason: "Independent extension layer" }],
}
const file = (path: string, blob = "base") => ({ path, blob, mode: "100644" })
const inventory: Inventory = {
  commit: "baseline",
  files: selectImports([file("packages/app/src/plain.ts"), file("packages/app/src/session.tsx")], rules),
}

test("import scope retains runtime files and explicit type fixtures while omitting tests and backend implementation", () => {
  expect(
    selectImports(
      [
        file("packages/app/src/session.tsx"),
        file("packages/app/src/session.test.tsx"),
        file("packages/app/test/api.types.ts"),
        file("packages/app/test/fixture.ts"),
        file("packages/app/src/assets/playwright.svg"),
        file("packages/plugin-browser/src/rpc.ts"),
        file("packages/plugin-browser/src/server.ts"),
        file("packages/core/src/server.ts"),
      ],
      rules,
    ).map((item) => item.target),
  ).toEqual([
    "packages/app/src/assets/playwright.svg",
    "packages/app/src/session.tsx",
    "packages/app/test/api.types.ts",
    "packages/plugin-browser/src/rpc.ts",
  ])
})

test("audit permits declared mount points and rejects accidental edits, deleted files, and undeclared local sources", () => {
  const files = new Map([
    ["packages/app/src/plain.ts", "base"],
    ["packages/app/src/session.tsx", "adapted"],
    ["packages/app/src/extensions/panels.tsx", "local"],
  ])
  expect(auditImports({ inventory, rules, files })).toEqual({ pristine: 1, adapted: 1, local: 1, errors: [] })
  files.set("packages/app/src/plain.ts", "accidental change")
  files.set("packages/app/src/unclassified.ts", "local")
  files.delete("packages/app/src/session.tsx")
  files.delete("packages/app/src/extensions/panels.tsx")
  expect(auditImports({ inventory, rules, files }).errors).toEqual([
    "Undeclared upstream modification: packages/app/src/plain.ts",
    "Missing imported file: packages/app/src/session.tsx",
    "Unclassified local file: packages/app/src/unclassified.ts",
    "Missing adapter: packages/app/src/extensions/panels.tsx",
  ])
})

test("upgrade report distinguishes untouched upstream updates from adapter changes and removals", () => {
  expect(
    planImports(
      inventory,
      selectImports([file("packages/app/src/session.tsx", "new"), file("packages/app/src/new.ts", "new")], rules),
      rules,
    ),
  ).toEqual([
    { target: "packages/app/src/new.ts", change: "added", review: "upstream-copy" },
    { target: "packages/app/src/session.tsx", change: "changed", review: "panels" },
    { target: "packages/app/src/plain.ts", change: "removed", review: "upstream-copy" },
  ])
  expect(planImports(inventory, inventory.files, rules)).toEqual([])
})

test("rules reject traversal, overlapping imports, and duplicate overlays", () => {
  expect(() => validateRules({ ...rules, imports: [{ source: "../server", target: "packages/app" }] })).toThrow(
    "Unsafe import path",
  )
  expect(() =>
    selectImports([file("packages/app/src/session.tsx")], { ...rules, imports: [...rules.imports, rules.imports[0]] }),
  ).toThrow("Overlapping import target")
  expect(() => validateRules({ ...rules, overlays: [...rules.overlays, rules.overlays[0]] })).toThrow(
    "Duplicate overlay",
  )
})

test("blob hashing matches Git object identities including binary data", () => {
  expect(gitBlob(new Uint8Array())).toBe("e69de29bb2d1d6434b8b29ae775ad8c2e48c5391")
  const bytes = new Uint8Array([0, 128, 255, 10])
  const expected = Bun.spawnSync(["git", "hash-object", "--stdin"], { stdin: bytes }).stdout.toString().trim()
  expect(gitBlob(bytes)).toBe(expected)
})

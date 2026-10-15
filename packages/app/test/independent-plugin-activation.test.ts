import { expect, test } from "bun:test"
import {
  capturePluginData,
  prepareIndependentActivationData,
  restorePluginData,
  settleIndependentActivation,
  type PluginDataStorage,
} from "../src/plugins/independent/activation"
import type {
  IndependentPluginRepository,
  PluginDataSnapshot,
  PluginInstallationInfo,
} from "../src/plugins/independent/repository"

const id = "example.recovery"
const prefix = `opencode-front.plugin.${id}.`
const key = `${prefix}value`

function storage(initial: Array<[string, string]> = []) {
  const values = new Map(initial)
  const area = {
    get length() {
      return values.size
    },
    key(index: number) {
      return [...values.keys()][index] ?? null
    },
    getItem(name: string) {
      return values.get(name) ?? null
    },
    setItem(name: string, value: string) {
      values.set(name, value)
    },
    removeItem(name: string) {
      values.delete(name)
    },
  } as PluginDataStorage
  return { area, values }
}

function snapshot(digest: string, value: string): PluginDataSnapshot {
  return {
    digest,
    storageVersion: digest === "old" ? 1 : 2,
    values: [[key, value]],
    capturedAt: 1,
  }
}

function activationFixture(
  status: "enabled" | "error",
  beforeRollback?: () => void,
) {
  const record: PluginInstallationInfo = {
    id,
    activeDigest: "new",
    previousDigest: "old",
    activationDataDigest: "old",
    activationPending: true,
    enabled: true,
    updatedAt: 1,
    healthy: true,
  }
  const saved = new Map([
    ["old", snapshot("old", '"before migration"')],
    ["new", snapshot("new", '"after migration"')],
  ])
  const calls: string[] = []
  const repository = {
    async list() {
      return [{ ...record }]
    },
    async dataSnapshot(_id: string, digest: string) {
      return saved.get(digest)
    },
    async markActivationHealthy() {
      calls.push("healthy")
      record.activationPending = false
      return true
    },
    async rollbackActivation(_id: string, detail: string) {
      expect(detail).toContain("saved data were restored")
      beforeRollback?.()
      calls.push("rollback")
      record.activeDigest = "old"
      record.previousDigest = undefined
      record.activationPending = false
      record.failedVersion = "2.0.0"
      return true
    },
  } as unknown as IndependentPluginRepository
  const host = {
    state: { statuses: [{ id, state: status }] },
    async disable() {
      calls.push("disable")
    },
  }
  return { record, repository, host, calls }
}

test("activation restores the selected data snapshot before setup and records success", async () => {
  const { area, values } = storage([
    [key, '"partially migrated"'],
    ["opencode-front.plugin.other.value", '"keep"'],
  ])
  const fixture = activationFixture("enabled")
  expect(
    await prepareIndependentActivationData(fixture.repository, area, id),
  ).toBe(true)
  expect(values.get(key)).toBe('"before migration"')
  expect(values.get("opencode-front.plugin.other.value")).toBe('"keep"')

  expect(
    await settleIndependentActivation({
      repository: fixture.repository,
      storage: area,
      host: fixture.host,
      id,
    }),
  ).toBe("healthy")
  expect(fixture.record.activationPending).toBe(false)
  expect(fixture.calls).toEqual(["healthy"])
})

test("failed setup restores prior namespaced data before rolling back the active package", async () => {
  const { area, values } = storage([
    [key, '"partially migrated"'],
    ["opencode-front.plugin.other.value", '"keep"'],
  ])
  const fixture = activationFixture("error", () => {
    expect(values.get(key)).toBe('"before migration"')
  })
  await prepareIndependentActivationData(fixture.repository, area, id)
  values.set(key, '"migration failed"')

  expect(
    await settleIndependentActivation({
      repository: fixture.repository,
      storage: area,
      host: fixture.host,
      id,
    }),
  ).toBe("rolled-back")
  expect(values.get(key)).toBe('"before migration"')
  expect(values.get("opencode-front.plugin.other.value")).toBe('"keep"')
  expect(fixture.record.activeDigest).toBe("old")
  expect(fixture.record.failedVersion).toBe("2.0.0")
  expect(fixture.calls).toEqual(["disable", "rollback"])
})

test("snapshot validation refuses unsafe restore before clearing existing plugin data", () => {
  const { area, values } = storage([[key, '"keep"']])
  expect(() =>
    restorePluginData(area, id, {
      ...snapshot("old", '"invalid"'),
      values: [["opencode-front.plugin.someone-else.value", '"bad"']],
    }),
  ).toThrow("invalid storage values")
  expect(values.get(key)).toBe('"keep"')

  const captured = capturePluginData(area, id, "old", 1)
  expect(captured.values).toEqual([[key, '"keep"']])
})

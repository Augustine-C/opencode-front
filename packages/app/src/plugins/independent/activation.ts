import { pluginStoragePrefix } from "@opencode/frontend-plugin/storage"
import {
  PLUGIN_DATA_SNAPSHOT_LIMIT,
  type IndependentPluginRepository,
  type PluginDataSnapshot,
} from "./repository"

export type PluginDataStorage = Pick<
  Storage,
  "length" | "key" | "getItem" | "setItem" | "removeItem"
>

type ActivationRepository = Pick<
  IndependentPluginRepository,
  "list" | "dataSnapshot" | "markActivationHealthy" | "rollbackActivation"
>

type ActivationHost = {
  state: { statuses: Array<{ id: string; state: string }> }
  disable(id: string): Promise<unknown>
}

export function capturePluginData(
  storage: PluginDataStorage,
  id: string,
  digest: string,
  storageVersion: number,
): PluginDataSnapshot {
  const prefix = pluginStoragePrefix(id)
  const values: Array<[string, string]> = []
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index)
    if (!key?.startsWith(prefix)) continue
    const value = storage.getItem(key)
    if (value !== null) values.push([key, value])
  }
  const size = new TextEncoder().encode(JSON.stringify(values)).byteLength
  if (size > PLUGIN_DATA_SNAPSHOT_LIMIT)
    throw new Error(
      "Plugin data is too large for a safe update snapshot; export or reduce it before updating",
    )
  return {
    digest,
    storageVersion,
    values,
    capturedAt: Date.now(),
  }
}

export function restorePluginData(
  storage: PluginDataStorage,
  id: string,
  snapshot: PluginDataSnapshot,
) {
  const prefix = pluginStoragePrefix(id)
  if (
    typeof snapshot.digest !== "string" ||
    !Number.isSafeInteger(snapshot.storageVersion) ||
    snapshot.storageVersion < 1 ||
    !Number.isFinite(snapshot.capturedAt) ||
    !Array.isArray(snapshot.values)
  )
    throw new Error("Plugin data snapshot metadata is invalid")
  const keys = new Set<string>()
  for (const entry of snapshot.values) {
    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      typeof entry[0] !== "string" ||
      !entry[0].startsWith(prefix) ||
      typeof entry[1] !== "string" ||
      keys.has(entry[0])
    )
      throw new Error("Plugin data snapshot contains invalid storage values")
    keys.add(entry[0])
  }
  if (
    new TextEncoder().encode(JSON.stringify(snapshot.values)).byteLength >
    PLUGIN_DATA_SNAPSHOT_LIMIT
  )
    throw new Error("Plugin data snapshot exceeds the safe size limit")

  for (let index = storage.length - 1; index >= 0; index--) {
    const key = storage.key(index)
    if (key?.startsWith(prefix)) storage.removeItem(key)
  }
  for (const [key, value] of snapshot.values) storage.setItem(key, value)
}

export async function prepareIndependentActivationData(
  repository: ActivationRepository,
  storage: PluginDataStorage,
  id: string,
) {
  const installation = (await repository.list()).find(
    (entry) => entry.id === id,
  )
  if (!installation?.activationPending) return false
  const snapshot = await repository.dataSnapshot(
    id,
    installation.activationDataDigest ?? installation.activeDigest,
  )
  if (!snapshot)
    throw new Error(
      `Plugin ${id} cannot start safely because its activation data snapshot is missing`,
    )
  restorePluginData(storage, id, snapshot)
  return true
}

export async function settleIndependentActivation(input: {
  repository: ActivationRepository
  storage: PluginDataStorage
  host: ActivationHost
  id: string
  restorePrevious?: boolean
}) {
  const { repository, storage, host, id } = input
  const installation = (await repository.list()).find(
    (entry) => entry.id === id,
  )
  if (!installation?.activationPending) return "none" as const
  const status = host.state.statuses.find((entry) => entry.id === id)
  if (!input.restorePrevious && status?.state === "enabled") {
    await repository.markActivationHealthy(id)
    return "healthy" as const
  }
  if (
    (!input.restorePrevious && status?.state !== "error") ||
    !installation.previousDigest
  )
    return "pending" as const

  const snapshot = await repository.dataSnapshot(
    id,
    installation.previousDigest,
  )
  if (!snapshot)
    throw new Error(
      `Plugin ${id} cannot restore data safely because its previous snapshot is missing`,
    )
  await host.disable(id)
  restorePluginData(storage, id, snapshot)
  await repository.rollbackActivation(
    id,
    input.restorePrevious
      ? "Plugin activation was cancelled; the previous package and saved data were restored"
      : "Plugin setup failed; the previous package and saved data were restored",
  )
  return "rolled-back" as const
}

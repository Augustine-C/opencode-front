import type { IndependentPluginManifest } from "@opencode/frontend-plugin/independent";
import { pluginStoragePrefix } from "@opencode/frontend-plugin/storage";
import {
  developmentPluginPackage,
  inspectPluginPackage,
  pluginContentDigest,
  validatePluginManifest,
  type PluginPackage,
} from "./package";

export const PLUGIN_DATABASE = "opencode-independent-plugins";
export const PLUGIN_DATABASE_VERSION = 1;
const MODULES = "modules";
const INSTALLATIONS = "installations";
const CHANNEL = "opencode-front:independent-plugins:v1";
export const PLUGIN_DATA_SNAPSHOT_LIMIT = 4 * 1024 * 1024;

export type StoredPluginModule = {
  digest: string;
  manifest: IndependentPluginManifest;
  files: Array<{ path: string; bytes: Uint8Array }>;
  compressedBytes: number;
  uncompressedBytes: number;
  installedAt: number;
};

export type PluginDataSnapshot = {
  digest: string;
  storageVersion: number;
  values: Array<[string, string]>;
  capturedAt: number;
};

export type PluginInstallation = {
  id: string;
  activeDigest: string;
  candidateDigest?: string;
  previousDigest?: string;
  enabled: boolean;
  updatedAt: number;
  activationPending?: boolean;
  activationDataDigest?: string;
  storageSnapshots?: PluginDataSnapshot[];
  failedVersion?: string;
  lastFailure?: string;
};

export type PluginInstallationInfo = Omit<
  PluginInstallation,
  "storageSnapshots"
> & {
  name?: string;
  version?: string;
  storageVersion?: number;
  candidateVersion?: string;
  candidateStorageVersion?: number;
  previousVersion?: string;
  previousStorageVersion?: number;
  healthy: boolean;
  problem?: string;
};

export type IndependentPluginRepository = ReturnType<
  typeof createIndependentPluginRepository
>;

function requestValue<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), {
      once: true,
    });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new Error("IndexedDB request failed")),
      {
        once: true,
      },
    );
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () =>
        reject(transaction.error ?? new Error("IndexedDB transaction aborted")),
      {
        once: true,
      },
    );
    transaction.addEventListener(
      "error",
      () =>
        reject(transaction.error ?? new Error("IndexedDB transaction failed")),
      {
        once: true,
      },
    );
  });
}

function openDatabase(factory: IDBFactory, name: string) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    let settled = false;
    const request = factory.open(name, PLUGIN_DATABASE_VERSION);
    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(MODULES))
        database.createObjectStore(MODULES, { keyPath: "digest" });
      if (!database.objectStoreNames.contains(INSTALLATIONS))
        database.createObjectStore(INSTALLATIONS, { keyPath: "id" });
    });
    request.addEventListener(
      "success",
      () => {
        const database = request.result;
        if (settled) {
          database.close();
          return;
        }
        settled = true;
        database.addEventListener("versionchange", () => database.close());
        resolve(database);
      },
      { once: true },
    );
    request.addEventListener(
      "error",
      () => {
        if (settled) return;
        settled = true;
        reject(request.error ?? new Error("Cannot open plugin storage"));
      },
      {
        once: true,
      },
    );
    request.addEventListener(
      "blocked",
      () => {
        if (settled) return;
        settled = true;
        reject(
          new Error("Plugin storage upgrade is blocked by another open window"),
        );
      },
      {
        once: true,
      },
    );
  });
}

function storedModule(
  pkg: PluginPackage,
  installedAt: number,
): StoredPluginModule {
  return {
    digest: pkg.digest,
    manifest: pkg.manifest,
    files: [...pkg.files].map(([path, bytes]) => ({
      path,
      bytes: bytes.slice(),
    })),
    compressedBytes: pkg.compressedBytes,
    uncompressedBytes: pkg.uncompressedBytes,
    installedAt,
  };
}

function filesMap(module: StoredPluginModule) {
  return new Map(module.files.map(({ path, bytes }) => [path, bytes]));
}

async function verifyModule(module: StoredPluginModule, digest: string) {
  if (
    !module ||
    module.digest !== digest ||
    !module.manifest ||
    !Array.isArray(module.files)
  )
    return false;
  try {
    const files = filesMap(module);
    if (files.size !== module.files.length) return false;
    const manifestBytes = files.get("manifest.json");
    if (!manifestBytes || (await pluginContentDigest(files)) !== digest)
      return false;
    const source = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(manifestBytes),
    ) as unknown;
    const manifest = validatePluginManifest(source, new Set(files.keys()));
    return JSON.stringify(manifest) === JSON.stringify(module.manifest);
  } catch {
    return false;
  }
}

function storageFailure(error: unknown) {
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return new Error(
      "Plugin storage is full; the currently installed version was kept",
    );
  }
  return error instanceof Error ? error : new Error(String(error));
}

function validateDataSnapshot(
  id: string,
  digest: string,
  snapshot: PluginDataSnapshot,
) {
  const prefix = pluginStoragePrefix(id);
  if (
    snapshot.digest !== digest ||
    !Number.isSafeInteger(snapshot.storageVersion) ||
    snapshot.storageVersion < 1 ||
    !Number.isFinite(snapshot.capturedAt) ||
    !Array.isArray(snapshot.values)
  )
    throw new Error("Plugin data snapshot metadata is invalid");
  const keys = new Set<string>();
  for (const entry of snapshot.values) {
    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      typeof entry[0] !== "string" ||
      !entry[0].startsWith(prefix) ||
      typeof entry[1] !== "string" ||
      keys.has(entry[0])
    )
      throw new Error("Plugin data snapshot contains invalid storage values");
    keys.add(entry[0]);
  }
  if (
    new TextEncoder().encode(JSON.stringify(snapshot.values)).byteLength >
    PLUGIN_DATA_SNAPSHOT_LIMIT
  )
    throw new Error("Plugin data snapshot exceeds the safe size limit");
}

export function createIndependentPluginRepository(
  options: {
    indexedDB?: IDBFactory;
    databaseName?: string;
    now?: () => number;
    channel?: BroadcastChannel | null;
    allowDevelopmentReload?: boolean;
  } = {},
) {
  const factory =
    options.indexedDB ??
    (typeof indexedDB === "undefined" ? undefined : indexedDB);
  if (!factory)
    throw new Error("This browser does not provide IndexedDB plugin storage");
  const databaseName = options.databaseName ?? PLUGIN_DATABASE;
  const now = options.now ?? Date.now;
  const allowDevelopmentReload =
    options.allowDevelopmentReload ?? import.meta.env?.DEV === true;
  let lastDevelopmentTimestamp = 0;
  const database = openDatabase(factory, databaseName);
  const listeners = new Set<(id: string) => void>();
  const channel =
    options.channel === undefined
      ? typeof BroadcastChannel === "undefined"
        ? undefined
        : new BroadcastChannel(CHANNEL)
      : (options.channel ?? undefined);
  const receive = (event: MessageEvent) => {
    const value = event.data as { type?: unknown; id?: unknown } | undefined;
    if (value?.type === "changed" && typeof value.id === "string") {
      for (const listener of listeners) listener(value.id);
    }
  };
  channel?.addEventListener("message", receive);

  function notify(id: string) {
    for (const listener of listeners) listener(id);
    channel?.postMessage({ type: "changed", id });
  }

  async function loadRecord(id: string) {
    const db = await database;
    const transaction = db.transaction(INSTALLATIONS, "readonly");
    const done = transactionDone(transaction);
    const request = requestValue(
      transaction.objectStore(INSTALLATIONS).get(id) as IDBRequest<
        PluginInstallation | undefined
      >,
    );
    const [record] = await Promise.all([request, done]);
    return record;
  }

  async function list(): Promise<PluginInstallationInfo[]> {
    const db = await database;
    const transaction = db.transaction([MODULES, INSTALLATIONS], "readonly");
    const done = transactionDone(transaction);
    const modules = requestValue(
      transaction.objectStore(MODULES).getAll() as IDBRequest<
        StoredPluginModule[]
      >,
    );
    const installations = requestValue(
      transaction.objectStore(INSTALLATIONS).getAll() as IDBRequest<
        PluginInstallation[]
      >,
    );
    const [moduleRows, records] = await Promise.all([
      modules,
      installations,
      done,
    ]).then(([a, b]) => [a, b] as const);
    const byDigest = new Map(
      moduleRows.map((module) => [module.digest, module]),
    );
    return records.map((record) => {
      const active = byDigest.get(record.activeDigest);
      const candidate = record.candidateDigest
        ? byDigest.get(record.candidateDigest)
        : undefined;
      const previous = record.previousDigest
        ? byDigest.get(record.previousDigest)
        : undefined;
      const { storageSnapshots: _snapshots, ...publicRecord } = record;
      const problem = !active
        ? "The selected plugin package is missing from local storage"
        : active.manifest.id !== record.id
          ? "Plugin package ID does not match its installation record"
          : record.candidateDigest && !candidate
            ? "The candidate plugin package is missing from local storage"
            : candidate && candidate.manifest.id !== record.id
              ? "Candidate plugin package ID does not match its installation record"
              : record.previousDigest && !previous
                ? "The previous plugin package is missing from local storage"
                : previous && previous.manifest.id !== record.id
                  ? "Previous plugin package ID does not match its installation record"
                  : undefined;
      return {
        ...publicRecord,
        name: active?.manifest.name,
        version: active?.manifest.version,
        storageVersion: active
          ? (active.manifest.storageVersion ?? 1)
          : undefined,
        candidateVersion: candidate?.manifest.version,
        candidateStorageVersion: candidate
          ? (candidate.manifest.storageVersion ?? 1)
          : undefined,
        previousVersion: previous?.manifest.version,
        previousStorageVersion: previous
          ? (previous.manifest.storageVersion ?? 1)
          : undefined,
        healthy: !problem,
        ...(problem ? { problem } : {}),
      };
    });
  }

  async function readModule(digest: string) {
    const db = await database;
    const transaction = db.transaction(MODULES, "readonly");
    const done = transactionDone(transaction);
    const request = requestValue(
      transaction.objectStore(MODULES).get(digest) as IDBRequest<
        StoredPluginModule | undefined
      >,
    );
    const [module] = await Promise.all([request, done]);
    return module;
  }

  async function active(id: string) {
    const record = await loadRecord(id);
    if (!record) return;
    const module = await readModule(record.activeDigest);
    if (
      !module ||
      !(await verifyModule(module, record.activeDigest)) ||
      module?.manifest.id !== id
    ) {
      throw new Error(`Installed plugin ${id} is missing or corrupt`);
    }
    return { record, module };
  }

  async function installPackage(
    pkg: PluginPackage,
    options: { replaceCandidate?: boolean } = {},
  ) {
    const execute = async () => {
      const db = await database;
      return new Promise<PluginInstallation>((resolve, reject) => {
        const transaction = db.transaction(
          [MODULES, INSTALLATIONS],
          "readwrite",
        );
        let result: PluginInstallation | undefined;
        let failure: Error | undefined;
        let changed = false;
        transaction.addEventListener(
          "complete",
          () => {
            if (!result)
              reject(
                failure ??
                  new Error(
                    "Plugin install transaction completed without a record",
                  ),
              );
            else {
              if (changed) notify(pkg.manifest.id);
              resolve(result);
            }
          },
          { once: true },
        );
        transaction.addEventListener(
          "abort",
          () => reject(storageFailure(failure ?? transaction.error)),
          { once: true },
        );
        transaction.addEventListener(
          "error",
          () => reject(storageFailure(failure ?? transaction.error)),
          { once: true },
        );
        const modules = transaction.objectStore(MODULES);
        const installations = transaction.objectStore(INSTALLATIONS);
        const request = installations.get(pkg.manifest.id) as IDBRequest<
          PluginInstallation | undefined
        >;
        request.addEventListener(
          "success",
          () => {
            const current = request.result;
            if (!current) {
              result = {
                id: pkg.manifest.id,
                activeDigest: pkg.digest,
                enabled: false,
                updatedAt: now(),
              };
              try {
                modules.put(storedModule(pkg, now()));
                installations.put(result);
                changed = true;
              } catch (error) {
                failure =
                  error instanceof Error ? error : new Error(String(error));
                transaction.abort();
              }
              return;
            }
            const references = [
              current.activeDigest,
              current.candidateDigest,
              current.previousDigest,
            ].filter((digest): digest is string => !!digest);
            const existing = new Map<string, StoredPluginModule | undefined>();
            let remaining = references.length;
            const commit = () => {
              if (remaining) return;
              try {
                const activeModule = existing.get(current.activeDigest);
                if (!activeModule || activeModule.manifest.id !== current.id) {
                  throw new Error(
                    "The selected plugin package is missing; remove its damaged record before reinstalling",
                  );
                }
                if (current.activationPending) {
                  throw new Error(
                    "A plugin version is still being checked; wait for activation to finish before installing another update",
                  );
                }
                if (activeModule.manifest.version === pkg.manifest.version) {
                  if (current.activeDigest === pkg.digest) {
                    result = current;
                    return;
                  }
                  throw new Error(
                    "This plugin version is already installed with different contents; increment its version",
                  );
                }
                if (current.candidateDigest) {
                  const candidate = existing.get(current.candidateDigest);
                  if (!candidate || candidate.manifest.id !== current.id) {
                    throw new Error(
                      "The saved plugin update is damaged; remove it before installing another update",
                    );
                  }
                  if (candidate.manifest.version === pkg.manifest.version) {
                    if (current.candidateDigest === pkg.digest) {
                      result = current;
                      return;
                    }
                  }
                  if (!options.replaceCandidate)
                    throw new Error(
                      candidate.manifest.version === pkg.manifest.version
                        ? "This plugin version is already installed with different contents; increment its version"
                        : "A plugin update is already awaiting activation",
                    );
                  result = {
                    ...current,
                    candidateDigest: pkg.digest,
                    updatedAt: now(),
                  };
                  modules.put(storedModule(pkg, now()));
                  installations.put(result);
                  collectUnreferenced(transaction);
                  changed = true;
                  return;
                }
                result = {
                  ...current,
                  candidateDigest: pkg.digest,
                  updatedAt: now(),
                };
                modules.put(storedModule(pkg, now()));
                installations.put(result);
                changed = true;
              } catch (error) {
                failure =
                  error instanceof Error ? error : new Error(String(error));
                transaction.abort();
              }
            };
            if (!references.length) {
              commit();
              return;
            }
            for (const digest of references) {
              const get = modules.get(digest) as IDBRequest<
                StoredPluginModule | undefined
              >;
              get.addEventListener(
                "success",
                () => {
                  existing.set(digest, get.result);
                  remaining--;
                  commit();
                },
                { once: true },
              );
            }
          },
          { once: true },
        );
        request.addEventListener(
          "error",
          () => {
            failure =
              request.error instanceof Error
                ? request.error
                : new Error("Cannot read plugin installation");
            try {
              transaction.abort();
            } catch {
              reject(failure);
            }
          },
          { once: true },
        );
      });
    };
    const locks =
      typeof navigator === "undefined" ? undefined : navigator.locks;
    if (!locks) return execute();
    return locks.request(
      `opencode-front:plugin-install:${pkg.manifest.id}`,
      execute,
    );
  }

  async function remove(id: string) {
    const db = await database;
    return new Promise<boolean>((resolve, reject) => {
      const transaction = db.transaction([MODULES, INSTALLATIONS], "readwrite");
      let removed = false;
      transaction.addEventListener(
        "complete",
        () => {
          if (removed) notify(id);
          resolve(removed);
        },
        { once: true },
      );
      transaction.addEventListener(
        "abort",
        () => reject(storageFailure(transaction.error)),
        { once: true },
      );
      transaction.addEventListener(
        "error",
        () => reject(storageFailure(transaction.error)),
        { once: true },
      );
      const installations = transaction.objectStore(INSTALLATIONS);
      const get = installations.get(id) as IDBRequest<
        PluginInstallation | undefined
      >;
      get.addEventListener(
        "success",
        () => {
          if (!get.result) return;
          removed = true;
          installations.delete(id);
          const allRecords = installations.getAll() as IDBRequest<
            PluginInstallation[]
          >;
          allRecords.addEventListener(
            "success",
            () => {
              const referenced = new Set(
                allRecords.result.flatMap((record) =>
                  [
                    record.activeDigest,
                    record.candidateDigest,
                    record.previousDigest,
                  ].filter((digest): digest is string => !!digest),
                ),
              );
              const allModules = transaction
                .objectStore(MODULES)
                .getAll() as IDBRequest<StoredPluginModule[]>;
              allModules.addEventListener(
                "success",
                () => {
                  for (const module of allModules.result) {
                    if (!referenced.has(module.digest))
                      transaction.objectStore(MODULES).delete(module.digest);
                  }
                },
                { once: true },
              );
            },
            { once: true },
          );
        },
        { once: true },
      );
    });
  }

  async function setEnabled(id: string, enabled: boolean) {
    const db = await database;
    return new Promise<PluginInstallation>((resolve, reject) => {
      const transaction = db.transaction(INSTALLATIONS, "readwrite");
      let result: PluginInstallation | undefined;
      transaction.addEventListener(
        "complete",
        () => {
          if (!result)
            reject(new Error(`Plugin installation was not found: ${id}`));
          else {
            notify(id);
            resolve(result);
          }
        },
        { once: true },
      );
      transaction.addEventListener(
        "abort",
        () => reject(storageFailure(transaction.error)),
        { once: true },
      );
      transaction.addEventListener(
        "error",
        () => reject(storageFailure(transaction.error)),
        { once: true },
      );
      const store = transaction.objectStore(INSTALLATIONS);
      const request = store.get(id) as IDBRequest<
        PluginInstallation | undefined
      >;
      request.addEventListener(
        "success",
        () => {
          if (!request.result) return;
          result = { ...request.result, enabled, updatedAt: now() };
          try {
            store.put(result);
          } catch (error) {
            transaction.abort();
            reject(storageFailure(error));
          }
        },
        { once: true },
      );
    });
  }

  function collectUnreferenced(transaction: IDBTransaction) {
    const installations = transaction.objectStore(INSTALLATIONS);
    const modules = transaction.objectStore(MODULES);
    const records = installations.getAll() as IDBRequest<PluginInstallation[]>;
    records.addEventListener(
      "success",
      () => {
        const referenced = new Set(
          records.result.flatMap((record) =>
            [
              record.activeDigest,
              record.candidateDigest,
              record.previousDigest,
            ].filter((digest): digest is string => !!digest),
          ),
        );
        const all = modules.getAll() as IDBRequest<StoredPluginModule[]>;
        all.addEventListener(
          "success",
          () => {
            for (const module of all.result) {
              if (!referenced.has(module.digest)) modules.delete(module.digest);
            }
          },
          { once: true },
        );
      },
      { once: true },
    );
  }

  async function switchVersion(
    id: string,
    direction: "candidate" | "previous",
    snapshot: PluginDataSnapshot,
  ) {
    const before = await loadRecord(id);
    if (!before) throw new Error(`Plugin installation was not found: ${id}`);
    if (before.activationPending)
      throw new Error(`Plugin ${id} is still being activated`);
    if (snapshot.digest !== before.activeDigest)
      throw new Error("Plugin data snapshot does not match the active version");
    validateDataSnapshot(id, before.activeDigest, snapshot);
    const activeModule = await readModule(before.activeDigest);
    if (
      !activeModule ||
      !(await verifyModule(activeModule, before.activeDigest)) ||
      activeModule.manifest.id !== id
    ) {
      throw new Error(`Plugin ${id} active version is missing or corrupt`);
    }
    const targetDigest =
      direction === "candidate"
        ? before.candidateDigest
        : before.previousDigest;
    if (!targetDigest)
      throw new Error(
        direction === "candidate"
          ? `Plugin ${id} has no staged update`
          : `Plugin ${id} has no previous version to restore`,
      );
    const target = await readModule(targetDigest);
    if (
      !target ||
      !(await verifyModule(target, targetDigest)) ||
      target.manifest.id !== id
    ) {
      throw new Error(`Plugin ${id} version is missing or corrupt`);
    }

    const execute = async () => {
      const db = await database;
      return new Promise<PluginInstallation>((resolve, reject) => {
        const transaction = db.transaction(
          [MODULES, INSTALLATIONS],
          "readwrite",
        );
        let result: PluginInstallation | undefined;
        let failure: Error | undefined;
        transaction.addEventListener(
          "complete",
          () => {
            if (!result)
              reject(
                failure ?? new Error(`Plugin version switch failed: ${id}`),
              );
            else {
              notify(id);
              resolve(result);
            }
          },
          { once: true },
        );
        transaction.addEventListener(
          "abort",
          () => reject(storageFailure(failure ?? transaction.error)),
          { once: true },
        );
        transaction.addEventListener(
          "error",
          () => reject(storageFailure(failure ?? transaction.error)),
          { once: true },
        );
        const store = transaction.objectStore(INSTALLATIONS);
        const request = store.get(id) as IDBRequest<
          PluginInstallation | undefined
        >;
        request.addEventListener(
          "success",
          () => {
            const current = request.result;
            const currentTarget =
              direction === "candidate"
                ? current?.candidateDigest
                : current?.previousDigest;
            if (
              !current ||
              current.activationPending ||
              current.activeDigest !== before.activeDigest ||
              currentTarget !== targetDigest
            ) {
              failure = new Error(
                `Plugin ${id} changed in another window; refresh and retry`,
              );
              transaction.abort();
              return;
            }
            if (
              direction === "previous" &&
              !(current.storageSnapshots ?? []).some(
                (item) => item.digest === targetDigest,
              )
            ) {
              failure = new Error(
                `Plugin ${id} cannot safely restore the previous version because its data snapshot is missing`,
              );
              transaction.abort();
              return;
            }
            const snapshots = [
              ...(current.storageSnapshots ?? []).filter(
                (item) =>
                  item.digest !== current.activeDigest &&
                  item.digest === targetDigest,
              ),
              { ...snapshot, capturedAt: now() },
            ];
            result = {
              ...current,
              activeDigest: targetDigest,
              previousDigest: current.activeDigest,
              ...(direction === "candidate"
                ? { candidateDigest: undefined }
                : {}),
              activationPending: true,
              storageSnapshots: snapshots,
              activationDataDigest: snapshots.some(
                (item) => item.digest === targetDigest,
              )
                ? targetDigest
                : current.activeDigest,
              failedVersion: undefined,
              lastFailure: undefined,
              updatedAt: now(),
            };
            try {
              store.put(result);
              collectUnreferenced(transaction);
            } catch (error) {
              failure =
                error instanceof Error ? error : new Error(String(error));
              transaction.abort();
            }
          },
          { once: true },
        );
      });
    };
    const locks =
      typeof navigator === "undefined" ? undefined : navigator.locks;
    if (!locks) return execute();
    return locks.request(`opencode-front:plugin-install:${id}`, execute);
  }

  async function markActivationHealthy(id: string) {
    const before = await loadRecord(id);
    if (!before?.activationPending) return false;
    const db = await database;
    return new Promise<boolean>((resolve, reject) => {
      const transaction = db.transaction(INSTALLATIONS, "readwrite");
      let changed = false;
      let failure: Error | undefined;
      transaction.addEventListener(
        "complete",
        () => {
          if (changed) notify(id);
          resolve(changed);
        },
        { once: true },
      );
      transaction.addEventListener(
        "abort",
        () => reject(storageFailure(failure ?? transaction.error)),
        { once: true },
      );
      transaction.addEventListener(
        "error",
        () => reject(storageFailure(failure ?? transaction.error)),
        { once: true },
      );
      const store = transaction.objectStore(INSTALLATIONS);
      const request = store.get(id) as IDBRequest<
        PluginInstallation | undefined
      >;
      request.addEventListener(
        "success",
        () => {
          if (
            !request.result?.activationPending ||
            request.result.activeDigest !== before.activeDigest
          )
            return;
          changed = true;
          try {
            store.put({
              ...request.result,
              activationPending: false,
              activationDataDigest: undefined,
              updatedAt: now(),
            });
          } catch (error) {
            failure = error instanceof Error ? error : new Error(String(error));
            transaction.abort();
          }
        },
        { once: true },
      );
    });
  }

  async function rollbackActivation(id: string, detail: string) {
    const before = await loadRecord(id);
    if (!before?.activationPending) return false;
    if (!before.previousDigest)
      throw new Error(`Plugin ${id} has no previous version to restore`);
    const previousSnapshot = before.storageSnapshots?.find(
      (snapshot) => snapshot.digest === before.previousDigest,
    );
    if (!previousSnapshot)
      throw new Error(
        `Plugin ${id} cannot be safely rolled back because its previous data snapshot is missing`,
      );
    validateDataSnapshot(id, before.previousDigest, previousSnapshot);
    const failed = await readModule(before.activeDigest);
    const previous = await readModule(before.previousDigest);
    if (
      !failed ||
      !(await verifyModule(failed, before.activeDigest)) ||
      !previous ||
      !(await verifyModule(previous, before.previousDigest)) ||
      failed.manifest.id !== id ||
      previous.manifest.id !== id
    ) {
      throw new Error(
        `Plugin ${id} activation rollback data is missing or corrupt`,
      );
    }
    const db = await database;
    return new Promise<boolean>((resolve, reject) => {
      const transaction = db.transaction([MODULES, INSTALLATIONS], "readwrite");
      let changed = false;
      let failure: Error | undefined;
      transaction.addEventListener(
        "complete",
        () => {
          if (changed) notify(id);
          resolve(changed);
        },
        { once: true },
      );
      transaction.addEventListener(
        "abort",
        () => reject(storageFailure(failure ?? transaction.error)),
        { once: true },
      );
      transaction.addEventListener(
        "error",
        () => reject(storageFailure(failure ?? transaction.error)),
        { once: true },
      );
      const store = transaction.objectStore(INSTALLATIONS);
      const request = store.get(id) as IDBRequest<
        PluginInstallation | undefined
      >;
      request.addEventListener(
        "success",
        () => {
          const current = request.result;
          if (
            !current?.activationPending ||
            current.activeDigest !== before.activeDigest ||
            current.previousDigest !== before.previousDigest
          ) {
            failure = new Error(
              `Plugin ${id} changed in another window; rollback was cancelled`,
            );
            transaction.abort();
            return;
          }
          changed = true;
          try {
            store.put({
              ...current,
              activeDigest: before.previousDigest!,
              previousDigest: undefined,
              activationPending: false,
              activationDataDigest: undefined,
              storageSnapshots: (current.storageSnapshots ?? []).filter(
                (snapshot) => snapshot.digest === before.previousDigest,
              ),
              failedVersion: failed.manifest.version,
              lastFailure: detail.slice(0, 500),
              updatedAt: now(),
            });
            collectUnreferenced(transaction);
          } catch (error) {
            failure = error instanceof Error ? error : new Error(String(error));
            transaction.abort();
          }
        },
        { once: true },
      );
    });
  }

  return {
    async preview(file: Blob) {
      const pkg = await inspectPluginPackage(file);
      const current = (await list()).find(
        (entry) => entry.id === pkg.manifest.id,
      );
      const currentModule = current
        ? await readModule(current.activeDigest)
        : undefined;
      const conflict =
        !!current &&
        currentModule?.manifest.version === pkg.manifest.version &&
        current.activeDigest !== pkg.digest
          ? "This plugin version is already installed with different contents; increment its version"
          : current?.candidateVersion === pkg.manifest.version &&
              current.candidateDigest !== pkg.digest
            ? "This plugin version is already installed with different contents; increment its version"
            : undefined;
      return {
        manifest: pkg.manifest,
        digest: pkg.digest,
        compressedBytes: pkg.compressedBytes,
        uncompressedBytes: pkg.uncompressedBytes,
        currentVersion: current?.version,
        candidateVersion: current?.candidateVersion,
        action: !current
          ? ("install" as const)
          : current.activeDigest === pkg.digest
            ? ("same" as const)
            : ("update" as const),
        conflict,
      };
    },
    async install(file: Blob) {
      const pkg = await inspectPluginPackage(file);
      return installPackage(pkg);
    },
    async installDevelopment(id: string, file: Blob) {
      if (!allowDevelopmentReload)
        throw new Error(
          "Development plugin reload is available only in dev builds",
        );
      const current = await loadRecord(id);
      if (!current)
        throw new Error(
          `Plugin ${id} must be installed before development reload`,
        );
      if (current.activationPending)
        throw new Error(`Plugin ${id} is still being activated`);
      const pkg = await inspectPluginPackage(file);
      if (pkg.manifest.id !== id)
        throw new Error(`Development package ID must match ${id}`);
      const timestamp = Math.max(
        Math.floor(now()),
        lastDevelopmentTimestamp + 1,
      );
      lastDevelopmentTimestamp = timestamp;
      const development = await developmentPluginPackage(pkg, timestamp);
      return installPackage(development, { replaceCandidate: true });
    },
    list,
    active,
    activateCandidate(id: string, snapshot: PluginDataSnapshot) {
      return switchVersion(id, "candidate", snapshot);
    },
    restorePrevious(id: string, snapshot: PluginDataSnapshot) {
      return switchVersion(id, "previous", snapshot);
    },
    dataSnapshot(id: string, digest: string) {
      return loadRecord(id).then((record) => {
        const snapshot = record?.storageSnapshots?.find(
          (item) => item.digest === digest,
        );
        if (snapshot) validateDataSnapshot(id, digest, snapshot);
        return snapshot;
      });
    },
    markActivationHealthy,
    rollbackActivation,
    async discardCandidate(id: string) {
      const db = await database;
      return new Promise<boolean>((resolve, reject) => {
        const transaction = db.transaction(
          [MODULES, INSTALLATIONS],
          "readwrite",
        );
        let changed = false;
        let failure: Error | undefined;
        transaction.addEventListener(
          "complete",
          () => {
            if (changed) notify(id);
            resolve(changed);
          },
          { once: true },
        );
        transaction.addEventListener(
          "abort",
          () => reject(storageFailure(failure ?? transaction.error)),
          { once: true },
        );
        transaction.addEventListener(
          "error",
          () => reject(storageFailure(failure ?? transaction.error)),
          { once: true },
        );
        const store = transaction.objectStore(INSTALLATIONS);
        const request = store.get(id) as IDBRequest<
          PluginInstallation | undefined
        >;
        request.addEventListener(
          "success",
          () => {
            if (!request.result?.candidateDigest) return;
            changed = true;
            try {
              store.put({
                ...request.result,
                candidateDigest: undefined,
                updatedAt: now(),
              });
              collectUnreferenced(transaction);
            } catch (error) {
              failure =
                error instanceof Error ? error : new Error(String(error));
              transaction.abort();
            }
          },
          { once: true },
        );
      });
    },
    setEnabled,
    async module(digest: string) {
      const stored = await readModule(digest);
      if (!stored || !(await verifyModule(stored, digest)))
        throw new Error("Stored plugin module is missing or corrupt");
      return stored;
    },
    remove,
    subscribe(listener: (id: string) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async close() {
      channel?.removeEventListener("message", receive);
      channel?.close();
      listeners.clear();
      (await database).close();
    },
  };
}

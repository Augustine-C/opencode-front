import { expect, test } from "bun:test";
import { deflateRawSync } from "node:zlib";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { inspectPluginPackage } from "../src/plugins/independent/package";
import { createIndependentPluginRepository } from "../src/plugins/independent/repository";

type Entry = {
  path: string;
  bytes: Uint8Array;
  method?: 0 | 8;
  externalType?: number;
  flags?: number;
};

const encoder = new TextEncoder();
const manifest = (patch: Record<string, unknown> = {}) => ({
  formatVersion: 1,
  id: "example.hello-world",
  name: "Hello World",
  version: "1.2.3",
  apiVersion: 1,
  runtimeVersion: "solid-v1",
  entry: "main.js",
  capabilities: ["commands.register", "panels.register"],
  ...patch,
});

function packageEntries(
  source = "export const setup = () => {}",
  patch: Record<string, unknown> = {},
): Entry[] {
  return [
    {
      path: "manifest.json",
      bytes: encoder.encode(JSON.stringify(manifest(patch))),
    },
    { path: "main.js", bytes: encoder.encode(source) },
  ];
}

function zip(entries: Entry[]) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  const total = (parts: Uint8Array[]) =>
    parts.reduce((sum, part) => sum + part.byteLength, 0);
  const put16 = (view: DataView, at: number, value: number) =>
    view.setUint16(at, value, true);
  const put32 = (view: DataView, at: number, value: number) =>
    view.setUint32(at, value >>> 0, true);
  const crc32 = (bytes: Uint8Array) => {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++)
        crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
    return (crc ^ 0xffffffff) >>> 0;
  };

  for (const entry of entries) {
    const name = encoder.encode(entry.path);
    const plain = entry.bytes;
    const method = entry.method ?? 0;
    const content =
      method === 8 ? new Uint8Array(deflateRawSync(plain)) : plain;
    const checksum = crc32(plain);
    const flags = entry.flags ?? 0x800;
    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    put32(localView, 0, 0x04034b50);
    put16(localView, 4, 20);
    put16(localView, 6, flags);
    put16(localView, 8, method);
    put32(localView, 14, checksum);
    put32(localView, 18, content.length);
    put32(localView, 22, plain.length);
    put16(localView, 26, name.length);
    local.set(name, 30);
    localParts.push(local, content);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    put32(centralView, 0, 0x02014b50);
    put16(centralView, 4, 0x0314);
    put16(centralView, 6, 20);
    put16(centralView, 8, flags);
    put16(centralView, 10, method);
    put32(centralView, 16, checksum);
    put32(centralView, 20, content.length);
    put32(centralView, 24, plain.length);
    put16(centralView, 28, name.length);
    put32(centralView, 38, ((entry.externalType ?? 0x8000) << 16) >>> 0);
    put32(centralView, 42, offset);
    central.set(name, 46);
    centralParts.push(central);
    offset += local.length + content.length;
  }

  const directory = new Uint8Array(total(centralParts));
  let directoryOffset = 0;
  for (const part of centralParts) {
    directory.set(part, directoryOffset);
    directoryOffset += part.length;
  }
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  put32(endView, 0, 0x06054b50);
  put16(endView, 8, entries.length);
  put16(endView, 10, entries.length);
  put32(endView, 12, directory.length);
  put32(endView, 16, offset);
  const output = new Uint8Array(offset + directory.length + end.length);
  let outputOffset = 0;
  for (const part of localParts) {
    output.set(part, outputOffset);
    outputOffset += part.length;
  }
  output.set(directory, outputOffset);
  output.set(end, outputOffset + directory.length);
  return new Blob([output]);
}

async function rejected(entries: Entry[], message: string) {
  await expect(inspectPluginPackage(zip(entries))).rejects.toThrow(message);
}

let repositorySequence = 0;
function repository(factory = new IDBFactory(), shared = false) {
  const databaseName = `independent-plugin-test-${++repositorySequence}`;
  return {
    factory,
    databaseName,
    create: () =>
      createIndependentPluginRepository({
        indexedDB: factory,
        databaseName,
        channel: shared ? undefined : null,
        now: () => 1_800_000_000_000 + repositorySequence,
      }),
  };
}

function openDatabase(factory: IDBFactory, name: string) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(name);
    request.addEventListener("success", () => resolve(request.result), {
      once: true,
    });
    request.addEventListener(
      "error",
      () =>
        reject(request.error ?? new Error("Could not open fixture database")),
      { once: true },
    );
  });
}

test("independent plugin package validates its manifest and computes order-independent content digest", async () => {
  const entries = packageEntries("export const setup = () => {}", {
    styles: ["style.css"],
    assets: ["images/logo.png"],
    capabilities: ["commands.register", "panels.register", "assets.read"],
    homepage: "https://example.test/plugins/hello",
  });
  entries.push({
    path: "style.css",
    bytes: encoder.encode(".hello { color: red }"),
  });
  entries.push({ path: "images/logo.png", bytes: new Uint8Array([1, 2, 3]) });
  const first = await inspectPluginPackage(zip(entries));
  const second = await inspectPluginPackage(zip([...entries].reverse()));
  expect(first.manifest.id).toBe("example.hello-world");
  expect(first.manifest.styles).toEqual(["style.css"]);
  expect(first.digest).toMatch(/^[0-9a-f]{64}$/);
  expect(second.digest).toBe(first.digest);
  expect(first.uncompressedBytes).toBe(
    entries.reduce((sum, entry) => sum + entry.bytes.length, 0),
  );
});

test("independent plugin package rejects unsupported, unsafe, and undeclared manifest data", async () => {
  await rejected(
    packageEntries("export const setup = () => {}", { apiVersion: 2 }),
    "unsupported API version",
  );
  await rejected(
    packageEntries("export const setup = () => {}", {
      id: "connection-status",
    }),
    "reserved host id",
  );
  await rejected(
    packageEntries("export const setup = () => {}", {
      homepage: "javascript:alert(1)",
    }),
    "HTTPS URL",
  );
  await rejected(
    packageEntries("export const setup = () => {}", { extra: true }),
    "Unknown plugin manifest field",
  );
  await rejected(
    packageEntries("export const setup = () => {}", {
      styles: ["../host.css"],
    }),
    "Unsafe package path",
  );
  await rejected(
    [
      ...packageEntries(),
      { path: "unlisted.js", bytes: encoder.encode("window.bad = true") },
    ],
    "Undeclared file",
  );
  await rejected(
    packageEntries("export const setup = () => {}", {
      assets: ["manifest.json"],
    }),
    "reserved for the package manifest",
  );
});

test("independent plugin entry is valid self-contained JavaScript without static or dynamic imports", async () => {
  const valid = await inspectPluginPackage(
    zip(
      packageEntries(
        "export const setup = ({ context }) => context.storage.get('x')",
      ),
    ),
  );
  expect(valid.manifest.entry).toBe("main.js");
  await rejected(
    packageEntries(
      "import { createSignal } from 'solid-js'; export const setup = () => {}",
    ),
    "cannot import other modules",
  );
  await rejected(
    packageEntries("export const setup = () => import('./late.js')"),
    "cannot import other modules",
  );
  await rejected(
    packageEntries("export { setup } from './setup.js'"),
    "cannot import other modules",
  );
  await rejected(
    packageEntries("export const other = () => {}"),
    "must export a setup function",
  );
  await rejected(
    packageEntries("export const setup = () => {"),
    "invalid JavaScript",
  );
});

test("ZIP parser accepts deflate and rejects traversal, duplicate, encrypted, linked, and corrupt entries", async () => {
  const entries = packageEntries("export const setup = () => {}");
  const deflated = entries.map((entry) => ({ ...entry, method: 8 as const }));
  expect((await inspectPluginPackage(zip(deflated))).manifest.id).toBe(
    "example.hello-world",
  );
  await rejected(
    [...entries, { path: "../outside.txt", bytes: encoder.encode("no") }],
    "Unsafe path",
  );
  await rejected(
    [...entries, { path: "MAIN.JS", bytes: encoder.encode("duplicate") }],
    "Duplicate or case-conflicting",
  );
  await rejected(
    entries.map((entry) => ({
      ...entry,
      flags: entry.path === "main.js" ? 0x801 : 0x800,
    })),
    "Encrypted and streaming",
  );
  await rejected(
    [
      ...packageEntries(),
      { path: "link", bytes: encoder.encode("target"), externalType: 0xa000 },
    ],
    "Special files are not allowed",
  );
  const corrupt = new Uint8Array(await zip(entries).arrayBuffer());
  const marker = encoder.encode("export const setup");
  let main = -1;
  for (let offset = 0; offset <= corrupt.length - marker.length; offset++) {
    if (marker.every((byte, index) => corrupt[offset + index] === byte)) {
      main = offset;
      break;
    }
  }
  expect(main).toBeGreaterThanOrEqual(0);
  corrupt[main] ^= 1;
  await expect(inspectPluginPackage(new Blob([corrupt]))).rejects.toThrow(
    "checksum mismatch",
  );
});

test("ZIP parser enforces per-file, aggregate expansion, and entry-count limits before extraction", async () => {
  const oversize = new Uint8Array(await zip(packageEntries()).arrayBuffer());
  const centralRecords: number[] = [];
  for (let offset = 0; offset <= oversize.length - 46; offset++) {
    if (new DataView(oversize.buffer).getUint32(offset, true) === 0x02014b50) {
      centralRecords.push(offset);
    }
  }
  expect(centralRecords).toHaveLength(2);
  new DataView(oversize.buffer).setUint32(
    centralRecords[0] + 24,
    20 * 1024 * 1024 + 1,
    true,
  );
  await expect(inspectPluginPackage(new Blob([oversize]))).rejects.toThrow(
    "exceeds 20 MiB",
  );

  const expandedEntries = [
    ...packageEntries(),
    { path: "extra.txt", bytes: encoder.encode("x") },
  ];
  const expanded = new Uint8Array(await zip(expandedEntries).arrayBuffer());
  const expandedView = new DataView(expanded.buffer);
  const expandedRecords: number[] = [];
  for (let offset = 0; offset <= expanded.length - 46; offset++) {
    if (expandedView.getUint32(offset, true) === 0x02014b50) {
      expandedRecords.push(offset);
    }
  }
  for (const offset of expandedRecords) {
    expandedView.setUint32(offset + 24, 18 * 1024 * 1024, true);
  }
  await expect(inspectPluginPackage(new Blob([expanded]))).rejects.toThrow(
    "50 MiB",
  );

  const tooMany = [
    ...packageEntries(),
    ...Array.from({ length: 999 }, (_, index) => ({
      path: `assets/${index}.txt`,
      bytes: new Uint8Array(),
    })),
  ];
  await expect(inspectPluginPackage(zip(tooMany))).rejects.toThrow(
    "more than 1,000 entries",
  );
});

test("plugin preview and invalid installation do not execute code or write records", async () => {
  const setup = repository();
  const store = setup.create();
  const executable = packageEntries(
    "globalThis.__independentPluginRan = true; export const setup = () => {}",
  );
  try {
    const preview = await store.preview(zip(executable));
    expect(preview.action).toBe("install");
    expect(await store.list()).toEqual([]);
    expect(
      (globalThis as Record<string, unknown>).__independentPluginRan,
    ).toBeUndefined();
    await expect(
      store.install(
        zip(packageEntries("import('bad'); export const setup = () => {}")),
      ),
    ).rejects.toThrow("cannot import other modules");
    expect(await store.list()).toEqual([]);
  } finally {
    await store.close();
  }
});

test("plugin installation is atomic, idempotent, and preserves the active package while staging updates", async () => {
  const setup = repository();
  const store = setup.create();
  const initial = zip(packageEntries());
  try {
    const installed = await store.install(initial);
    expect(installed.enabled).toBe(false);
    expect(installed.activeDigest).toMatch(/^[0-9a-f]{64}$/);
    expect((await store.install(initial)).activeDigest).toBe(
      installed.activeDigest,
    );
    await expect(
      store.install(
        zip(packageEntries("export const setup = () => 'changed'")),
      ),
    ).rejects.toThrow("different contents; increment its version");

    await store.setEnabled("example.hello-world", true);
    const candidateFile = zip(
      packageEntries("export const setup = () => {}", { version: "2.0.0" }),
    );
    const candidate = await store.install(candidateFile);
    expect(candidate.enabled).toBe(true);
    expect(candidate.activeDigest).toBe(installed.activeDigest);
    expect(candidate.candidateDigest).toMatch(/^[0-9a-f]{64}$/);
    expect((await store.active(candidate.id))?.module.manifest.version).toBe(
      "1.2.3",
    );
    expect(
      (await store.list()).find((entry) => entry.id === candidate.id),
    ).toMatchObject({
      healthy: true,
      version: "1.2.3",
      candidateVersion: "2.0.0",
      enabled: true,
    });

    await store.close();
    const reopened = setup.create();
    try {
      expect(
        (await reopened.list()).find((entry) => entry.id === candidate.id),
      ).toMatchObject({
        version: "1.2.3",
        candidateVersion: "2.0.0",
      });
    } finally {
      await reopened.close();
    }
  } catch (error) {
    await store.close();
    throw error;
  }
});

test("plugin repository serializes concurrent writers and broadcasts committed changes", async () => {
  const setup = repository(new IDBFactory(), true);
  const first = setup.create();
  const second = setup.create();
  let changed!: (id: string) => void;
  const notified = new Promise<string>((resolve) => {
    changed = resolve;
  });
  const stop = second.subscribe((id) => changed(id));
  try {
    await Promise.all([
      first.install(
        zip(
          packageEntries("export const setup = () => {}", {
            id: "example.first",
          }),
        ),
      ),
      second.install(
        zip(
          packageEntries("export const setup = () => {}", {
            id: "example.second",
          }),
        ),
      ),
    ]);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const id = await Promise.race([
      notified,
      new Promise<string>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Broadcast timed out")),
          1000,
        );
      }),
    ]).finally(() => {
      if (timeout) clearTimeout(timeout);
    });
    expect(["example.first", "example.second"]).toContain(id);
    expect((await first.list()).map((entry) => entry.id).sort()).toEqual([
      "example.first",
      "example.second",
    ]);
  } finally {
    stop();
    await Promise.all([first.close(), second.close()]);
  }
});

test("plugin uninstall garbage-collects only unreferenced module bytes and damaged records are recoverable", async () => {
  const setup = repository();
  const store = setup.create();
  try {
    const first = await store.install(
      zip(
        packageEntries("export const setup = () => {}", {
          id: "example.first",
        }),
      ),
    );
    const second = await store.install(
      zip(
        packageEntries("export const setup = () => {}", {
          id: "example.second",
        }),
      ),
    );
    expect(await store.remove(first.id)).toBe(true);
    await expect(store.module(first.activeDigest)).rejects.toThrow(
      "missing or corrupt",
    );
    expect((await store.active(second.id))?.record.activeDigest).toBe(
      second.activeDigest,
    );

    const db = await openDatabase(setup.factory, setup.databaseName);
    const transaction = db.transaction("installations", "readwrite");
    transaction.objectStore("installations").put({
      id: "example.damaged",
      activeDigest: "missing-digest",
      enabled: true,
      updatedAt: 1,
    });
    await new Promise<void>((resolve, reject) => {
      transaction.addEventListener("complete", () => resolve(), { once: true });
      transaction.addEventListener("abort", () => reject(transaction.error), {
        once: true,
      });
    });
    db.close();
    expect(
      (await store.list()).find((entry) => entry.id === "example.damaged"),
    ).toMatchObject({
      healthy: false,
      problem: "The selected plugin package is missing from local storage",
    });
    await expect(store.active("example.damaged")).rejects.toThrow(
      "missing or corrupt",
    );
  } finally {
    await store.close();
  }
});

test("plugin repository keeps the old installation when IndexedDB reports a quota failure", async () => {
  const setup = repository();
  const store = setup.create();
  const active = await store.install(zip(packageEntries()));
  const originalPut = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (value, key) {
    if (this.name === "modules")
      throw new DOMException("storage full", "QuotaExceededError");
    return originalPut.call(this, value, key);
  };
  try {
    await expect(
      store.install(
        zip(
          packageEntries("export const setup = () => {}", { version: "2.0.0" }),
        ),
      ),
    ).rejects.toThrow("Plugin storage is full");
  } finally {
    IDBObjectStore.prototype.put = originalPut;
  }
  try {
    const record = (await store.list()).find((entry) => entry.id === active.id);
    expect(record).toMatchObject({
      activeDigest: active.activeDigest,
      version: "1.2.3",
      healthy: true,
    });
    expect(record?.candidateDigest).toBeUndefined();
  } finally {
    await store.close();
  }
});

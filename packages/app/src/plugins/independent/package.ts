import { parse } from "acorn";
import {
  PLUGIN_API_VERSION,
  PLUGIN_CAPABILITIES,
  PLUGIN_FORMAT_VERSION,
  PLUGIN_RUNTIME_VERSION,
  type IndependentPluginManifest,
  type PluginCapability,
} from "@opencode/frontend-plugin/independent";
import { readPluginArchive, type ArchiveFile } from "./archive";

export type PluginManifest = IndependentPluginManifest;
export type PluginPackage = {
  manifest: PluginManifest;
  files: Map<string, Uint8Array>;
  digest: string;
  compressedBytes: number;
  uncompressedBytes: number;
};

const capabilitySet = new Set<string>(PLUGIN_CAPABILITIES);
const manifestFields = new Set([
  "formatVersion",
  "id",
  "name",
  "version",
  "apiVersion",
  "runtimeVersion",
  "entry",
  "styles",
  "assets",
  "capabilities",
  "description",
  "author",
  "homepage",
  "license",
  "storageVersion",
]);
const pluginID = /^[a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+$/;
const semver =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
const reservedIDs = new Set(["connection-status", "codearts-proxy"]);

function stringField(value: unknown, name: string, maxLength: number) {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new Error(
      `Manifest ${name} must be a non-empty string of at most ${maxLength} characters`,
    );
  }
  return value.trim();
}

function packagePath(value: unknown, name: string) {
  if (typeof value !== "string" || !/^[A-Za-z0-9._/-]+$/.test(value))
    throw new Error(`Invalid package path in ${name}`);
  const parts = value.split("/");
  if (
    value.startsWith("/") ||
    value.includes("\\") ||
    parts.some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(`Unsafe package path in ${name}: ${value}`);
  }
  return value;
}

function inspectModule(source: string) {
  const ast = parse(source, {
    ecmaVersion: "latest",
    sourceType: "module",
  }) as unknown as {
    body: Array<Record<string, unknown>>;
  };
  const pending: unknown[] = [...ast.body];
  let hasImports = false;
  let hasSetup = false;
  while (pending.length) {
    const value = pending.pop();
    if (!value || typeof value !== "object") continue;
    const node = value as Record<string, unknown>;
    if (
      node.type === "ImportDeclaration" ||
      node.type === "ImportExpression" ||
      node.type === "ExportAllDeclaration" ||
      (node.type === "ExportNamedDeclaration" && node.source)
    )
      hasImports = true;
    if (node.type === "ExportNamedDeclaration") {
      const declaration = node.declaration as Record<string, unknown> | null;
      if (
        declaration?.type === "FunctionDeclaration" &&
        (declaration.id as Record<string, unknown> | null)?.name === "setup"
      ) {
        hasSetup = true;
      }
      if (
        declaration?.type === "VariableDeclaration" &&
        Array.isArray(declaration.declarations)
      ) {
        hasSetup ||= declaration.declarations.some(
          (item) =>
            ((item as Record<string, unknown>)?.id as Record<string, unknown>)
              ?.name === "setup",
        );
      }
      if (Array.isArray(node.specifiers)) {
        hasSetup ||= node.specifiers.some(
          (item) =>
            (
              (item as Record<string, unknown>).exported as
                | Record<string, unknown>
                | undefined
            )?.name === "setup",
        );
      }
    }
    for (const child of Object.values(node)) {
      if (Array.isArray(child)) pending.push(...child);
      else if (child && typeof child === "object") pending.push(child);
    }
  }
  return { hasImports, hasSetup };
}

export function validatePluginManifest(
  value: unknown,
  packageFiles: ReadonlySet<string>,
): PluginManifest {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Plugin manifest must be an object");
  const source = value as Record<string, unknown>;
  for (const key of Object.keys(source)) {
    if (!manifestFields.has(key))
      throw new Error(`Unknown plugin manifest field: ${key}`);
  }
  if (source.formatVersion !== PLUGIN_FORMAT_VERSION)
    throw new Error("Unsupported plugin package format version");
  const id = stringField(source.id, "id", 100);
  if (
    !pluginID.test(id) ||
    reservedIDs.has(id) ||
    id.startsWith("opencode.") ||
    id.startsWith("opencode-front.")
  ) {
    throw new Error(
      "Plugin id must be namespaced and cannot use a reserved host id",
    );
  }
  const name = stringField(source.name, "name", 80);
  const version = stringField(source.version, "version", 100);
  if (!semver.test(version)) throw new Error("Plugin version must use SemVer");
  if (source.apiVersion !== PLUGIN_API_VERSION)
    throw new Error("Plugin requires an unsupported API version");
  if (source.runtimeVersion !== PLUGIN_RUNTIME_VERSION)
    throw new Error("Plugin requires an unsupported Solid runtime");
  if (source.entry !== "main.js" || !packageFiles.has("main.js"))
    throw new Error("Plugin entry must be main.js inside the package");
  if (
    !Array.isArray(source.capabilities) ||
    source.capabilities.some(
      (item) => typeof item !== "string" || !capabilitySet.has(item),
    )
  ) {
    throw new Error("Plugin declares an unknown capability");
  }
  const capabilities = [
    ...new Set(source.capabilities as string[]),
  ] as PluginCapability[];
  const stylesRaw = source.styles ?? [];
  const assetsRaw = source.assets ?? [];
  if (!Array.isArray(stylesRaw) || !Array.isArray(assetsRaw))
    throw new Error("Plugin styles and assets must be arrays");
  const styles = stylesRaw.map((path) => packagePath(path, "styles"));
  const assets = assetsRaw.map((path) => packagePath(path, "assets"));
  if (styles.length > 16 || assets.length > 1000)
    throw new Error("Plugin declares too many resource files");
  const referenced = ["main.js", ...styles, ...assets];
  const unique = new Set<string>();
  for (const path of referenced) {
    const key = path.toLowerCase();
    if (unique.has(key))
      throw new Error(
        `Plugin package path is declared more than once: ${path}`,
      );
    unique.add(key);
    if (!packageFiles.has(path))
      throw new Error(`Plugin package is missing ${path}`);
  }
  if (referenced.some((path) => path.toLowerCase() === "manifest.json")) {
    throw new Error("manifest.json is reserved for the package manifest");
  }
  for (const path of packageFiles) {
    if (path !== "manifest.json" && !unique.has(path.toLowerCase())) {
      throw new Error(`Undeclared file in plugin package: ${path}`);
    }
  }
  if (
    !capabilities.includes("assets.read") &&
    (styles.length || assets.length)
  ) {
    throw new Error("Plugins with CSS or assets must declare assets.read");
  }
  for (const optional of [
    "description",
    "author",
    "homepage",
    "license",
  ] as const) {
    if (source[optional] !== undefined) {
      const field = stringField(
        source[optional],
        optional,
        optional === "description" ? 500 : 200,
      );
      if (optional === "homepage") {
        let url: URL;
        try {
          url = new URL(field);
        } catch {
          throw new Error("Manifest homepage must be an HTTPS URL");
        }
        if (url.protocol !== "https:" || !url.hostname)
          throw new Error("Manifest homepage must be an HTTPS URL");
      }
    }
  }
  const storageVersion = source.storageVersion ?? 1;
  if (
    !Number.isInteger(storageVersion) ||
    (storageVersion as number) < 1 ||
    (storageVersion as number) > 0x7fffffff
  ) {
    throw new Error("storageVersion must be a positive integer");
  }
  return {
    formatVersion: 1,
    id,
    name,
    version,
    apiVersion: 1,
    runtimeVersion: PLUGIN_RUNTIME_VERSION,
    entry: "main.js",
    styles,
    assets,
    capabilities,
    ...(source.description === undefined
      ? {}
      : { description: source.description as string }),
    ...(source.author === undefined ? {} : { author: source.author as string }),
    ...(source.homepage === undefined
      ? {}
      : { homepage: source.homepage as string }),
    ...(source.license === undefined
      ? {}
      : { license: source.license as string }),
    storageVersion: storageVersion as number,
  };
}

function visitManifestFiles(files: ArchiveFile[]) {
  const map = new Map(files.map((file) => [file.path, file.bytes]));
  const manifestBytes = map.get("manifest.json");
  if (!manifestBytes) throw new Error("Plugin ZIP must contain manifest.json");
  if (manifestBytes.byteLength > 64 * 1024)
    throw new Error("Plugin manifest exceeds 64 KiB");
  let value: unknown;
  try {
    value = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(manifestBytes),
    );
  } catch {
    throw new Error("Plugin manifest must be valid UTF-8 JSON");
  }
  const manifest = validatePluginManifest(value, new Set(map.keys()));
  const entry = map.get(manifest.entry)!;
  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(entry);
  } catch {
    throw new Error("Plugin entry must be UTF-8 JavaScript");
  }
  let module: ReturnType<typeof inspectModule>;
  try {
    module = inspectModule(source);
  } catch (error) {
    throw new Error(
      `Plugin entry is invalid JavaScript: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (module.hasImports)
    throw new Error(
      "Plugin entry must be self-contained and cannot import other modules",
    );
  if (!module.hasSetup)
    throw new Error("Plugin entry must export a setup function");
  return {
    manifest,
    files: map,
    totalBytes: files.reduce((total, file) => total + file.bytes.byteLength, 0),
  };
}

export async function pluginContentDigest(files: Map<string, Uint8Array>) {
  const encoder = new TextEncoder();
  const sorted = [...files].sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
  const encoded = sorted.map(
    ([path, bytes]) => [encoder.encode(path), bytes] as const,
  );
  const length = sorted.reduce(
    (total, [, bytes], index) =>
      total + 8 + encoded[index][0].length + bytes.length,
    0,
  );
  const content = new Uint8Array(length);
  const view = new DataView(content.buffer);
  let offset = 0;
  for (const [name, bytes] of encoded) {
    view.setUint32(offset, name.length, false);
    offset += 4;
    content.set(name, offset);
    offset += name.length;
    view.setUint32(offset, bytes.length, false);
    offset += 4;
    content.set(bytes, offset);
    offset += bytes.length;
  }
  const digest = await crypto.subtle.digest("SHA-256", content);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function inspectPluginPackage(
  input: Blob,
): Promise<PluginPackage> {
  const archiveFiles = await readPluginArchive(input);
  const parsed = visitManifestFiles(archiveFiles);
  return {
    manifest: parsed.manifest,
    files: parsed.files,
    digest: await pluginContentDigest(parsed.files),
    compressedBytes: input.size,
    uncompressedBytes: parsed.totalBytes,
  };
}

export async function developmentPluginPackage(
  pkg: PluginPackage,
  sequence: number,
): Promise<PluginPackage> {
  if (!Number.isSafeInteger(sequence) || sequence < 0)
    throw new Error(
      "Development package sequence must be a non-negative integer",
    );
  const baseVersion = pkg.manifest.version.split("+", 1)[0];
  const version = `${baseVersion}+dev.${sequence.toString(36)}.${pkg.digest.slice(0, 10)}`;
  if (version.length > 100)
    throw new Error(
      "Plugin version is too long to add a development build identifier",
    );
  const files = new Map(pkg.files);
  const sourceManifest = { ...pkg.manifest, version };
  files.set(
    "manifest.json",
    new TextEncoder().encode(JSON.stringify(sourceManifest)),
  );
  const manifest = validatePluginManifest(
    sourceManifest,
    new Set(files.keys()),
  );
  return {
    ...pkg,
    manifest,
    files,
    digest: await pluginContentDigest(files),
    uncompressedBytes: [...files.values()].reduce(
      (total, bytes) => total + bytes.byteLength,
      0,
    ),
  };
}

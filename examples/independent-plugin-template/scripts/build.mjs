import { createHash } from "node:crypto";
import { readFile, readdir, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { deflateRawSync } from "node:zlib";
import { parse } from "acorn";
import { build } from "vite";

const root = path.resolve(import.meta.dirname, "..");
const output = path.join(root, "dist");
const compiled = path.join(root, ".build");
const encoder = new TextEncoder();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zip(files) {
  const locals = [];
  const central = [];
  let localOffset = 0;
  const put16 = (view, offset, value) => view.setUint16(offset, value, true);
  const put32 = (view, offset, value) =>
    view.setUint32(offset, value >>> 0, true);
  for (const file of files) {
    const name = encoder.encode(file.path);
    const content = file.bytes;
    const compressed = deflateRawSync(content, { level: 9 });
    const crc = crc32(content);
    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    put32(localView, 0, 0x04034b50);
    put16(localView, 4, 20);
    put16(localView, 6, 0x800);
    put16(localView, 8, 8);
    put32(localView, 14, crc);
    put32(localView, 18, compressed.length);
    put32(localView, 22, content.length);
    put16(localView, 26, name.length);
    local.set(name, 30);
    locals.push(local, compressed);

    const header = new Uint8Array(46 + name.length);
    const view = new DataView(header.buffer);
    put32(view, 0, 0x02014b50);
    put16(view, 4, 0x0314);
    put16(view, 6, 20);
    put16(view, 8, 0x800);
    put16(view, 10, 8);
    put32(view, 16, crc);
    put32(view, 20, compressed.length);
    put32(view, 24, content.length);
    put16(view, 28, name.length);
    put32(view, 38, 0x80000000);
    put32(view, 42, localOffset);
    header.set(name, 46);
    central.push(header);
    localOffset += local.length + compressed.length;
  }
  const centralSize = central.reduce((total, part) => total + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  put32(endView, 0, 0x06054b50);
  put16(endView, 8, files.length);
  put16(endView, 10, files.length);
  put32(endView, 12, centralSize);
  put32(endView, 16, localOffset);
  const result = new Uint8Array(localOffset + centralSize + end.length);
  let offset = 0;
  for (const part of [...locals, ...central, end]) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

async function collectAssets(directory, prefix = "") {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory())
      result.push(...(await collectAssets(absolute, relative)));
    else if (entry.isFile())
      result.push({
        path: `assets/${relative}`,
        bytes: new Uint8Array(await readFile(absolute)),
      });
    else throw new Error(`Unsupported public asset type: ${relative}`);
  }
  return result;
}

function validPath(value) {
  return (
    /^[A-Za-z0-9._/-]+$/.test(value) &&
    !value.startsWith("/") &&
    !value.includes("\\") &&
    value.split("/").every((part) => part && part !== "." && part !== "..")
  );
}

await rm(output, { recursive: true, force: true });
await build({
  configFile: path.join(root, "vite.config.ts"),
  logLevel: "warn",
});
const builtFiles = await readdir(compiled, { withFileTypes: true });
if (
  builtFiles.some(
    (file) =>
      !file.isFile() || (file.name.endsWith(".js") && file.name !== "main.js"),
  )
) {
  throw new Error(
    "Build emitted unsupported subdirectories or JavaScript chunks",
  );
}
const manifest = JSON.parse(
  await readFile(path.join(root, "plugin.manifest.json"), "utf8"),
);
if (
  manifest.formatVersion !== 1 ||
  manifest.apiVersion !== 1 ||
  manifest.runtimeVersion !== "solid-v1" ||
  !/^[a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+$/.test(manifest.id) ||
  !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/.test(
    manifest.version,
  )
) {
  throw new Error(
    "Manifest id, version, or host compatibility fields are invalid",
  );
}
const files = [
  {
    path: "manifest.json",
    bytes: encoder.encode(`${JSON.stringify(manifest, null, 2)}\n`),
  },
  {
    path: "main.js",
    bytes: new Uint8Array(await readFile(path.join(compiled, "main.js"))),
  },
  {
    path: "styles/main.css",
    bytes: new Uint8Array(await readFile(path.join(compiled, "main.css"))),
  },
  ...(await collectAssets(path.join(root, "public"))),
].sort((left, right) =>
  left.path < right.path ? -1 : left.path > right.path ? 1 : 0,
);
if (
  files.length > 1000 ||
  files.some(
    (file) => !validPath(file.path) || file.bytes.length > 20 * 1024 * 1024,
  )
) {
  throw new Error(
    "Package contains an unsafe path, too many files, or an oversized file",
  );
}
if (
  files.reduce((total, file) => total + file.bytes.length, 0) >
  50 * 1024 * 1024
) {
  throw new Error("Package expands beyond 50 MiB");
}
const declared = new Set([
  "manifest.json",
  manifest.entry,
  ...manifest.styles,
  ...manifest.assets,
]);
for (const file of files)
  if (!declared.has(file.path))
    throw new Error(`Manifest does not declare ${file.path}`);
for (const file of declared) {
  if (
    file !== "manifest.json" &&
    !files.some((candidate) => candidate.path === file)
  ) {
    throw new Error(`Manifest file is missing: ${file}`);
  }
}
const entry = new TextDecoder().decode(
  files.find((file) => file.path === "main.js").bytes,
);
const ast = parse(entry, { ecmaVersion: "latest", sourceType: "module" });
const pending = [...ast.body];
let hasSetup = false;
while (pending.length) {
  const value = pending.pop();
  if (!value || typeof value !== "object") continue;
  const node = value;
  if (
    node.type === "ImportDeclaration" ||
    node.type === "ImportExpression" ||
    node.type === "ExportAllDeclaration" ||
    (node.type === "ExportNamedDeclaration" && node.source)
  ) {
    throw new Error("Built plugin entry must not contain module imports");
  }
  if (node.type === "ExportNamedDeclaration") {
    const declaration = node.declaration;
    if (
      declaration?.type === "FunctionDeclaration" &&
      declaration.id?.name === "setup"
    ) {
      hasSetup = true;
    }
    if (declaration?.type === "VariableDeclaration") {
      hasSetup ||= declaration.declarations.some(
        (item) => item.id?.name === "setup",
      );
    }
    hasSetup ||=
      node.specifiers?.some((item) => item.exported?.name === "setup") ?? false;
  }
  for (const child of Object.values(node)) {
    if (Array.isArray(child)) pending.push(...child);
    else if (child && typeof child === "object") pending.push(child);
  }
}
if (!hasSetup) {
  throw new Error("Built plugin entry must export its setup function");
}
await mkdir(output, { recursive: true });
const archive = zip(files);
if (archive.byteLength > 20 * 1024 * 1024) {
  throw new Error("ZIP package exceeds 20 MiB");
}
const digest = createHash("sha256").update(archive).digest("hex");
const archivePath = path.join(output, `${manifest.id}-${manifest.version}.zip`);
await writeFile(archivePath, archive);
console.log(`Built ${archivePath} (${archive.length} bytes, sha256 ${digest})`);

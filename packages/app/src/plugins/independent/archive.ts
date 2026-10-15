export const PLUGIN_ARCHIVE_LIMITS = Object.freeze({
  compressedBytes: 20 * 1024 * 1024,
  uncompressedBytes: 50 * 1024 * 1024,
  entryBytes: 20 * 1024 * 1024,
  files: 1000,
});

export type ArchiveFile = { path: string; bytes: Uint8Array };

const LOCAL_HEADER = 0x04034b50;
const CENTRAL_HEADER = 0x02014b50;
const END_OF_CENTRAL = 0x06054b50;
const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++)
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pathIsSafe(path: string) {
  if (
    !path ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.includes("\0") ||
    path.includes(":")
  )
    return false;
  if (!/^[A-Za-z0-9._/-]+$/.test(path)) return false;
  const parts = path.replace(/\/$/, "").split("/");
  return parts.every((part) => !!part && part !== "." && part !== "..");
}

async function inflate(
  bytes: Uint8Array,
  method: number,
  expectedSize: number,
  path: string,
) {
  if (method === 0) {
    if (bytes.byteLength !== expectedSize)
      throw new Error(`Invalid stored entry size: ${path}`);
    return bytes;
  }
  if (method !== 8)
    throw new Error(`Unsupported ZIP compression method for ${path}`);
  if (typeof DecompressionStream === "undefined")
    throw new Error("This browser cannot open deflate ZIP packages");
  let decompressor: DecompressionStream;
  try {
    decompressor = new DecompressionStream("deflate-raw");
  } catch {
    throw new Error("This browser cannot open deflate ZIP packages");
  }
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const stream = new Blob([buffer]).stream().pipeThrough(decompressor);
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > expectedSize || length > PLUGIN_ARCHIVE_LIMITS.entryBytes) {
      await reader.cancel();
      throw new Error(`ZIP entry expanded beyond its declared size: ${path}`);
    }
    chunks.push(value);
  }
  if (length !== expectedSize)
    throw new Error(`Invalid expanded size: ${path}`);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

export async function readPluginArchive(input: Blob): Promise<ArchiveFile[]> {
  if (input.size < 22 || input.size > PLUGIN_ARCHIVE_LIMITS.compressedBytes) {
    throw new Error("Plugin ZIP must be between 22 bytes and 20 MiB");
  }
  const bytes = new Uint8Array(await input.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minEnd = Math.max(0, bytes.length - 22 - 0xffff);
  let end = -1;
  for (let offset = bytes.length - 22; offset >= minEnd; offset--) {
    if (
      view.getUint32(offset, true) === END_OF_CENTRAL &&
      offset + 22 + view.getUint16(offset + 20, true) === bytes.length
    ) {
      end = offset;
      break;
    }
  }
  if (end < 0) throw new Error("Invalid ZIP: end record not found");
  const disk = view.getUint16(end + 4, true);
  const centralDisk = view.getUint16(end + 6, true);
  const diskEntries = view.getUint16(end + 8, true);
  const entries = view.getUint16(end + 10, true);
  const centralSize = view.getUint32(end + 12, true);
  const centralOffset = view.getUint32(end + 16, true);
  if (
    disk ||
    centralDisk ||
    diskEntries !== entries ||
    entries === 0xffff ||
    centralOffset === 0xffffffff
  ) {
    throw new Error("Multi-disk and ZIP64 packages are not supported");
  }
  if (entries > PLUGIN_ARCHIVE_LIMITS.files)
    throw new Error("Plugin ZIP contains more than 1,000 entries");
  if (centralOffset + centralSize !== end)
    throw new Error("Invalid ZIP central directory bounds");

  const decoder = new TextDecoder("utf-8", { fatal: true });
  const seen = new Set<string>();
  const records: Array<{
    path: string;
    flags: number;
    method: number;
    crc: number;
    compressedSize: number;
    size: number;
    localOffset: number;
    directory: boolean;
  }> = [];
  let offset = centralOffset;
  let totalSize = 0;
  for (let index = 0; index < entries; index++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== CENTRAL_HEADER)
      throw new Error("Invalid ZIP central directory");
    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const crc = view.getUint32(offset + 16, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const size = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const startDisk = view.getUint16(offset + 34, true);
    const externalAttributes = view.getUint32(offset + 38, true);
    const localOffset = view.getUint32(offset + 42, true);
    const recordEnd = offset + 46 + nameLength + extraLength + commentLength;
    if (
      recordEnd > end ||
      startDisk ||
      compressedSize === 0xffffffff ||
      size === 0xffffffff ||
      localOffset === 0xffffffff
    ) {
      throw new Error("Multi-disk and ZIP64 entries are not supported");
    }
    const nameBytes = bytes.subarray(offset + 46, offset + 46 + nameLength);
    let path: string;
    try {
      path = decoder.decode(nameBytes);
    } catch {
      throw new Error("Plugin ZIP paths must be valid UTF-8");
    }
    const directory = path.endsWith("/");
    const normalized = directory ? path.slice(0, -1) : path;
    if (!pathIsSafe(normalized))
      throw new Error(`Unsafe path in plugin ZIP: ${path}`);
    const key = normalized.toLowerCase();
    if (seen.has(key))
      throw new Error(`Duplicate or case-conflicting ZIP path: ${path}`);
    seen.add(key);
    const unixType = (externalAttributes >>> 16) & 0xf000;
    if (unixType && unixType !== 0x8000 && unixType !== 0x4000)
      throw new Error(`Special files are not allowed: ${path}`);
    if (flags & 0x1 || flags & 0x40 || flags & 0x8 || flags & ~0x800) {
      throw new Error(
        `Encrypted and streaming ZIP entries are not supported: ${path}`,
      );
    }
    if (directory && (size !== 0 || compressedSize !== 0 || method !== 0)) {
      throw new Error(`ZIP directory entries cannot contain data: ${path}`);
    }
    if (size > PLUGIN_ARCHIVE_LIMITS.entryBytes)
      throw new Error(`ZIP entry exceeds 20 MiB: ${path}`);
    totalSize += size;
    if (totalSize > PLUGIN_ARCHIVE_LIMITS.uncompressedBytes)
      throw new Error("Plugin ZIP expands beyond 50 MiB");
    records.push({
      path: normalized,
      flags,
      method,
      crc,
      compressedSize,
      size,
      localOffset,
      directory,
    });
    offset = recordEnd;
  }
  if (offset !== end)
    throw new Error("Unexpected data in ZIP central directory");

  const files: ArchiveFile[] = [];
  const ranges: Array<{ start: number; end: number }> = [];
  for (const record of records) {
    const local = record.localOffset;
    if (
      local + 30 > centralOffset ||
      view.getUint32(local, true) !== LOCAL_HEADER
    ) {
      throw new Error(`Invalid local ZIP header: ${record.path}`);
    }
    const flags = view.getUint16(local + 6, true);
    const method = view.getUint16(local + 8, true);
    const nameLength = view.getUint16(local + 26, true);
    const extraLength = view.getUint16(local + 28, true);
    const localEnd = local + 30 + nameLength + extraLength;
    const dataEnd = localEnd + record.compressedSize;
    if (
      flags !== record.flags ||
      method !== record.method ||
      dataEnd > centralOffset
    ) {
      throw new Error(`Inconsistent local ZIP entry: ${record.path}`);
    }
    if (
      view.getUint32(local + 14, true) !== record.crc ||
      view.getUint32(local + 18, true) !== record.compressedSize ||
      view.getUint32(local + 22, true) !== record.size
    ) {
      throw new Error(`Inconsistent local ZIP metadata: ${record.path}`);
    }
    let localPath: string;
    try {
      localPath = decoder.decode(
        bytes.subarray(local + 30, local + 30 + nameLength),
      );
    } catch {
      throw new Error(`Invalid local ZIP path: ${record.path}`);
    }
    if (localPath.replace(/\/$/, "") !== record.path)
      throw new Error(`Mismatched local ZIP path: ${record.path}`);
    ranges.push({ start: local, end: dataEnd });
    if (record.directory) continue;
    const content = await inflate(
      bytes.subarray(localEnd, dataEnd),
      record.method,
      record.size,
      record.path,
    );
    if (crc32(content) !== record.crc)
      throw new Error(`ZIP checksum mismatch: ${record.path}`);
    files.push({ path: record.path, bytes: content });
  }
  ranges.sort((left, right) => left.start - right.start);
  let expectedOffset = 0;
  for (const range of ranges) {
    if (range.start !== expectedOffset || range.end < range.start)
      throw new Error("ZIP local entries overlap or contain gaps");
    expectedOffset = range.end;
  }
  if (expectedOffset !== centralOffset)
    throw new Error("Unexpected data before ZIP central directory");
  return files;
}

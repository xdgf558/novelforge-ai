export type StoredZipTextFile = {
  content: string;
  path: string;
};

type StoredZipEntry = {
  content: Uint8Array;
  crc: number;
  localHeaderOffset: number;
  name: Uint8Array;
  size: number;
};

const textEncoder = new TextEncoder();
const zipStoreMethod = 0;
const zipUtf8Flag = 0x0800;

export function createStoredTextZip(files: readonly StoredZipTextFile[]) {
  if (files.length === 0) {
    throw new Error("ZIP must contain at least one file.");
  }

  const seenPaths = new Set<string>();
  const localParts: Uint8Array[] = [];
  const entries: StoredZipEntry[] = [];
  let offset = 0;

  for (const file of files) {
    const archivePath = normalizeArchivePath(file.path);

    if (seenPaths.has(archivePath)) {
      throw new Error(`Duplicate ZIP file path: ${archivePath}`);
    }

    seenPaths.add(archivePath);

    const name = textEncoder.encode(archivePath);
    const content = textEncoder.encode(file.content);
    const crc = crc32(content);
    const size = content.byteLength;

    assertZipUInt16(name.byteLength, "ZIP file path");
    assertZipUInt32(size, "ZIP file content");

    const localHeader = buildLocalHeader({
      crc,
      name,
      size,
    });

    localParts.push(localHeader, content);
    entries.push({
      content,
      crc,
      localHeaderOffset: offset,
      name,
      size,
    });
    offset += localHeader.byteLength + content.byteLength;
  }

  const centralDirectoryOffset = offset;
  const centralParts = entries.map((entry) => buildCentralDirectoryHeader(entry));
  const centralDirectorySize = centralParts.reduce(
    (sum, part) => sum + part.byteLength,
    0,
  );

  assertZipUInt16(entries.length, "ZIP entry count");
  assertZipUInt32(centralDirectoryOffset, "ZIP central directory offset");
  assertZipUInt32(centralDirectorySize, "ZIP central directory size");

  const end = buildEndOfCentralDirectory({
    centralDirectoryOffset,
    centralDirectorySize,
    entryCount: entries.length,
  });

  return concatUint8Arrays([...localParts, ...centralParts, end]);
}

function normalizeArchivePath(value: string) {
  const normalized = value.replace(/\\/g, "/");

  if (normalized.startsWith("/")) {
    throw new Error("ZIP file path must be relative.");
  }

  const parts = normalized.split("/").filter((part) => part && part !== ".");

  if (parts.some((part) => part === "..")) {
    throw new Error("ZIP file path must not contain parent traversal.");
  }

  const archivePath = parts.join("/");

  if (!archivePath) {
    throw new Error("ZIP file path is empty.");
  }

  return archivePath;
}

function buildLocalHeader({
  crc,
  name,
  size,
}: {
  crc: number;
  name: Uint8Array;
  size: number;
}) {
  const header = new Uint8Array(30);
  const view = new DataView(header.buffer);

  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, zipUtf8Flag, true);
  view.setUint16(8, zipStoreMethod, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, size, true);
  view.setUint32(22, size, true);
  view.setUint16(26, name.byteLength, true);
  view.setUint16(28, 0, true);

  return concatUint8Arrays([header, name]);
}

function buildCentralDirectoryHeader(entry: StoredZipEntry) {
  const header = new Uint8Array(46);
  const view = new DataView(header.buffer);

  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, zipUtf8Flag, true);
  view.setUint16(10, zipStoreMethod, true);
  view.setUint16(12, 0, true);
  view.setUint16(14, 0, true);
  view.setUint32(16, entry.crc, true);
  view.setUint32(20, entry.size, true);
  view.setUint32(24, entry.size, true);
  view.setUint16(28, entry.name.byteLength, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, entry.localHeaderOffset, true);

  return concatUint8Arrays([header, entry.name]);
}

function buildEndOfCentralDirectory({
  centralDirectoryOffset,
  centralDirectorySize,
  entryCount,
}: {
  centralDirectoryOffset: number;
  centralDirectorySize: number;
  entryCount: number;
}) {
  const end = new Uint8Array(22);
  const view = new DataView(end.buffer);

  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, centralDirectorySize, true);
  view.setUint32(16, centralDirectoryOffset, true);
  view.setUint16(20, 0, true);

  return end;
}

function concatUint8Arrays(parts: readonly Uint8Array[]) {
  const totalLength = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }

  return result;
}

function assertZipUInt16(value: number, label: string) {
  if (value > 0xffff) {
    throw new Error(`${label} exceeds ZIP64-free limit.`);
  }
}

function assertZipUInt32(value: number, label: string) {
  if (value > 0xffffffff) {
    throw new Error(`${label} exceeds ZIP64-free limit.`);
  }
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let current = index;

  for (let bit = 0; bit < 8; bit += 1) {
    current = current & 1 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
  }

  return current >>> 0;
});

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

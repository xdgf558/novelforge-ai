import { describe, expect, it } from "vitest";
import { createStoredTextZip } from "./stored-zip";

describe("createStoredTextZip", () => {
  it("creates a readable UTF-8 stored zip archive", () => {
    const archive = createStoredTextZip([
      {
        content: "# 离线未来 番茄版拆分清单",
        path: "拆分清单.md",
      },
      {
        content: "陈远把目录放在桌上。",
        path: "第007章-断供.txt",
      },
    ]);
    const entries = readStoredZipEntries(archive);

    expect(Buffer.from(archive.subarray(0, 4)).toString("hex")).toBe("504b0304");
    expect(entries.get("拆分清单.md")).toBe("# 离线未来 番茄版拆分清单");
    expect(entries.get("第007章-断供.txt")).toBe("陈远把目录放在桌上。");
  });

  it("rejects unsafe or duplicate archive paths", () => {
    expect(() =>
      createStoredTextZip([
        {
          content: "x",
          path: "../bad.txt",
        },
      ]),
    ).toThrow("parent traversal");

    expect(() =>
      createStoredTextZip([
        {
          content: "x",
          path: "same.txt",
        },
        {
          content: "y",
          path: "same.txt",
        },
      ]),
    ).toThrow("Duplicate ZIP file path");
  });
});

function readStoredZipEntries(archiveBytes: Uint8Array) {
  const archive = Buffer.from(archiveBytes);
  const endOffset = findEndOfCentralDirectory(archive);
  const entryCount = archive.readUInt16LE(endOffset + 10);
  const centralDirectoryOffset = archive.readUInt32LE(endOffset + 16);
  const entries = new Map<string, string>();
  let cursor = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    expect(archive.readUInt32LE(cursor)).toBe(0x02014b50);

    const flags = archive.readUInt16LE(cursor + 8);
    const method = archive.readUInt16LE(cursor + 10);
    const compressedSize = archive.readUInt32LE(cursor + 20);
    const uncompressedSize = archive.readUInt32LE(cursor + 24);
    const fileNameLength = archive.readUInt16LE(cursor + 28);
    const extraLength = archive.readUInt16LE(cursor + 30);
    const commentLength = archive.readUInt16LE(cursor + 32);
    const localHeaderOffset = archive.readUInt32LE(cursor + 42);
    const archivePath = archive
      .subarray(cursor + 46, cursor + 46 + fileNameLength)
      .toString("utf8");

    expect(flags & 0x0800).toBe(0x0800);
    expect(method).toBe(0);
    expect(compressedSize).toBe(uncompressedSize);
    expect(archive.readUInt32LE(localHeaderOffset)).toBe(0x04034b50);

    const localFileNameLength = archive.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = archive.readUInt16LE(localHeaderOffset + 28);
    const dataOffset =
      localHeaderOffset + 30 + localFileNameLength + localExtraLength;
    const content = archive.subarray(dataOffset, dataOffset + uncompressedSize);

    entries.set(archivePath, content.toString("utf8"));
    cursor += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function findEndOfCentralDirectory(archive: Buffer) {
  for (let offset = archive.length - 22; offset >= 0; offset -= 1) {
    if (archive.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }

  throw new Error("ZIP end of central directory not found.");
}

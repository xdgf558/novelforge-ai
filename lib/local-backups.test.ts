import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  executeRawUnsafe: vi.fn(async (query: string) => {
    const match = query.match(/VACUUM INTO '((?:''|[^'])+)'/);
    const databasePath = process.env.NOVELFORGE_TEST_DATABASE_PATH;

    if (!match || !databasePath) {
      throw new Error("Unexpected SQLite snapshot query in local backup test.");
    }

    const snapshotPath = match[1].replace(/''/g, "'");
    const fsPromises = await import("node:fs/promises");

    await fsPromises.copyFile(databasePath, snapshotPath);
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $executeRawUnsafe: prismaMock.executeRawUnsafe,
  },
}));

import { createLocalBackup, listLocalBackups } from "./local-backups";

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalDesktopDataDir = process.env.NOVELFORGE_DESKTOP_DATA_DIR;
const originalTestDatabasePath = process.env.NOVELFORGE_TEST_DATABASE_PATH;
let tempRoot: string | null = null;

beforeEach(() => {
  prismaMock.executeRawUnsafe.mockClear();
});

afterEach(async () => {
  restoreEnv("DATABASE_URL", originalDatabaseUrl);
  restoreEnv("NOVELFORGE_DESKTOP_DATA_DIR", originalDesktopDataDir);
  restoreEnv("NOVELFORGE_TEST_DATABASE_PATH", originalTestDatabasePath);

  if (tempRoot) {
    await fs.rm(tempRoot, { force: true, recursive: true });
    tempRoot = null;
  }
});

function restoreEnv(key: string, value: string | undefined) {
  if (value == null) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

describe("local backups", () => {
  it("creates a zip backup from a SQLite snapshot and asset roots", async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "novelforge-backup-"));
    const databasePath = path.join(tempRoot, "dev.db");
    const assetPath = path.join(tempRoot, "assets", "covers", "cover.png");

    await fs.writeFile(databasePath, "sqlite test database");
    await fs.writeFile(`${databasePath}-wal`, "stale wal should not be copied");
    await fs.writeFile(`${databasePath}-shm`, "stale shm should not be copied");
    await fs.mkdir(path.dirname(assetPath), { recursive: true });
    await fs.writeFile(assetPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    process.env.DATABASE_URL = `file:${databasePath}`;
    process.env.NOVELFORGE_DESKTOP_DATA_DIR = tempRoot;
    process.env.NOVELFORGE_TEST_DATABASE_PATH = databasePath;

    const backup = await createLocalBackup();
    const archive = await fs.readFile(backup.absolutePath);
    const backups = await listLocalBackups();
    const zipEntries = readStoredZipEntries(archive);

    expect(prismaMock.executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("VACUUM INTO"),
    );
    expect(backup.fileName).toMatch(/^NovelForge-Backup-.*\.zip$/);
    expect(backup.includedFiles).toBeGreaterThanOrEqual(3);
    expect(archive.subarray(0, 4).toString("hex")).toBe("504b0304");
    expect(zipEntries.get("manifest.json")?.toString("utf8")).toContain(
      '"databaseSnapshot": "database/novelforge.sqlite"',
    );
    expect(zipEntries.get("database/novelforge.sqlite")?.toString("utf8")).toBe(
      "sqlite test database",
    );
    expect(zipEntries.get("assets/covers/cover.png")).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    );
    expect(zipEntries.has("database/dev.db-wal")).toBe(false);
    expect(zipEntries.has("database/dev.db-shm")).toBe(false);
    expect(backups.map((entry) => entry.fileName)).toContain(backup.fileName);
  });

  it("creates a valid backup when many asset files are present", async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "novelforge-backup-many-"));
    const databasePath = path.join(tempRoot, "dev.db");
    const assetDir = path.join(tempRoot, "assets", "cover-candidates", "project", "task");

    await fs.writeFile(databasePath, "sqlite test database");
    await fs.mkdir(assetDir, { recursive: true });

    for (let index = 0; index < 120; index += 1) {
      await fs.writeFile(
        path.join(assetDir, `candidate-${String(index).padStart(3, "0")}.png`),
        Buffer.from([0x89, 0x50, 0x4e, 0x47, index % 255]),
      );
    }

    process.env.DATABASE_URL = `file:${databasePath}`;
    process.env.NOVELFORGE_DESKTOP_DATA_DIR = tempRoot;
    process.env.NOVELFORGE_TEST_DATABASE_PATH = databasePath;

    const backup = await createLocalBackup();
    const archive = await fs.readFile(backup.absolutePath);
    const zipEntries = readStoredZipEntries(archive);

    expect(backup.includedFiles).toBe(122);
    expect(archive.subarray(0, 4).toString("hex")).toBe("504b0304");
    expect(
      zipEntries.get("assets/cover-candidates/project/task/candidate-119.png"),
    ).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 119]));
  });
});

function readStoredZipEntries(archive: Buffer) {
  const endOffset = findEndOfCentralDirectory(archive);
  const entryCount = archive.readUInt16LE(endOffset + 10);
  const centralDirectoryOffset = archive.readUInt32LE(endOffset + 16);
  const entries = new Map<string, Buffer>();
  let cursor = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    expect(archive.readUInt32LE(cursor)).toBe(0x02014b50);

    const flags = archive.readUInt16LE(cursor + 8);
    const method = archive.readUInt16LE(cursor + 10);
    const expectedCrc = archive.readUInt32LE(cursor + 16);
    const compressedSize = archive.readUInt32LE(cursor + 20);
    const uncompressedSize = archive.readUInt32LE(cursor + 24);
    const fileNameLength = archive.readUInt16LE(cursor + 28);
    const extraLength = archive.readUInt16LE(cursor + 30);
    const commentLength = archive.readUInt16LE(cursor + 32);
    const localHeaderOffset = archive.readUInt32LE(cursor + 42);
    const archivePath = archive
      .subarray(cursor + 46, cursor + 46 + fileNameLength)
      .toString("utf8");

    expect(flags & 0x0808).toBe(0x0808);
    expect(method).toBe(0);
    expect(compressedSize).toBe(uncompressedSize);
    expect(archive.readUInt32LE(localHeaderOffset)).toBe(0x04034b50);

    const localFileNameLength = archive.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = archive.readUInt16LE(localHeaderOffset + 28);
    const dataOffset =
      localHeaderOffset + 30 + localFileNameLength + localExtraLength;
    const content = archive.subarray(dataOffset, dataOffset + uncompressedSize);
    const descriptorOffset = dataOffset + uncompressedSize;

    expect(archive.readUInt32LE(descriptorOffset)).toBe(0x08074b50);
    expect(archive.readUInt32LE(descriptorOffset + 4)).toBe(expectedCrc);
    expect(archive.readUInt32LE(descriptorOffset + 8)).toBe(uncompressedSize);
    expect(archive.readUInt32LE(descriptorOffset + 12)).toBe(uncompressedSize);
    expect(crc32(content)).toBe(expectedCrc);

    entries.set(archivePath, content);
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

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let current = index;

  for (let bit = 0; bit < 8; bit += 1) {
    current = current & 1 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
  }

  return current >>> 0;
});

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

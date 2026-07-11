import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import type { WriteStream } from "node:fs";
import os from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { appVersion } from "@/lib/app-version";
import { getAudioAssetRoot } from "@/lib/audio/audio-assets";
import { getProjectCoverAssetRoot } from "@/lib/project-cover-assets";
import { prisma } from "@/lib/prisma";

export type LocalBackupResult = {
  absolutePath: string;
  fileName: string;
  sizeBytes: number;
  createdAt: Date;
  includedFiles: number;
};

type FileZipEntryInput = {
  archivePath: string;
  sourcePath: string;
};

type BufferZipEntryInput = {
  archivePath: string;
  buffer: Buffer;
};

type ZipEntryInput = FileZipEntryInput | BufferZipEntryInput;

type WrittenZipEntry = {
  crc: number;
  fileName: Buffer;
  localHeaderOffset: number;
  size: number;
};

type WrittenZipEntryContent = {
  crc: number;
  size: number;
};

type DatabaseSnapshot = {
  originalDatabasePath: string;
  snapshotPath: string;
  tempDir: string;
};

const backupRootName = "backups";
const zipDataDescriptorFlag = 0x0008;
const zipStoreMethod = 0;
const zipUtf8Flag = 0x0800;
const zipGeneralPurposeFlag = zipUtf8Flag | zipDataDescriptorFlag;
const maxZip32Value = 0xffffffff;
const maxZipEntryCount = 0xffff;

export function getLocalBackupRoot() {
  const desktopDataDir = process.env.NOVELFORGE_DESKTOP_DATA_DIR?.trim();

  if (desktopDataDir) {
    return path.join(desktopDataDir, backupRootName);
  }

  if (process.platform === "darwin" && process.env.NOVELFORGE_DESKTOP === "1") {
    return path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "NovelForge AI",
      backupRootName,
    );
  }

  return path.join(process.cwd(), ".novelforge-backups");
}

export async function createLocalBackup(): Promise<LocalBackupResult> {
  const createdAt = new Date();
  const backupRoot = getLocalBackupRoot();
  const fileName = `NovelForge-Backup-${formatBackupTimestamp(createdAt)}-${randomUUID().slice(0, 8)}.zip`;
  const absolutePath = path.join(backupRoot, fileName);

  await fs.promises.mkdir(backupRoot, { recursive: true, mode: 0o700 });
  await fs.promises.chmod(backupRoot, 0o700);

  const databaseSnapshot = await createDatabaseSnapshot();

  try {
    const entries = await collectBackupEntries(createdAt, databaseSnapshot);

    await createStreamingZipArchive(entries, absolutePath);
    await fs.promises.chmod(absolutePath, 0o600);

    const stats = await fs.promises.stat(absolutePath);

    return {
      absolutePath,
      fileName,
      sizeBytes: stats.size,
      createdAt,
      includedFiles: entries.length,
    };
  } catch (error) {
    await fs.promises.rm(absolutePath, { force: true });
    throw error;
  } finally {
    await fs.promises.rm(databaseSnapshot.tempDir, {
      force: true,
      recursive: true,
    });
  }
}

export async function listLocalBackups() {
  try {
    const backupRoot = getLocalBackupRoot();
    const entries = await fs.promises.readdir(backupRoot, {
      withFileTypes: true,
    });
    const backups = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".zip"))
        .map(async (entry) => {
          const absolutePath = path.join(backupRoot, entry.name);
          const stats = await fs.promises.stat(absolutePath);

          return {
            absolutePath,
            fileName: entry.name,
            sizeBytes: stats.size,
            updatedAt: stats.mtime,
          };
        }),
    );

    return backups.sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function collectBackupEntries(
  createdAt: Date,
  databaseSnapshot: DatabaseSnapshot,
): Promise<ZipEntryInput[]> {
  const entries: ZipEntryInput[] = [];
  const assetRoots = await collectAssetRoots();
  const databaseArchivePath = "database/novelforge.sqlite";
  const manifest = {
    appVersion,
    createdAt: createdAt.toISOString(),
    databaseSnapshot: databaseArchivePath,
    originalDatabaseFile: path.basename(databaseSnapshot.originalDatabasePath),
    assetRoots: assetRoots.map((root) => root.archivePrefix),
    note: "This backup contains a transactional SQLite snapshot and generated local assets. Local API keys and integration tokens are intentionally excluded.",
  };

  entries.push({
    archivePath: "manifest.json",
    buffer: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
  });
  entries.push({
    archivePath: databaseArchivePath,
    sourcePath: databaseSnapshot.snapshotPath,
  });

  for (const root of assetRoots) {
    await addDirectoryEntries(entries, root.absolutePath, root.archivePrefix);
  }

  return entries;
}

async function createDatabaseSnapshot(): Promise<DatabaseSnapshot> {
  const databasePath = resolveDatabasePath();

  try {
    const stats = await fs.promises.stat(databasePath);

    if (!stats.isFile()) {
      throw new Error("当前 DATABASE_URL 指向的路径不是 SQLite 数据库文件。");
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error("未找到本地 SQLite 数据库文件，无法创建备份。");
    }

    throw error;
  }

  const tempDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "novelforge-db-snapshot-"),
  );
  const snapshotPath = path.join(tempDir, "novelforge.sqlite");

  try {
    await prisma.$executeRawUnsafe(
      `VACUUM INTO '${escapeSqliteString(snapshotPath)}'`,
    );
    await sanitizeDatabaseSnapshot(snapshotPath);
    await fs.promises.chmod(snapshotPath, 0o600);
  } catch (error) {
    await fs.promises.rm(tempDir, { force: true, recursive: true });
    throw new Error(`创建 SQLite 备份快照失败：${errorMessage(error)}`);
  }

  return {
    originalDatabasePath: databasePath,
    snapshotPath,
    tempDir,
  };
}

async function sanitizeDatabaseSnapshot(snapshotPath: string) {
  const snapshotPrisma = new PrismaClient({
    datasourceUrl: `file:${snapshotPath}`,
  });

  try {
    await snapshotPrisma.publishTarget.updateMany({
      where: {
        OR: [
          {
            tokenSecret: {
              not: null,
            },
          },
          {
            tokenUpdatedAt: {
              not: null,
            },
          },
        ],
      },
      data: {
        tokenSecret: null,
        tokenUpdatedAt: null,
      },
    });
  } finally {
    await snapshotPrisma.$disconnect();
  }
}

async function collectAssetRoots() {
  const roots = [
    {
      absolutePath: getProjectCoverAssetRoot(),
      archivePrefix: "assets",
    },
    {
      absolutePath: getAudioAssetRoot(),
      archivePrefix: "exports/audio",
    },
  ];
  const uniqueRoots = new Map<string, { absolutePath: string; archivePrefix: string }>();

  for (const root of roots) {
    const absolutePath = path.resolve(root.absolutePath);

    try {
      const stats = await fs.promises.stat(absolutePath);

      if (!stats.isDirectory()) {
        continue;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }

      throw error;
    }

    if (!uniqueRoots.has(absolutePath)) {
      uniqueRoots.set(absolutePath, {
        ...root,
        absolutePath,
      });
    }
  }

  return [...uniqueRoots.values()];
}

async function addDirectoryEntries(
  entries: ZipEntryInput[],
  root: string,
  archivePrefix: string,
) {
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop()!;
    const children = await fs.promises.readdir(current, {
      withFileTypes: true,
    });

    for (const child of children) {
      const absolutePath = path.join(current, child.name);

      if (child.isDirectory()) {
        stack.push(absolutePath);
        continue;
      }

      if (!child.isFile()) {
        continue;
      }

      const relativePath = path.relative(root, absolutePath).split(path.sep).join("/");
      entries.push({
        archivePath: path.posix.join(archivePrefix, relativePath),
        sourcePath: absolutePath,
      });
    }
  }
}

function resolveDatabasePath() {
  const databaseUrl = process.env.DATABASE_URL?.trim() || "file:./prisma/dev.db";

  if (!databaseUrl.startsWith("file:")) {
    throw new Error("当前 DATABASE_URL 不是本地 SQLite file: 路径，无法创建本地备份。");
  }

  const withoutScheme = databaseUrl.slice("file:".length).split("?")[0];
  const decoded = decodeURIComponent(withoutScheme);

  return path.resolve(process.cwd(), decoded);
}

async function createStreamingZipArchive(
  entries: readonly ZipEntryInput[],
  absolutePath: string,
) {
  if (entries.length > maxZipEntryCount) {
    throw new Error(
      `备份文件数量超过 ZIP 限制（${maxZipEntryCount} 个），请先清理旧资产或使用系统文件夹备份。`,
    );
  }

  const stream = fs.createWriteStream(absolutePath, { mode: 0o600 });
  const writtenEntries: WrittenZipEntry[] = [];
  let offset = 0;

  try {
    for (const entry of entries) {
      const fileName = zipEntryFileName(entry);

      assertZip32Value(offset, "ZIP 偏移量");

      const localHeader = buildLocalHeader(fileName);
      const localHeaderOffset = offset;

      await writeBuffer(stream, localHeader);
      await writeBuffer(stream, fileName);

      const writtenContent = await writeZipEntryContent(stream, entry);
      const dataDescriptor = buildDataDescriptor(writtenContent);

      await writeBuffer(stream, dataDescriptor);

      offset +=
        localHeader.length +
        fileName.length +
        writtenContent.size +
        dataDescriptor.length;
      writtenEntries.push({
        crc: writtenContent.crc,
        fileName,
        localHeaderOffset,
        size: writtenContent.size,
      });
    }

    const centralDirectoryOffset = offset;
    let centralDirectorySize = 0;

    for (const entry of writtenEntries) {
      const centralHeader = buildCentralDirectoryHeader(entry);

      await writeBuffer(stream, centralHeader);
      await writeBuffer(stream, entry.fileName);
      centralDirectorySize += centralHeader.length + entry.fileName.length;
    }

    assertZip32Value(centralDirectoryOffset, "ZIP 中央目录偏移量");
    assertZip32Value(centralDirectorySize, "ZIP 中央目录大小");

    await writeBuffer(
      stream,
      buildEndOfCentralDirectory({
        centralDirectoryOffset,
        centralDirectorySize,
        entryCount: writtenEntries.length,
      }),
    );
    await finishWriteStream(stream);
  } catch (error) {
    stream.destroy();
    throw error;
  }
}

function zipEntryFileName(entry: ZipEntryInput) {
  const fileName = Buffer.from(normalizeArchivePath(entry.archivePath), "utf8");

  if (fileName.length === 0) {
    throw new Error("备份条目的 ZIP 路径为空。");
  }

  if (fileName.length > maxZipEntryCount) {
    throw new Error("备份条目的 ZIP 路径过长。");
  }

  return fileName;
}

function buildLocalHeader(fileName: Buffer) {
  const localHeader = Buffer.alloc(30);

  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(zipGeneralPurposeFlag, 6);
  localHeader.writeUInt16LE(zipStoreMethod, 8);
  localHeader.writeUInt16LE(0, 10);
  localHeader.writeUInt16LE(0, 12);
  localHeader.writeUInt32LE(0, 14);
  localHeader.writeUInt32LE(0, 18);
  localHeader.writeUInt32LE(0, 22);
  localHeader.writeUInt16LE(fileName.length, 26);
  localHeader.writeUInt16LE(0, 28);

  return localHeader;
}

function buildCentralDirectoryHeader(entry: WrittenZipEntry) {
  const centralHeader = Buffer.alloc(46);

  centralHeader.writeUInt32LE(0x02014b50, 0);
  centralHeader.writeUInt16LE(20, 4);
  centralHeader.writeUInt16LE(20, 6);
  centralHeader.writeUInt16LE(zipGeneralPurposeFlag, 8);
  centralHeader.writeUInt16LE(zipStoreMethod, 10);
  centralHeader.writeUInt16LE(0, 12);
  centralHeader.writeUInt16LE(0, 14);
  centralHeader.writeUInt32LE(entry.crc, 16);
  centralHeader.writeUInt32LE(entry.size, 20);
  centralHeader.writeUInt32LE(entry.size, 24);
  centralHeader.writeUInt16LE(entry.fileName.length, 28);
  centralHeader.writeUInt16LE(0, 30);
  centralHeader.writeUInt16LE(0, 32);
  centralHeader.writeUInt16LE(0, 34);
  centralHeader.writeUInt16LE(0, 36);
  centralHeader.writeUInt32LE(0, 38);
  centralHeader.writeUInt32LE(entry.localHeaderOffset, 42);

  return centralHeader;
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
  const end = Buffer.alloc(22);

  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entryCount, 8);
  end.writeUInt16LE(entryCount, 10);
  end.writeUInt32LE(centralDirectorySize, 12);
  end.writeUInt32LE(centralDirectoryOffset, 16);
  end.writeUInt16LE(0, 20);

  return end;
}

function buildDataDescriptor(entry: WrittenZipEntryContent) {
  const dataDescriptor = Buffer.alloc(16);

  dataDescriptor.writeUInt32LE(0x08074b50, 0);
  dataDescriptor.writeUInt32LE(entry.crc, 4);
  dataDescriptor.writeUInt32LE(entry.size, 8);
  dataDescriptor.writeUInt32LE(entry.size, 12);

  return dataDescriptor;
}

async function writeZipEntryContent(
  stream: WriteStream,
  entry: ZipEntryInput,
): Promise<WrittenZipEntryContent> {
  let crc = 0xffffffff;
  let size = 0;

  const writeChunk = async (buffer: Buffer) => {
    const nextSize = size + buffer.length;

    if (nextSize > maxZip32Value) {
      throw new Error("单个备份文件超过 ZIP32 支持的大小，请使用系统文件夹备份。");
    }

    crc = crc32Update(crc, buffer);
    size = nextSize;
    await writeBuffer(stream, buffer);
  };

  if ("buffer" in entry) {
    await writeChunk(entry.buffer);
    return {
      crc: crc32Finalize(crc),
      size,
    };
  }

  for await (const chunk of fs.createReadStream(entry.sourcePath)) {
    await writeChunk(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return {
    crc: crc32Finalize(crc),
    size,
  };
}

async function writeBuffer(stream: WriteStream, buffer: Buffer) {
  if (buffer.length === 0) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    stream.write(buffer, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function finishWriteStream(stream: WriteStream) {
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      stream.off("error", handleError);
      stream.off("finish", handleFinish);
    };
    const handleError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const handleFinish = () => {
      cleanup();
      resolve();
    };

    stream.once("error", handleError);
    stream.once("finish", handleFinish);
    stream.end();
  });
}

function assertZip32Value(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0 || value > maxZip32Value) {
    throw new Error(`${label}超过 ZIP32 支持范围，请使用系统文件夹备份。`);
  }
}

function normalizeArchivePath(value: string) {
  return value
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
}

function formatBackupTimestamp(date: Date) {
  return date
    .toISOString()
    .replace(/\.\d{3}Z$/, "")
    .replace(/[-:]/g, "")
    .replace("T", "-");
}

function escapeSqliteString(value: string) {
  return value.replace(/'/g, "''");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let current = index;

  for (let bit = 0; bit < 8; bit += 1) {
    current = current & 1 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
  }

  return current >>> 0;
});

function crc32Update(current: number, buffer: Buffer) {
  let crc = current;

  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return crc;
}

function crc32Finalize(current: number) {
  return (current ^ 0xffffffff) >>> 0;
}

export function localBackupFingerprint(result: Pick<LocalBackupResult, "fileName" | "sizeBytes">) {
  return createHash("sha256")
    .update(`${result.fileName}:${result.sizeBytes}`)
    .digest("hex")
    .slice(0, 16);
}

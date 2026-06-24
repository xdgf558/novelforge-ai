import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { deflateRawSync } from "node:zlib";
import { appVersion } from "@/lib/app-version";
import { getProjectCoverAssetRoot } from "@/lib/project-cover-assets";
import { getAudioAssetRoot } from "@/lib/audio/audio-assets";

export type LocalBackupResult = {
  absolutePath: string;
  fileName: string;
  sizeBytes: number;
  createdAt: Date;
  includedFiles: number;
};

type ZipEntryInput = {
  archivePath: string;
  buffer: Buffer;
};

const backupRootName = "backups";

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
  const entries = await collectBackupEntries(createdAt);

  await fs.promises.mkdir(backupRoot, { recursive: true });
  await fs.promises.writeFile(absolutePath, buildZipArchive(entries));

  const stats = await fs.promises.stat(absolutePath);

  return {
    absolutePath,
    fileName,
    sizeBytes: stats.size,
    createdAt,
    includedFiles: entries.length,
  };
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

async function collectBackupEntries(createdAt: Date): Promise<ZipEntryInput[]> {
  const entries: ZipEntryInput[] = [];
  const databaseFiles = await collectDatabaseFiles();
  const assetRoots = await collectAssetRoots();

  for (const filePath of databaseFiles) {
    entries.push({
      archivePath: path.posix.join("database", path.basename(filePath)),
      buffer: await fs.promises.readFile(filePath),
    });
  }

  for (const root of assetRoots) {
    await addDirectoryEntries(entries, root.absolutePath, root.archivePrefix);
  }

  const manifest = {
    appVersion,
    createdAt: createdAt.toISOString(),
    databaseFiles: databaseFiles.map((filePath) => path.basename(filePath)),
    assetRoots: assetRoots.map((root) => root.archivePrefix),
    note: "This backup contains local NovelForge project data and generated assets. Local API keys and integration tokens are intentionally excluded.",
  };

  entries.unshift({
    archivePath: "manifest.json",
    buffer: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
  });

  return entries;
}

async function collectDatabaseFiles() {
  const databasePath = resolveDatabasePath();
  const candidates = [databasePath, `${databasePath}-wal`, `${databasePath}-shm`];
  const files: string[] = [];

  for (const candidate of candidates) {
    try {
      const stats = await fs.promises.stat(candidate);

      if (stats.isFile()) {
        files.push(candidate);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  if (files.length === 0) {
    throw new Error("未找到本地 SQLite 数据库文件，无法创建备份。");
  }

  return files;
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
        buffer: await fs.promises.readFile(absolutePath),
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

function buildZipArchive(entries: readonly ZipEntryInput[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const fileName = Buffer.from(normalizeArchivePath(entry.archivePath), "utf8");
    const compressed = deflateRawSync(entry.buffer);
    const crc = crc32(entry.buffer);
    const localHeader = Buffer.alloc(30);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(entry.buffer.length, 22);
    localHeader.writeUInt16LE(fileName.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, fileName, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(entry.buffer.length, 24);
    centralHeader.writeUInt16LE(fileName.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, fileName);

    offset += localHeader.length + fileName.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);

  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
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

export function localBackupFingerprint(result: Pick<LocalBackupResult, "fileName" | "sizeBytes">) {
  return createHash("sha256")
    .update(`${result.fileName}:${result.sizeBytes}`)
    .digest("hex")
    .slice(0, 16);
}

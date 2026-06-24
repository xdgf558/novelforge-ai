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
    const archiveText = archive.toString("utf8");

    expect(prismaMock.executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("VACUUM INTO"),
    );
    expect(backup.fileName).toMatch(/^NovelForge-Backup-.*\.zip$/);
    expect(backup.includedFiles).toBeGreaterThanOrEqual(3);
    expect(archive.subarray(0, 4).toString("hex")).toBe("504b0304");
    expect(archiveText).toContain("database/novelforge.sqlite");
    expect(archiveText).toContain("assets/covers/cover.png");
    expect(archiveText).not.toContain("dev.db-wal");
    expect(archiveText).not.toContain("dev.db-shm");
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

    expect(backup.includedFiles).toBe(122);
    expect(archive.subarray(0, 4).toString("hex")).toBe("504b0304");
    expect(archive.toString("utf8")).toContain(
      "assets/cover-candidates/project/task/candidate-119.png",
    );
  });
});

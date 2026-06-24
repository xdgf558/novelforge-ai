import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createLocalBackup, listLocalBackups } from "./local-backups";

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalDesktopDataDir = process.env.NOVELFORGE_DESKTOP_DATA_DIR;
let tempRoot: string | null = null;

afterEach(async () => {
  restoreEnv("DATABASE_URL", originalDatabaseUrl);
  restoreEnv("NOVELFORGE_DESKTOP_DATA_DIR", originalDesktopDataDir);

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
  it("creates a zip backup from the local database and asset roots", async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "novelforge-backup-"));
    const databasePath = path.join(tempRoot, "dev.db");
    const assetPath = path.join(tempRoot, "assets", "covers", "cover.png");

    await fs.writeFile(databasePath, "sqlite test database");
    await fs.mkdir(path.dirname(assetPath), { recursive: true });
    await fs.writeFile(assetPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    process.env.DATABASE_URL = `file:${databasePath}`;
    process.env.NOVELFORGE_DESKTOP_DATA_DIR = tempRoot;

    const backup = await createLocalBackup();
    const archive = await fs.readFile(backup.absolutePath);
    const backups = await listLocalBackups();

    expect(backup.fileName).toMatch(/^NovelForge-Backup-.*\.zip$/);
    expect(backup.includedFiles).toBeGreaterThanOrEqual(3);
    expect(archive.subarray(0, 4).toString("hex")).toBe("504b0304");
    expect(backups.map((entry) => entry.fileName)).toContain(backup.fileName);
  });
});

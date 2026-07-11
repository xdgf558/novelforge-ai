const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const desktopEnvKeys = new Set([
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "OPENAI_BASE_URL",
  "IMAGE_API_KEY",
  "IMAGE_API_BASE_URL",
  "IMAGE_MODEL",
  "IMAGE_SIZE",
  "IMAGE_QUALITY",
  "STATION_CAT_API_BASE_URL",
  "STATION_CAT_PUBLISH_TOKEN",
  "STATION_CAT_DEFAULT_MODE",
]);

function toPrismaSqliteUrl(filePath) {
  const normalizedPath = path.resolve(filePath).replace(/\\/g, "/");

  return `file:${normalizedPath}`;
}

function ensureSqliteDatabaseFile(databasePath) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true, mode: 0o700 });
  fs.chmodSync(path.dirname(databasePath), 0o700);
  fs.closeSync(fs.openSync(databasePath, "a"));
  fs.chmodSync(databasePath, 0o600);
}

function parseDesktopEnv(content) {
  const env = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();

    if (!desktopEnvKeys.has(key)) {
      continue;
    }

    env[key] = unwrapEnvValue(rawValue);
  }

  return env;
}

function readDesktopEnv(envPath) {
  if (!fs.existsSync(envPath)) {
    return {};
  }

  return parseDesktopEnv(fs.readFileSync(envPath, "utf8"));
}

function ensureDesktopEnvExample(dataRoot) {
  fs.mkdirSync(dataRoot, { recursive: true });

  const examplePath = path.join(dataRoot, ".env.example");

  if (!fs.existsSync(examplePath)) {
    fs.writeFileSync(
      examplePath,
      [
        "# Copy this file to .env in the same folder when launching the desktop app.",
        "OPENAI_API_KEY=your_api_key_here",
        "OPENAI_MODEL=gpt-4.1-mini",
        "OPENAI_BASE_URL=https://api.openai.com/v1",
        "IMAGE_API_KEY=your_image_api_key_here",
        "IMAGE_API_BASE_URL=https://api.ppq.ai/v1",
        "IMAGE_MODEL=qwen-image-2",
        "IMAGE_SIZE=default",
        "IMAGE_QUALITY=default",
        "STATION_CAT_API_BASE_URL=https://wwwstationcat.org",
        "STATION_CAT_PUBLISH_TOKEN=your_station_cat_publish_token_here",
        "STATION_CAT_DEFAULT_MODE=draft",
        "",
      ].join("\n"),
    );
  }

  return examplePath;
}

function unwrapEnvValue(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

async function runDesktopMigrations(appRoot, databaseUrl) {
  const { PrismaClient } = require(require.resolve("@prisma/client", {
    paths: [appRoot],
  }));
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  try {
    await ensurePrismaMigrationTable(prisma);

    const appliedMigrationRows = await prisma.$queryRaw`
      SELECT migration_name FROM _prisma_migrations
      WHERE rolled_back_at IS NULL
    `;
    const appliedMigrations = new Set(
      appliedMigrationRows.map((row) => row.migration_name),
    );

    for (const migration of listDesktopMigrations(appRoot)) {
      if (appliedMigrations.has(migration.name)) {
        continue;
      }

      await applyDesktopMigration(prisma, migration);
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function ensurePrismaMigrationTable(prisma) {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )
  `);
}

function listDesktopMigrations(appRoot) {
  const migrationsDir = path.join(appRoot, "prisma", "migrations");

  return fs
    .readdirSync(migrationsDir, {
      withFileTypes: true,
    })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const migrationPath = path.join(migrationsDir, entry.name, "migration.sql");

      return {
        name: entry.name,
        path: migrationPath,
        sql: fs.readFileSync(migrationPath, "utf8"),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function applyDesktopMigration(prisma, migration) {
  const statements = splitSqlStatements(migration.sql);
  const checksum = crypto.createHash("sha256").update(migration.sql).digest("hex");
  const migrationId = crypto.randomUUID();

  await prisma.$transaction(async (tx) => {
    for (const statement of statements) {
      await tx.$executeRawUnsafe(statement);
    }

    await tx.$executeRaw`
      INSERT INTO _prisma_migrations (
        id,
        checksum,
        finished_at,
        migration_name,
        logs,
        rolled_back_at,
        started_at,
        applied_steps_count
      ) VALUES (
        ${migrationId},
        ${checksum},
        CURRENT_TIMESTAMP,
        ${migration.name},
        NULL,
        NULL,
        CURRENT_TIMESTAMP,
        ${statements.length}
      )
    `;
  });
}

function splitSqlStatements(sql) {
  return sql
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

module.exports = {
  ensureDesktopEnvExample,
  ensureSqliteDatabaseFile,
  parseDesktopEnv,
  readDesktopEnv,
  runDesktopMigrations,
  splitSqlStatements,
  toPrismaSqliteUrl,
};

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  ensureSqliteDatabaseFile,
  parseDesktopEnv,
  runDesktopMigrations,
  splitSqlStatements,
  toPrismaSqliteUrl,
} = require("../desktop/runtime.cjs");

const repoRoot = path.resolve(__dirname, "..");
const packageJson = require("../package.json");

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  assert.equal(packageJson.main, "desktop/main.cjs");
  assert.ok(packageJson.scripts["desktop:dev"], "desktop:dev script exists");
  assert.ok(packageJson.scripts["desktop:pack:mac"], "desktop:pack:mac script exists");
  assert.ok(packageJson.scripts["desktop:dist:mac"], "desktop:dist:mac script exists");
  assert.ok(
    packageJson.scripts["desktop:pack:mac"].includes("SKIP_NOTARIZE=1"),
    "desktop:pack:mac skips notarization",
  );
  assert.ok(
    packageJson.scripts["desktop:dist:mac"].includes("SKIP_NOTARIZE=1"),
    "desktop:dist:mac skips notarization",
  );
  assert.ok(packageJson.dependencies.prisma, "prisma is packaged as a runtime dependency");
  assert.ok(packageJson.devDependencies.electron, "electron dev dependency exists");
  assert.ok(packageJson.devDependencies["electron-builder"], "electron-builder dev dependency exists");
  assert.ok(packageJson.devDependencies["@electron/notarize"], "notarize dev dependency exists");
  assert.equal(packageJson.build.productName, "NovelForge AI");
  assert.equal(packageJson.build.asar, true);
  assert.ok(packageJson.build.asarUnpack.includes(".next/**/*"), ".next is unpacked");
  assert.ok(
    packageJson.build.asarUnpack.includes("node_modules/.prisma/**/*"),
    "generated prisma client is unpacked",
  );
  assert.ok(packageJson.build.asarUnpack.includes("node_modules/**/*"), "node_modules is unpacked");
  assert.ok(packageJson.build.asarUnpack.includes("prisma/schema.prisma"), "prisma schema is unpacked");
  assert.ok(
    packageJson.build.asarUnpack.includes("prisma/migrations/**/*"),
    "prisma migrations are unpacked",
  );
  assert.equal(
    packageJson.build.mac.identity,
    "HAO YE (Y35K7AQ974)",
  );
  assert.equal(packageJson.build.mac.icon, "build/icon.icns");
  assert.equal(packageJson.build.mac.hardenedRuntime, true);
  assert.equal(packageJson.build.mac.timestamp, "http://timestamp.apple.com/ts01");
  assert.equal(packageJson.build.mac.entitlements, "build/entitlements.mac.plist");
  assert.deepEqual(packageJson.build.mac.signIgnore, [
    "\\.(?:png|jpe?g|gif|webp|svg|ico|icns|woff2?|ttf|otf|eot|map|pak|bin|dat)$",
  ]);
  assert.equal(packageJson.build.dmg.sign, true);
  assert.equal(packageJson.build.afterPack, "scripts/after-pack.cjs");
  assert.equal(packageJson.build.afterSign, "scripts/notarize.cjs");
  assert.ok(packageJson.build.files.includes(".next/**/*"), ".next is packaged");
  assert.ok(
    packageJson.build.files.includes("node_modules/.prisma/**/*"),
    "generated prisma client is packaged",
  );
  assert.ok(packageJson.build.files.includes("prisma/schema.prisma"), "prisma schema is packaged");
  assert.ok(
    packageJson.build.files.includes("prisma/migrations/**/*"),
    "prisma migrations are packaged",
  );
  assert.ok(packageJson.build.files.includes("desktop/**/*"), "desktop shell is packaged");

  for (const filePath of [
    "desktop/main.cjs",
    "desktop/runtime.cjs",
    "scripts/generate-macos-icon.py",
    "scripts/after-pack.cjs",
    "scripts/notarize.cjs",
    "scripts/desktop-dev.cjs",
    "build/entitlements.mac.plist",
    "build/icon.icns",
    "build/icon.png",
    "build/icon.svg",
  ]) {
    assert.ok(fs.existsSync(path.join(repoRoot, filePath)), `${filePath} exists`);
  }

  const mainSource = fs.readFileSync(path.join(repoRoot, "desktop", "main.cjs"), "utf8");
  assert.ok(
    !mainSource.includes("prisma/build/index.js"),
    "desktop startup must not run Prisma CLI inside the app bundle",
  );
  assert.ok(
    mainSource.includes("runDesktopMigrations"),
    "desktop startup uses bundled read-only-safe migration runner",
  );

  const encodedUrl = toPrismaSqliteUrl(
    "/Users/example/Library/Application Support/NovelForge AI/data/app db.sqlite",
  );
  assert.equal(
    encodedUrl,
    "file:/Users/example/Library/Application Support/NovelForge AI/data/app db.sqlite",
  );

  assert.deepEqual(
    splitSqlStatements("-- comment\nCREATE TABLE a (id TEXT);\n\n-- index\nCREATE INDEX a_id ON a(id);"),
    ["CREATE TABLE a (id TEXT)", "CREATE INDEX a_id ON a(id)"],
  );

  await assertDesktopMigrations();

  assert.deepEqual(
    parseDesktopEnv(
      [
        "# desktop config",
        "OPENAI_API_KEY=\"sk-test\"",
        "OPENAI_MODEL=gpt-4.1-mini",
        "OPENAI_BASE_URL=https://api.deepseek.example/v1",
        "STATION_CAT_API_BASE_URL=https://wwwstationcat.org",
        "STATION_CAT_PUBLISH_TOKEN=publish-token",
        "STATION_CAT_DEFAULT_MODE=draft",
        "DATABASE_URL=file:ignored.db",
        "",
      ].join("\n"),
    ),
    {
      OPENAI_API_KEY: "sk-test",
      OPENAI_MODEL: "gpt-4.1-mini",
      OPENAI_BASE_URL: "https://api.deepseek.example/v1",
      STATION_CAT_API_BASE_URL: "https://wwwstationcat.org",
      STATION_CAT_PUBLISH_TOKEN: "publish-token",
      STATION_CAT_DEFAULT_MODE: "draft",
    },
  );

  console.log("Desktop packaging smoke passed.");
}

async function assertDesktopMigrations() {
  const { PrismaClient } = require("@prisma/client");
  const tempDbPath = path.join(repoRoot, "prisma", "desktop-smoke.sqlite");
  const databaseUrl = toPrismaSqliteUrl(tempDbPath);

  try {
    ensureSqliteDatabaseFile(tempDbPath);
    assert.ok(fs.existsSync(tempDbPath), "desktop database file is created before migrate");

    await runDesktopMigrations(repoRoot, databaseUrl);
    await runDesktopMigrations(repoRoot, databaseUrl);

    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });

    try {
      const tables = await prisma.$queryRaw`
        SELECT name FROM sqlite_master
        WHERE type = 'table'
      `;
      const tableNames = new Set(tables.map((row) => row.name));

      assert.ok(tableNames.has("_prisma_migrations"), "migration table exists");
      assert.ok(tableNames.has("projects"), "projects table exists");
      assert.ok(tableNames.has("publish_targets"), "publish targets table exists");

      const migrationRows = await prisma.$queryRaw`
        SELECT COUNT(*) AS count FROM _prisma_migrations
        WHERE rolled_back_at IS NULL
      `;

      const migrationCount = fs
        .readdirSync(path.join(repoRoot, "prisma", "migrations"), {
          withFileTypes: true,
        })
        .filter((entry) => entry.isDirectory()).length;

      assert.equal(Number(migrationRows[0].count), migrationCount);
    } finally {
      await prisma.$disconnect();
    }
  } finally {
    fs.rmSync(tempDbPath, { force: true });
  }
}

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  ensureSqliteDatabaseFile,
  parseDesktopEnv,
  toPrismaSqliteUrl,
} = require("../desktop/runtime.cjs");

const repoRoot = path.resolve(__dirname, "..");
const packageJson = require("../package.json");

assert.equal(packageJson.main, "desktop/main.cjs");
assert.ok(packageJson.scripts["desktop:dev"], "desktop:dev script exists");
assert.ok(packageJson.scripts["desktop:pack:mac"], "desktop:pack:mac script exists");
assert.ok(packageJson.scripts["desktop:dist:mac"], "desktop:dist:mac script exists");
assert.ok(packageJson.dependencies.prisma, "prisma is packaged as a runtime dependency");
assert.ok(packageJson.devDependencies.electron, "electron dev dependency exists");
assert.ok(packageJson.devDependencies["electron-builder"], "electron-builder dev dependency exists");
assert.equal(packageJson.build.productName, "NovelForge AI");
assert.equal(packageJson.build.asar, false);
assert.equal(packageJson.build.mac.identity, null);
assert.ok(packageJson.build.files.includes(".next/**/*"), ".next is packaged");
assert.ok(packageJson.build.files.includes("prisma/**/*"), "prisma schema and migrations are packaged");
assert.ok(packageJson.build.files.includes("desktop/**/*"), "desktop shell is packaged");

for (const filePath of [
  "desktop/main.cjs",
  "desktop/runtime.cjs",
  "scripts/desktop-dev.cjs",
]) {
  assert.ok(fs.existsSync(path.join(repoRoot, filePath)), `${filePath} exists`);
}

const encodedUrl = toPrismaSqliteUrl(
  "/Users/example/Library/Application Support/NovelForge AI/data/app db.sqlite",
);
assert.equal(
  encodedUrl,
  "file:/Users/example/Library/Application Support/NovelForge AI/data/app db.sqlite",
);

const tempDbPath = path.join(repoRoot, "prisma", "desktop-smoke.sqlite");
try {
  ensureSqliteDatabaseFile(tempDbPath);
  assert.ok(fs.existsSync(tempDbPath), "desktop database file is created before migrate");
} finally {
  fs.rmSync(tempDbPath, { force: true });
}

assert.deepEqual(
  parseDesktopEnv(
    [
      "# desktop config",
      "OPENAI_API_KEY=\"sk-test\"",
      "OPENAI_MODEL=gpt-4.1-mini",
      "DATABASE_URL=file:ignored.db",
      "",
    ].join("\n"),
  ),
  {
    OPENAI_API_KEY: "sk-test",
    OPENAI_MODEL: "gpt-4.1-mini",
  },
);

console.log("Desktop packaging smoke passed.");

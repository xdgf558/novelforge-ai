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
      "OPENAI_BASE_URL=https://api.deepseek.example/v1",
      "DATABASE_URL=file:ignored.db",
      "",
    ].join("\n"),
  ),
  {
    OPENAI_API_KEY: "sk-test",
    OPENAI_MODEL: "gpt-4.1-mini",
    OPENAI_BASE_URL: "https://api.deepseek.example/v1",
  },
);

console.log("Desktop packaging smoke passed.");

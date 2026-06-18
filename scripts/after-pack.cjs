const fs = require("node:fs");
const path = require("node:path");

const keptElectronLocales = new Set([
  "Base.lproj",
  "en.lproj",
  "zh_CN.lproj",
  "zh_TW.lproj",
]);

module.exports = async function afterPackMacApp(context) {
  const { electronPlatformName, appOutDir, packager } = context;

  if (electronPlatformName !== "darwin") {
    return;
  }

  const appName = `${packager.appInfo.productFilename}.app`;
  const appResourcesDir = path.join(appOutDir, appName, "Contents", "Resources");

  copyGeneratedPrismaClient(packager.projectDir, appResourcesDir);

  const electronResourcesDir = path.join(
    appOutDir,
    appName,
    "Contents",
    "Frameworks",
    "Electron Framework.framework",
    "Versions",
    "A",
    "Resources",
  );

  if (!fs.existsSync(electronResourcesDir)) {
    return;
  }

  let removedCount = 0;
  for (const entry of fs.readdirSync(electronResourcesDir, { withFileTypes: true })) {
    if (
      entry.isDirectory() &&
      entry.name.endsWith(".lproj") &&
      !keptElectronLocales.has(entry.name)
    ) {
      fs.rmSync(path.join(electronResourcesDir, entry.name), {
        recursive: true,
        force: true,
      });
      removedCount += 1;
    }
  }

  console.log(
    `Pruned ${removedCount} unused Electron locale resources before macOS signing.`,
  );
};

function copyGeneratedPrismaClient(projectDir, appResourcesDir) {
  const sourceDir = path.join(projectDir, "node_modules", ".prisma");
  const targetDir = path.join(
    appResourcesDir,
    "app.asar.unpacked",
    "node_modules",
    ".prisma",
  );

  if (!fs.existsSync(sourceDir)) {
    throw new Error("Generated Prisma client directory is missing. Run prisma generate first.");
  }

  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  fs.cpSync(sourceDir, targetDir, { recursive: true });
  console.log("Copied generated Prisma client into app.asar.unpacked.");
}

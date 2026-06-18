const { notarize } = require("@electron/notarize");

module.exports = async function notarizeMacApp(context) {
  const { electronPlatformName, appOutDir, packager } = context;

  if (electronPlatformName !== "darwin") {
    return;
  }

  if (process.env.SKIP_NOTARIZE === "1") {
    console.log("Skipping notarization because SKIP_NOTARIZE=1.");
    return;
  }

  const keychainProfile = process.env.APPLE_KEYCHAIN_PROFILE;

  if (!keychainProfile) {
    console.log("Skipping notarization because APPLE_KEYCHAIN_PROFILE is not set.");
    return;
  }

  const appName = `${packager.appInfo.productFilename}.app`;
  const appPath = `${appOutDir}/${appName}`;

  console.log(`Submitting ${appName} for Apple notarization...`);

  await notarize({
    appBundleId: packager.appInfo.appId,
    appPath,
    keychainProfile,
  });

  console.log(`Apple notarization complete for ${appName}.`);
};

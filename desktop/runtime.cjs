const fs = require("node:fs");
const path = require("node:path");

const desktopEnvKeys = new Set(["OPENAI_API_KEY", "OPENAI_MODEL"]);

function toPrismaSqliteUrl(filePath) {
  const normalizedPath = path.resolve(filePath).replace(/\\/g, "/");

  return `file:${normalizedPath}`;
}

function ensureSqliteDatabaseFile(databasePath) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  fs.closeSync(fs.openSync(databasePath, "a"));
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

module.exports = {
  ensureDesktopEnvExample,
  ensureSqliteDatabaseFile,
  parseDesktopEnv,
  readDesktopEnv,
  toPrismaSqliteUrl,
};

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type AiRuntimeEnv = {
  [key: string]: string | undefined;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_BASE_URL?: string;
  NOVELFORGE_AI_CONFIG_PATH?: string;
  NOVELFORGE_DESKTOP_DATA_DIR?: string;
};

export type AiConnectionSettings = {
  configPath: string;
  fileExists: boolean;
  hasApiKey: boolean;
  maskedApiKey: string;
  model: string;
  baseUrl: string;
  source: "file" | "environment" | "default";
};

export type SaveAiConnectionSettingsInput = {
  apiKey?: string | null;
  clearApiKey?: boolean;
  model?: string | null;
  baseUrl?: string | null;
};

type AiConfigKey = (typeof aiConfigKeys)[number];

export const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
export const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
export const aiConfigKeys = [
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "OPENAI_BASE_URL",
] as const;

const aiConfigKeySet = new Set<string>(aiConfigKeys);

export function getAiRuntimeEnv(env: AiRuntimeEnv = process.env) {
  const fileEnv = readAiConfigFile(getAiConfigPath(env));

  return {
    ...env,
    ...compactAiEnv(fileEnv),
  };
}

export function readAiConnectionSettings(
  env: AiRuntimeEnv = process.env,
): AiConnectionSettings {
  const configPath = getAiConfigPath(env);
  const fileEnv = readAiConfigFile(configPath);
  const runtimeEnv = {
    ...env,
    ...compactAiEnv(fileEnv),
  };
  const apiKey = runtimeEnv.OPENAI_API_KEY?.trim() ?? "";
  const model = normalizeAiModel(runtimeEnv.OPENAI_MODEL);
  const baseUrl = normalizeAiBaseUrl(runtimeEnv.OPENAI_BASE_URL);

  return {
    configPath,
    fileExists: fs.existsSync(configPath),
    hasApiKey: Boolean(apiKey),
    maskedApiKey: maskApiKey(apiKey),
    model,
    baseUrl,
    source: detectConfigSource(fileEnv, env),
  };
}

export function saveAiConnectionSettings(
  input: SaveAiConnectionSettingsInput,
  env: AiRuntimeEnv = process.env,
) {
  const configPath = getAiConfigPath(env);
  const currentFileEnv = readAiConfigFile(configPath);
  const apiKeyInput = input.apiKey?.trim() ?? "";
  const currentFileApiKey = currentFileEnv.OPENAI_API_KEY?.trim() ?? "";
  const nextApiKey = input.clearApiKey
    ? ""
    : apiKeyInput || currentFileApiKey;
  const nextEnv: Partial<Record<AiConfigKey, string>> = {
    OPENAI_API_KEY: nextApiKey,
    OPENAI_MODEL: normalizeAiModel(input.model),
    OPENAI_BASE_URL: normalizeAiBaseUrl(input.baseUrl),
  };

  writeAiConfigFile(configPath, nextEnv);

  process.env.OPENAI_API_KEY = nextApiKey || "";
  process.env.OPENAI_MODEL = nextEnv.OPENAI_MODEL;
  process.env.OPENAI_BASE_URL = nextEnv.OPENAI_BASE_URL;

  return readAiConnectionSettings(env);
}

export function getAiConfigPath(env: AiRuntimeEnv = process.env) {
  if (env.NOVELFORGE_AI_CONFIG_PATH?.trim()) {
    return path.resolve(env.NOVELFORGE_AI_CONFIG_PATH.trim());
  }

  if (env.NOVELFORGE_DESKTOP_DATA_DIR?.trim()) {
    return path.join(env.NOVELFORGE_DESKTOP_DATA_DIR.trim(), ".env");
  }

  if (process.platform === "darwin" && process.env.NOVELFORGE_DESKTOP === "1") {
    return path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "NovelForge AI",
      ".env",
    );
  }

  return path.join(process.cwd(), ".env");
}

export function parseAiEnv(content: string) {
  const env: Partial<Record<AiConfigKey, string>> = {};

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

    if (!aiConfigKeySet.has(key)) {
      continue;
    }

    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
    env[key as AiConfigKey] = unwrapEnvValue(rawValue);
  }

  return env;
}

export function normalizeAiModel(model?: string | null) {
  return model?.trim() || DEFAULT_OPENAI_MODEL;
}

export function normalizeAiBaseUrl(baseUrl?: string | null) {
  const normalized = (baseUrl?.trim() || DEFAULT_OPENAI_BASE_URL).replace(/\/+$/, "");

  if (!/^https?:\/\/[^\s]+$/i.test(normalized)) {
    throw new Error("AI 接口地址必须是 http 或 https URL。");
  }

  return normalized;
}

export function maskApiKey(apiKey?: string | null) {
  const cleanKey = apiKey?.trim() ?? "";

  if (!cleanKey) {
    return "未配置";
  }

  if (cleanKey.length <= 8) {
    return `${cleanKey.slice(0, 2)}...${cleanKey.slice(-2)}`;
  }

  return `${cleanKey.slice(0, 6)}...${cleanKey.slice(-4)}`;
}

function readAiConfigFile(configPath: string) {
  if (!fs.existsSync(configPath)) {
    return {};
  }

  return parseAiEnv(fs.readFileSync(configPath, "utf8"));
}

function writeAiConfigFile(
  configPath: string,
  nextEnv: Partial<Record<AiConfigKey, string>>,
) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });

  const currentLines = fs.existsSync(configPath)
    ? fs.readFileSync(configPath, "utf8").split(/\r?\n/)
    : [];
  const seenKeys = new Set<string>();
  const nextLines = currentLines
    .filter((line) => line.trim())
    .map((line) => {
      const separatorIndex = line.indexOf("=");

      if (separatorIndex === -1) {
        return line;
      }

      const key = line.slice(0, separatorIndex).trim();

      if (!aiConfigKeySet.has(key)) {
        return line;
      }

      seenKeys.add(key);
      return `${key}=${formatEnvValue(nextEnv[key as AiConfigKey] ?? "")}`;
    });

  for (const key of aiConfigKeys) {
    if (!seenKeys.has(key)) {
      nextLines.push(`${key}=${formatEnvValue(nextEnv[key] ?? "")}`);
    }
  }

  fs.writeFileSync(configPath, `${nextLines.join("\n")}\n`);
}

function compactAiEnv(env: Partial<Record<AiConfigKey, string>>) {
  const compacted: Partial<Record<AiConfigKey, string>> = {};

  for (const key of aiConfigKeys) {
    const value = env[key]?.trim();

    if (value) {
      compacted[key] = value;
    }
  }

  return compacted;
}

function detectConfigSource(
  fileEnv: Partial<Record<AiConfigKey, string>>,
  env: AiRuntimeEnv,
) {
  if (Object.values(compactAiEnv(fileEnv)).length > 0) {
    return "file";
  }

  if (
    env.OPENAI_API_KEY?.trim() ||
    env.OPENAI_MODEL?.trim() ||
    env.OPENAI_BASE_URL?.trim()
  ) {
    return "environment";
  }

  return "default";
}

function formatEnvValue(value: string) {
  if (!value) {
    return "";
  }

  return JSON.stringify(value);
}

function unwrapEnvValue(value: string) {
  if (!value) {
    return "";
  }

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    const unwrapped = value.slice(1, -1);

    if (value.startsWith('"')) {
      return unwrapped.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }

    return unwrapped;
  }

  return value;
}

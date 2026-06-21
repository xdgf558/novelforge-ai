import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { normalizePublishMode, type PublishMode } from "../publish-platforms";

export type AiRuntimeEnv = {
  [key: string]: string | undefined;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_BASE_URL?: string;
  IMAGE_API_KEY?: string;
  IMAGE_API_BASE_URL?: string;
  IMAGE_MODEL?: string;
  IMAGE_SIZE?: string;
  IMAGE_QUALITY?: string;
  STATION_CAT_API_BASE_URL?: string;
  STATION_CAT_PUBLISH_TOKEN?: string;
  STATION_CAT_DEFAULT_MODE?: string;
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

export type ImageGenerationSettings = {
  configPath: string;
  fileExists: boolean;
  hasApiKey: boolean;
  maskedApiKey: string;
  apiBaseUrl: string;
  model: string;
  size: string;
  quality: string;
  source: "file" | "environment" | "default";
};

export type ImageGenerationSecrets = {
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  size: string;
  quality: string;
};

export type SaveImageGenerationSettingsInput = {
  apiBaseUrl?: string | null;
  apiKey?: string | null;
  clearApiKey?: boolean;
  model?: string | null;
  size?: string | null;
  quality?: string | null;
};

export type StationCatPublishSettings = {
  configPath: string;
  fileExists: boolean;
  hasToken: boolean;
  maskedToken: string;
  apiBaseUrl: string;
  defaultMode: PublishMode;
  source: "file" | "environment" | "default";
};

export type StationCatPublishSecrets = {
  apiBaseUrl: string;
  token: string;
  defaultMode: PublishMode;
};

export type SaveStationCatPublishSettingsInput = {
  apiBaseUrl?: string | null;
  token?: string | null;
  clearToken?: boolean;
  defaultMode?: string | null;
};

type AiConfigKey = (typeof aiConfigKeys)[number];
type ImageConfigKey = (typeof imageConfigKeys)[number];
type StationCatConfigKey = (typeof stationCatConfigKeys)[number];
type LocalConfigKey = AiConfigKey | ImageConfigKey | StationCatConfigKey;

export const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
export const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
export const DEFAULT_IMAGE_API_BASE_URL = "https://api.ppq.ai/v1";
export const DEFAULT_IMAGE_MODEL = "qwen-image-2";
export const DEFAULT_IMAGE_SIZE = "default";
export const DEFAULT_IMAGE_QUALITY = "default";
export const DEFAULT_STATION_CAT_API_BASE_URL = "https://wwwstationcat.org";
export const DEFAULT_STATION_CAT_DEFAULT_MODE: PublishMode = "draft";
export const aiConfigKeys = [
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "OPENAI_BASE_URL",
] as const;
export const imageConfigKeys = [
  "IMAGE_API_KEY",
  "IMAGE_API_BASE_URL",
  "IMAGE_MODEL",
  "IMAGE_SIZE",
  "IMAGE_QUALITY",
] as const;
export const stationCatConfigKeys = [
  "STATION_CAT_API_BASE_URL",
  "STATION_CAT_PUBLISH_TOKEN",
  "STATION_CAT_DEFAULT_MODE",
] as const;

const localConfigKeySet = new Set<string>([
  ...aiConfigKeys,
  ...imageConfigKeys,
  ...stationCatConfigKeys,
]);

export function getAiRuntimeEnv(env: AiRuntimeEnv = process.env) {
  const fileEnv = readLocalConfigFile(getAiConfigPath(env));

  return {
    ...env,
    ...compactAiEnv(fileEnv),
  };
}

export function readAiConnectionSettings(
  env: AiRuntimeEnv = process.env,
): AiConnectionSettings {
  const configPath = getAiConfigPath(env);
  const fileEnv = readLocalConfigFile(configPath);
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
  const currentFileEnv = readLocalConfigFile(configPath);
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

  writeLocalConfigFile(configPath, nextEnv, aiConfigKeys);

  process.env.OPENAI_API_KEY = nextApiKey || "";
  process.env.OPENAI_MODEL = nextEnv.OPENAI_MODEL;
  process.env.OPENAI_BASE_URL = nextEnv.OPENAI_BASE_URL;

  return readAiConnectionSettings(env);
}

export function readImageGenerationSettings(
  env: AiRuntimeEnv = process.env,
): ImageGenerationSettings {
  const configPath = getAiConfigPath(env);
  const fileEnv = readLocalConfigFile(configPath);
  const runtimeEnv = {
    ...env,
    ...compactImageEnv(fileEnv),
  };
  const apiKey = runtimeEnv.IMAGE_API_KEY?.trim() ?? "";

  return {
    configPath,
    fileExists: fs.existsSync(configPath),
    hasApiKey: Boolean(apiKey),
    maskedApiKey: maskApiKey(apiKey),
    apiBaseUrl: normalizeImageApiBaseUrl(runtimeEnv.IMAGE_API_BASE_URL),
    model: normalizeImageModel(runtimeEnv.IMAGE_MODEL),
    size: normalizeImageSize(runtimeEnv.IMAGE_SIZE),
    quality: normalizeImageQuality(runtimeEnv.IMAGE_QUALITY),
    source: detectImageConfigSource(fileEnv, env),
  };
}

export function readImageGenerationSecrets(
  env: AiRuntimeEnv = process.env,
): ImageGenerationSecrets {
  const configPath = getAiConfigPath(env);
  const fileEnv = readLocalConfigFile(configPath);
  const runtimeEnv = {
    ...env,
    ...compactImageEnv(fileEnv),
  };

  return {
    apiBaseUrl: normalizeImageApiBaseUrl(runtimeEnv.IMAGE_API_BASE_URL),
    apiKey: runtimeEnv.IMAGE_API_KEY?.trim() ?? "",
    model: normalizeImageModel(runtimeEnv.IMAGE_MODEL),
    size: normalizeImageSize(runtimeEnv.IMAGE_SIZE),
    quality: normalizeImageQuality(runtimeEnv.IMAGE_QUALITY),
  };
}

export function saveImageGenerationSettings(
  input: SaveImageGenerationSettingsInput,
  env: AiRuntimeEnv = process.env,
) {
  const configPath = getAiConfigPath(env);
  const currentFileEnv = readLocalConfigFile(configPath);
  const apiKeyInput = input.apiKey?.trim() ?? "";
  const currentApiKey =
    currentFileEnv.IMAGE_API_KEY?.trim() || env.IMAGE_API_KEY?.trim() || "";
  const nextApiKey = input.clearApiKey ? "" : apiKeyInput || currentApiKey;
  const nextEnv: Partial<Record<ImageConfigKey, string>> = {
    IMAGE_API_KEY: nextApiKey,
    IMAGE_API_BASE_URL: normalizeImageApiBaseUrl(input.apiBaseUrl),
    IMAGE_MODEL: normalizeImageModel(input.model),
    IMAGE_SIZE: normalizeImageSize(input.size),
    IMAGE_QUALITY: normalizeImageQuality(input.quality),
  };

  writeLocalConfigFile(configPath, nextEnv, imageConfigKeys);

  process.env.IMAGE_API_KEY = nextApiKey || "";
  process.env.IMAGE_API_BASE_URL = nextEnv.IMAGE_API_BASE_URL;
  process.env.IMAGE_MODEL = nextEnv.IMAGE_MODEL;
  process.env.IMAGE_SIZE = nextEnv.IMAGE_SIZE;
  process.env.IMAGE_QUALITY = nextEnv.IMAGE_QUALITY;

  return readImageGenerationSettings(env);
}

export function readStationCatPublishSettings(
  env: AiRuntimeEnv = process.env,
): StationCatPublishSettings {
  const configPath = getAiConfigPath(env);
  const fileEnv = readLocalConfigFile(configPath);
  const runtimeEnv = {
    ...env,
    ...compactStationCatEnv(fileEnv),
  };
  const token = runtimeEnv.STATION_CAT_PUBLISH_TOKEN?.trim() ?? "";

  return {
    configPath,
    fileExists: fs.existsSync(configPath),
    hasToken: Boolean(token),
    maskedToken: maskSecret(token),
    apiBaseUrl: normalizeStationCatApiBaseUrl(runtimeEnv.STATION_CAT_API_BASE_URL),
    defaultMode: normalizePublishMode(
      runtimeEnv.STATION_CAT_DEFAULT_MODE || DEFAULT_STATION_CAT_DEFAULT_MODE,
    ),
    source: detectStationCatConfigSource(fileEnv, env),
  };
}

export function readStationCatPublishSecrets(
  env: AiRuntimeEnv = process.env,
): StationCatPublishSecrets {
  const configPath = getAiConfigPath(env);
  const fileEnv = readLocalConfigFile(configPath);
  const runtimeEnv = {
    ...env,
    ...compactStationCatEnv(fileEnv),
  };

  return {
    apiBaseUrl: normalizeStationCatApiBaseUrl(runtimeEnv.STATION_CAT_API_BASE_URL),
    token: runtimeEnv.STATION_CAT_PUBLISH_TOKEN?.trim() ?? "",
    defaultMode: normalizePublishMode(
      runtimeEnv.STATION_CAT_DEFAULT_MODE || DEFAULT_STATION_CAT_DEFAULT_MODE,
    ),
  };
}

export function saveStationCatPublishSettings(
  input: SaveStationCatPublishSettingsInput,
  env: AiRuntimeEnv = process.env,
) {
  const configPath = getAiConfigPath(env);
  const currentFileEnv = readLocalConfigFile(configPath);
  const tokenInput = input.token?.trim() ?? "";
  const currentToken =
    currentFileEnv.STATION_CAT_PUBLISH_TOKEN?.trim() ||
    env.STATION_CAT_PUBLISH_TOKEN?.trim() ||
    "";
  const nextToken = input.clearToken ? "" : tokenInput || currentToken;
  const nextEnv: Partial<Record<StationCatConfigKey, string>> = {
    STATION_CAT_API_BASE_URL: normalizeStationCatApiBaseUrl(input.apiBaseUrl),
    STATION_CAT_PUBLISH_TOKEN: nextToken,
    STATION_CAT_DEFAULT_MODE: normalizePublishMode(input.defaultMode),
  };

  writeLocalConfigFile(configPath, nextEnv, stationCatConfigKeys);

  process.env.STATION_CAT_API_BASE_URL = nextEnv.STATION_CAT_API_BASE_URL;
  process.env.STATION_CAT_PUBLISH_TOKEN = nextToken || "";
  process.env.STATION_CAT_DEFAULT_MODE = nextEnv.STATION_CAT_DEFAULT_MODE;

  return readStationCatPublishSettings(env);
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
  const localEnv = parseLocalConfigEnv(content);
  const env: Partial<Record<AiConfigKey, string>> = {};

  for (const key of aiConfigKeys) {
    if (localEnv[key] !== undefined) {
      env[key] = localEnv[key];
    }
  }

  return env;
}

export function parseStationCatEnv(content: string) {
  const localEnv = parseLocalConfigEnv(content);
  const env: Partial<Record<StationCatConfigKey, string>> = {};

  for (const key of stationCatConfigKeys) {
    if (localEnv[key] !== undefined) {
      env[key] = localEnv[key];
    }
  }

  return env;
}

export function parseImageGenerationEnv(content: string) {
  const localEnv = parseLocalConfigEnv(content);
  const env: Partial<Record<ImageConfigKey, string>> = {};

  for (const key of imageConfigKeys) {
    if (localEnv[key] !== undefined) {
      env[key] = localEnv[key];
    }
  }

  return env;
}

function parseLocalConfigEnv(content: string) {
  const env: Partial<Record<LocalConfigKey, string>> = {};

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

    if (!localConfigKeySet.has(key)) {
      continue;
    }

    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
    env[key as LocalConfigKey] = unwrapEnvValue(rawValue);
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

export function normalizeStationCatApiBaseUrl(apiBaseUrl?: string | null) {
  const normalized = (apiBaseUrl?.trim() || DEFAULT_STATION_CAT_API_BASE_URL).replace(
    /\/+$/,
    "",
  );

  if (!/^https?:\/\/[^\s]+$/i.test(normalized)) {
    throw new Error("Station Cat API Base URL 必须是 http 或 https URL。");
  }

  return normalized;
}

export function normalizeImageApiBaseUrl(apiBaseUrl?: string | null) {
  const normalized = (apiBaseUrl?.trim() || DEFAULT_IMAGE_API_BASE_URL).replace(
    /\/+$/,
    "",
  );

  if (!/^https?:\/\/[^\s]+$/i.test(normalized)) {
    throw new Error("图片生成 API Base URL 必须是 http 或 https URL。");
  }

  return normalized;
}

export function normalizeImageModel(model?: string | null) {
  return model?.trim() || DEFAULT_IMAGE_MODEL;
}

export function normalizeImageSize(size?: string | null) {
  return size?.trim() || DEFAULT_IMAGE_SIZE;
}

export function normalizeImageQuality(quality?: string | null) {
  return quality?.trim() || DEFAULT_IMAGE_QUALITY;
}

export function maskApiKey(apiKey?: string | null) {
  return maskSecret(apiKey);
}

function maskSecret(apiKey?: string | null) {
  const cleanKey = apiKey?.trim() ?? "";

  if (!cleanKey) {
    return "未配置";
  }

  if (cleanKey.length <= 8) {
    return `${cleanKey.slice(0, 2)}...${cleanKey.slice(-2)}`;
  }

  return `${cleanKey.slice(0, 6)}...${cleanKey.slice(-4)}`;
}

function readLocalConfigFile(configPath: string) {
  if (!fs.existsSync(configPath)) {
    return {};
  }

  return parseLocalConfigEnv(fs.readFileSync(configPath, "utf8"));
}

function writeLocalConfigFile(
  configPath: string,
  nextEnv: Partial<Record<LocalConfigKey, string>>,
  keysToEnsure: readonly LocalConfigKey[],
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

      if (!Object.prototype.hasOwnProperty.call(nextEnv, key)) {
        return line;
      }

      seenKeys.add(key);
      return `${key}=${formatEnvValue(nextEnv[key as LocalConfigKey] ?? "")}`;
    });

  for (const key of keysToEnsure) {
    if (!seenKeys.has(key)) {
      nextLines.push(`${key}=${formatEnvValue(nextEnv[key] ?? "")}`);
    }
  }

  fs.writeFileSync(configPath, `${nextLines.join("\n")}\n`);
}

function compactAiEnv(env: Partial<Record<LocalConfigKey, string>>) {
  const compacted: Partial<Record<AiConfigKey, string>> = {};

  for (const key of aiConfigKeys) {
    const value = env[key]?.trim();

    if (value) {
      compacted[key] = value;
    }
  }

  return compacted;
}

function compactStationCatEnv(env: Partial<Record<LocalConfigKey, string>>) {
  const compacted: Partial<Record<StationCatConfigKey, string>> = {};

  for (const key of stationCatConfigKeys) {
    const value = env[key]?.trim();

    if (value) {
      compacted[key] = value;
    }
  }

  return compacted;
}

function compactImageEnv(env: Partial<Record<LocalConfigKey, string>>) {
  const compacted: Partial<Record<ImageConfigKey, string>> = {};

  for (const key of imageConfigKeys) {
    const value = env[key]?.trim();

    if (value) {
      compacted[key] = value;
    }
  }

  return compacted;
}

function detectConfigSource(
  fileEnv: Partial<Record<LocalConfigKey, string>>,
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

function detectImageConfigSource(
  fileEnv: Partial<Record<LocalConfigKey, string>>,
  env: AiRuntimeEnv,
) {
  if (Object.values(compactImageEnv(fileEnv)).length > 0) {
    return "file";
  }

  if (
    env.IMAGE_API_KEY?.trim() ||
    env.IMAGE_API_BASE_URL?.trim() ||
    env.IMAGE_MODEL?.trim() ||
    env.IMAGE_SIZE?.trim() ||
    env.IMAGE_QUALITY?.trim()
  ) {
    return "environment";
  }

  return "default";
}

function detectStationCatConfigSource(
  fileEnv: Partial<Record<LocalConfigKey, string>>,
  env: AiRuntimeEnv,
) {
  if (Object.values(compactStationCatEnv(fileEnv)).length > 0) {
    return "file";
  }

  if (
    env.STATION_CAT_API_BASE_URL?.trim() ||
    env.STATION_CAT_PUBLISH_TOKEN?.trim() ||
    env.STATION_CAT_DEFAULT_MODE?.trim()
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

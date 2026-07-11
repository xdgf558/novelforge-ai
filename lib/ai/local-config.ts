import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { normalizePublishMode, type PublishMode } from "../publish-platforms";

export type AiRuntimeEnv = {
  [key: string]: string | undefined;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_BASE_URL?: string;
  CHAPTER_DRAFT_API_KEY?: string;
  CHAPTER_DRAFT_MODEL?: string;
  CHAPTER_DRAFT_BASE_URL?: string;
  CHAPTER_POLISH_API_KEY?: string;
  CHAPTER_POLISH_MODEL?: string;
  CHAPTER_POLISH_BASE_URL?: string;
  IMAGE_API_KEY?: string;
  IMAGE_API_BASE_URL?: string;
  IMAGE_MODEL?: string;
  IMAGE_SIZE?: string;
  IMAGE_QUALITY?: string;
  TTS_PROVIDER_ID?: string;
  TTS_API_KEY?: string;
  TTS_API_BASE_URL?: string;
  TTS_MODEL?: string;
  TTS_VOICE_ID?: string;
  TTS_VOICE_NAME?: string;
  TTS_LANGUAGE_CODE?: string;
  TTS_OUTPUT_FORMAT?: string;
  TTS_STYLE_PROMPT?: string;
  STATION_CAT_API_BASE_URL?: string;
  STATION_CAT_PUBLISH_TOKEN?: string;
  STATION_CAT_DEFAULT_MODE?: string;
  HTTP_PROXY?: string;
  HTTPS_PROXY?: string;
  ALL_PROXY?: string;
  NO_PROXY?: string;
  http_proxy?: string;
  https_proxy?: string;
  all_proxy?: string;
  no_proxy?: string;
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

export type AiTaskModelRouteTaskType =
  | "chapter_draft_generation"
  | "chapter_polish_generation";

export type AiTaskModelRouteSettings = {
  configPath: string;
  fileExists: boolean;
  routes: {
    chapterDraft: AiTaskModelRouteSetting;
    chapterPolish: AiTaskModelRouteSetting;
  };
};

export type AiTaskModelRouteSetting = {
  taskType: AiTaskModelRouteTaskType;
  label: string;
  hasApiKey: boolean;
  maskedApiKey: string;
  model: string;
  baseUrl: string;
  isActive: boolean;
  source: "file" | "environment" | "default";
};

export type AiTaskModelRouteSecrets = {
  taskType: AiTaskModelRouteTaskType;
  apiKey: string;
  model: string;
  baseUrl: string;
  isActive: boolean;
};

export type SaveAiTaskModelRouteSettingsInput = {
  draftApiKey?: string | null;
  clearDraftApiKey?: boolean;
  draftModel?: string | null;
  draftBaseUrl?: string | null;
  polishApiKey?: string | null;
  clearPolishApiKey?: boolean;
  polishModel?: string | null;
  polishBaseUrl?: string | null;
};

export type NetworkProxySettings = {
  configPath: string;
  fileExists: boolean;
  proxyUrl: string;
  noProxy: string;
  source: "file" | "environment" | "default";
};

export type SaveNetworkProxySettingsInput = {
  proxyUrl?: string | null;
  noProxy?: string | null;
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

export type TtsGenerationSettings = {
  configPath: string;
  fileExists: boolean;
  hasApiKey: boolean;
  maskedApiKey: string;
  providerId: string;
  apiBaseUrl: string;
  model: string;
  voiceId: string;
  voiceName: string;
  languageCode: string;
  outputFormat: string;
  stylePrompt: string;
  source: "file" | "environment" | "default";
};

export type TtsGenerationSecrets = {
  providerId: string;
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  voiceId: string;
  voiceName: string;
  languageCode: string;
  outputFormat: string;
  stylePrompt: string;
};

export type SaveTtsGenerationSettingsInput = {
  providerId?: string | null;
  apiBaseUrl?: string | null;
  apiKey?: string | null;
  clearApiKey?: boolean;
  model?: string | null;
  voiceId?: string | null;
  voiceName?: string | null;
  languageCode?: string | null;
  outputFormat?: string | null;
  stylePrompt?: string | null;
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
type AiTaskRouteConfigKey = (typeof aiTaskRouteConfigKeys)[number];
type ImageConfigKey = (typeof imageConfigKeys)[number];
type TtsConfigKey = (typeof ttsConfigKeys)[number];
type StationCatConfigKey = (typeof stationCatConfigKeys)[number];
type NetworkProxyConfigKey = (typeof networkProxyConfigKeys)[number];
type LocalConfigKey =
  | AiConfigKey
  | AiTaskRouteConfigKey
  | ImageConfigKey
  | TtsConfigKey
  | StationCatConfigKey
  | NetworkProxyConfigKey;

export const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
export const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
export const DEFAULT_KIMI_API_BASE_URL = "https://api.moonshot.cn/v1";
export const DEFAULT_KIMI_K2_6_MODEL = "kimi-k2.6";
export const DEFAULT_IMAGE_API_BASE_URL = "https://api.ppq.ai/v1";
export const DEFAULT_IMAGE_MODEL = "qwen-image-2";
export const DEFAULT_IMAGE_SIZE = "default";
export const DEFAULT_IMAGE_QUALITY = "default";
export const DEFAULT_TTS_PROVIDER_ID = "google_tts";
export const DEFAULT_TTS_API_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta";
export const DEFAULT_TTS_MODEL = "gemini-2.5-flash-preview-tts";
export const DEFAULT_TTS_VOICE_ID = "Kore";
export const DEFAULT_TTS_VOICE_NAME = "Kore - Firm";
export const DEFAULT_GLM_TTS_PROVIDER_ID = "glm_tts";
export const DEFAULT_GLM_TTS_API_BASE_URL =
  "https://open.bigmodel.cn/api/paas/v4";
export const DEFAULT_GLM_TTS_MODEL = "glm-tts";
export const DEFAULT_GLM_TTS_VOICE_ID = "female";
export const DEFAULT_GLM_TTS_VOICE_NAME = "彤彤（默认）";
export const DEFAULT_TTS_LANGUAGE_CODE = "cmn";
export const DEFAULT_TTS_OUTPUT_FORMAT = "wav";
export const DEFAULT_TTS_STYLE_PROMPT =
  "中文长篇小说旁白，语气自然沉稳，保留对白情绪，节奏适合连续收听。";
export const DEFAULT_STATION_CAT_API_BASE_URL = "https://wwwstationcat.org";
export const DEFAULT_STATION_CAT_DEFAULT_MODE: PublishMode = "draft";
export const aiConfigKeys = [
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "OPENAI_BASE_URL",
] as const;
export const aiTaskRouteConfigKeys = [
  "CHAPTER_DRAFT_API_KEY",
  "CHAPTER_DRAFT_MODEL",
  "CHAPTER_DRAFT_BASE_URL",
  "CHAPTER_POLISH_API_KEY",
  "CHAPTER_POLISH_MODEL",
  "CHAPTER_POLISH_BASE_URL",
] as const;
export const imageConfigKeys = [
  "IMAGE_API_KEY",
  "IMAGE_API_BASE_URL",
  "IMAGE_MODEL",
  "IMAGE_SIZE",
  "IMAGE_QUALITY",
] as const;
export const ttsConfigKeys = [
  "TTS_PROVIDER_ID",
  "TTS_API_KEY",
  "TTS_API_BASE_URL",
  "TTS_MODEL",
  "TTS_VOICE_ID",
  "TTS_VOICE_NAME",
  "TTS_LANGUAGE_CODE",
  "TTS_OUTPUT_FORMAT",
  "TTS_STYLE_PROMPT",
] as const;
export const stationCatConfigKeys = [
  "STATION_CAT_API_BASE_URL",
  "STATION_CAT_PUBLISH_TOKEN",
  "STATION_CAT_DEFAULT_MODE",
] as const;
export const networkProxyConfigKeys = [
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "ALL_PROXY",
  "NO_PROXY",
] as const;

const localConfigKeySet = new Set<string>([
  ...aiConfigKeys,
  ...aiTaskRouteConfigKeys,
  ...imageConfigKeys,
  ...ttsConfigKeys,
  ...stationCatConfigKeys,
  ...networkProxyConfigKeys,
]);

export function getAiRuntimeEnv(env: AiRuntimeEnv = process.env) {
  const fileEnv = readLocalConfigFile(getAiConfigPath(env));

  return {
    ...env,
    ...compactNetworkProxyEnv(fileEnv),
    ...compactAiEnv(fileEnv),
  };
}

export function getAiRuntimeEnvForTaskType(
  taskType?: string | null,
  env: AiRuntimeEnv = process.env,
) {
  const runtimeEnv = getAiRuntimeEnv(env);

  if (!isAiTaskModelRouteTaskType(taskType)) {
    return runtimeEnv;
  }

  const route = readAiTaskModelRouteSecrets(taskType, env);

  if (!route.isActive) {
    return runtimeEnv;
  }

  return {
    ...runtimeEnv,
    OPENAI_API_KEY: route.apiKey,
    OPENAI_MODEL: route.model,
    OPENAI_BASE_URL: route.baseUrl,
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

export function readAiTaskModelRouteSettings(
  env: AiRuntimeEnv = process.env,
): AiTaskModelRouteSettings {
  const configPath = getAiConfigPath(env);

  return {
    configPath,
    fileExists: fs.existsSync(configPath),
    routes: {
      chapterDraft: readAiTaskModelRouteSetting(
        "chapter_draft_generation",
        env,
      ),
      chapterPolish: readAiTaskModelRouteSetting(
        "chapter_polish_generation",
        env,
      ),
    },
  };
}

export function readAiTaskModelRouteSecrets(
  taskType: AiTaskModelRouteTaskType,
  env: AiRuntimeEnv = process.env,
): AiTaskModelRouteSecrets {
  const route = readAiTaskModelRouteSetting(taskType, env);

  return {
    taskType,
    apiKey: readRouteApiKey(taskType, env),
    model: route.model,
    baseUrl: route.baseUrl,
    isActive: route.isActive,
  };
}

export function saveAiTaskModelRouteSettings(
  input: SaveAiTaskModelRouteSettingsInput,
  env: AiRuntimeEnv = process.env,
) {
  const configPath = getAiConfigPath(env);
  const currentFileEnv = readLocalConfigFile(configPath);
  const draftApiKeyInput = input.draftApiKey?.trim() ?? "";
  const polishApiKeyInput = input.polishApiKey?.trim() ?? "";
  const currentDraftApiKey =
    currentFileEnv.CHAPTER_DRAFT_API_KEY?.trim() ||
    env.CHAPTER_DRAFT_API_KEY?.trim() ||
    "";
  const currentPolishApiKey =
    currentFileEnv.CHAPTER_POLISH_API_KEY?.trim() ||
    env.CHAPTER_POLISH_API_KEY?.trim() ||
    "";
  const nextDraftApiKey = input.clearDraftApiKey
    ? ""
    : draftApiKeyInput || currentDraftApiKey;
  const nextPolishApiKey = input.clearPolishApiKey
    ? ""
    : polishApiKeyInput || currentPolishApiKey;
  const nextEnv: Partial<Record<AiTaskRouteConfigKey, string>> = {
    CHAPTER_DRAFT_API_KEY: nextDraftApiKey,
    CHAPTER_DRAFT_MODEL: normalizeKimiModel(input.draftModel),
    CHAPTER_DRAFT_BASE_URL: normalizeKimiBaseUrl(input.draftBaseUrl),
    CHAPTER_POLISH_API_KEY: nextPolishApiKey,
    CHAPTER_POLISH_MODEL: normalizeKimiModel(input.polishModel),
    CHAPTER_POLISH_BASE_URL: normalizeKimiBaseUrl(input.polishBaseUrl),
  };

  writeLocalConfigFile(configPath, nextEnv, aiTaskRouteConfigKeys);

  process.env.CHAPTER_DRAFT_API_KEY = nextDraftApiKey || "";
  process.env.CHAPTER_DRAFT_MODEL = nextEnv.CHAPTER_DRAFT_MODEL;
  process.env.CHAPTER_DRAFT_BASE_URL = nextEnv.CHAPTER_DRAFT_BASE_URL;
  process.env.CHAPTER_POLISH_API_KEY = nextPolishApiKey || "";
  process.env.CHAPTER_POLISH_MODEL = nextEnv.CHAPTER_POLISH_MODEL;
  process.env.CHAPTER_POLISH_BASE_URL = nextEnv.CHAPTER_POLISH_BASE_URL;

  return readAiTaskModelRouteSettings(env);
}

export function readNetworkProxySettings(
  env: AiRuntimeEnv = process.env,
): NetworkProxySettings {
  const configPath = getAiConfigPath(env);
  const fileEnv = readLocalConfigFile(configPath);
  const runtimeEnv = {
    ...env,
    ...compactNetworkProxyEnv(fileEnv),
  };
  const proxyUrl = normalizeNetworkProxyUrl(
    runtimeEnv.HTTPS_PROXY ||
      runtimeEnv.HTTP_PROXY ||
      runtimeEnv.ALL_PROXY ||
      runtimeEnv.https_proxy ||
      runtimeEnv.http_proxy ||
      runtimeEnv.all_proxy,
  );

  return {
    configPath,
    fileExists: fs.existsSync(configPath),
    proxyUrl,
    noProxy: normalizeNoProxy(runtimeEnv.NO_PROXY || runtimeEnv.no_proxy),
    source: detectNetworkProxySource(fileEnv, env),
  };
}

export function saveNetworkProxySettings(
  input: SaveNetworkProxySettingsInput,
  env: AiRuntimeEnv = process.env,
) {
  const configPath = getAiConfigPath(env);
  const proxyUrl = normalizeNetworkProxyUrl(input.proxyUrl);
  const noProxy = normalizeNoProxy(input.noProxy);
  const nextEnv: Partial<Record<NetworkProxyConfigKey, string>> = {
    HTTP_PROXY: proxyUrl,
    HTTPS_PROXY: proxyUrl,
    ALL_PROXY: proxyUrl,
    NO_PROXY: noProxy,
  };

  writeLocalConfigFile(configPath, nextEnv, networkProxyConfigKeys);

  process.env.HTTP_PROXY = proxyUrl;
  process.env.HTTPS_PROXY = proxyUrl;
  process.env.ALL_PROXY = proxyUrl;
  process.env.NO_PROXY = noProxy;
  process.env.http_proxy = proxyUrl;
  process.env.https_proxy = proxyUrl;
  process.env.all_proxy = proxyUrl;
  process.env.no_proxy = noProxy;

  return readNetworkProxySettings(env);
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

export function readTtsGenerationSettings(
  env: AiRuntimeEnv = process.env,
): TtsGenerationSettings {
  const configPath = getAiConfigPath(env);
  const fileEnv = readLocalConfigFile(configPath);
  const runtimeEnv = {
    ...env,
    ...compactTtsEnv(fileEnv),
  };
  const ttsEnv = normalizeTtsRuntimeEnv(runtimeEnv);

  return {
    configPath,
    fileExists: fs.existsSync(configPath),
    hasApiKey: Boolean(ttsEnv.apiKey),
    maskedApiKey: maskSecret(ttsEnv.apiKey),
    providerId: ttsEnv.providerId,
    apiBaseUrl: ttsEnv.apiBaseUrl,
    model: ttsEnv.model,
    voiceId: ttsEnv.voiceId,
    voiceName: ttsEnv.voiceName,
    languageCode: ttsEnv.languageCode,
    outputFormat: ttsEnv.outputFormat,
    stylePrompt: ttsEnv.stylePrompt,
    source: detectTtsConfigSource(fileEnv, env),
  };
}

export function readTtsGenerationSecrets(
  env: AiRuntimeEnv = process.env,
): TtsGenerationSecrets {
  const configPath = getAiConfigPath(env);
  const fileEnv = readLocalConfigFile(configPath);
  const runtimeEnv = {
    ...env,
    ...compactTtsEnv(fileEnv),
  };
  const ttsEnv = normalizeTtsRuntimeEnv(runtimeEnv);

  return {
    providerId: ttsEnv.providerId,
    apiBaseUrl: ttsEnv.apiBaseUrl,
    apiKey: ttsEnv.apiKey,
    model: ttsEnv.model,
    voiceId: ttsEnv.voiceId,
    voiceName: ttsEnv.voiceName,
    languageCode: ttsEnv.languageCode,
    outputFormat: ttsEnv.outputFormat,
    stylePrompt: ttsEnv.stylePrompt,
  };
}

export function saveTtsGenerationSettings(
  input: SaveTtsGenerationSettingsInput,
  env: AiRuntimeEnv = process.env,
) {
  const configPath = getAiConfigPath(env);
  const currentFileEnv = readLocalConfigFile(configPath);
  const apiKeyInput = input.apiKey?.trim() ?? "";
  const currentApiKey =
    isLegacyPpqTtsConfig(currentFileEnv)
      ? ""
      : currentFileEnv.TTS_API_KEY?.trim() || env.TTS_API_KEY?.trim() || "";
  const nextApiKey = input.clearApiKey ? "" : apiKeyInput || currentApiKey;
  const providerId = normalizeTtsProviderId(input.providerId);
  const nextEnv: Partial<Record<TtsConfigKey, string>> = {
    TTS_PROVIDER_ID: providerId,
    TTS_API_KEY: nextApiKey,
    TTS_API_BASE_URL: normalizeTtsApiBaseUrlForProvider(
      input.apiBaseUrl,
      providerId,
    ),
    TTS_MODEL: normalizeTtsModelForProvider(input.model, providerId),
    TTS_VOICE_ID: normalizeTtsVoiceIdForProvider(input.voiceId, providerId),
    TTS_VOICE_NAME: normalizeTtsVoiceNameForProvider(input.voiceName, providerId),
    TTS_LANGUAGE_CODE: normalizeTtsLanguageCode(input.languageCode),
    TTS_OUTPUT_FORMAT: normalizeTtsOutputFormat(input.outputFormat),
    TTS_STYLE_PROMPT: normalizeTtsStylePrompt(input.stylePrompt),
  };

  writeLocalConfigFile(configPath, nextEnv, ttsConfigKeys);

  process.env.TTS_PROVIDER_ID = nextEnv.TTS_PROVIDER_ID;
  process.env.TTS_API_KEY = nextApiKey || "";
  process.env.TTS_API_BASE_URL = nextEnv.TTS_API_BASE_URL;
  process.env.TTS_MODEL = nextEnv.TTS_MODEL;
  process.env.TTS_VOICE_ID = nextEnv.TTS_VOICE_ID;
  process.env.TTS_VOICE_NAME = nextEnv.TTS_VOICE_NAME;
  process.env.TTS_LANGUAGE_CODE = nextEnv.TTS_LANGUAGE_CODE;
  process.env.TTS_OUTPUT_FORMAT = nextEnv.TTS_OUTPUT_FORMAT;
  process.env.TTS_STYLE_PROMPT = nextEnv.TTS_STYLE_PROMPT;

  return readTtsGenerationSettings(env);
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

export function parseAiTaskModelRouteEnv(content: string) {
  const localEnv = parseLocalConfigEnv(content);
  const env: Partial<Record<AiTaskRouteConfigKey, string>> = {};

  for (const key of aiTaskRouteConfigKeys) {
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

export function parseTtsGenerationEnv(content: string) {
  const localEnv = parseLocalConfigEnv(content);
  const env: Partial<Record<TtsConfigKey, string>> = {};

  for (const key of ttsConfigKeys) {
    if (localEnv[key] !== undefined) {
      env[key] = localEnv[key];
    }
  }

  return env;
}

export function parseNetworkProxyEnv(content: string) {
  const localEnv = parseLocalConfigEnv(content);
  const env: Partial<Record<NetworkProxyConfigKey, string>> = {};

  for (const key of networkProxyConfigKeys) {
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

export function normalizeKimiModel(model?: string | null) {
  return model?.trim() || DEFAULT_KIMI_K2_6_MODEL;
}

export function normalizeKimiBaseUrl(baseUrl?: string | null) {
  const normalized = (baseUrl?.trim() || DEFAULT_KIMI_API_BASE_URL).replace(
    /\/+$/,
    "",
  );

  if (!/^https?:\/\/[^\s]+$/i.test(normalized)) {
    throw new Error("Kimi API Base URL 必须是 http 或 https URL。");
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

export function normalizeTtsProviderId(providerId?: string | null) {
  const normalized = providerId?.trim().toLowerCase() || DEFAULT_TTS_PROVIDER_ID;

  if (
    normalized !== DEFAULT_TTS_PROVIDER_ID &&
    normalized !== DEFAULT_GLM_TTS_PROVIDER_ID
  ) {
    return DEFAULT_TTS_PROVIDER_ID;
  }

  return normalized;
}

export function normalizeTtsApiBaseUrl(apiBaseUrl?: string | null) {
  const normalized = (apiBaseUrl?.trim() || DEFAULT_TTS_API_BASE_URL).replace(
    /\/+$/,
  "",
  );

  if (!/^https?:\/\/[^\s]+$/i.test(normalized)) {
    throw new Error("TTS API Base URL 必须是 http 或 https 地址。");
  }

  return normalized;
}

export function normalizeTtsApiBaseUrlForProvider(
  apiBaseUrl: string | null | undefined,
  providerId: string,
) {
  const cleanApiBaseUrl = apiBaseUrl?.trim().replace(/\/+$/, "") || "";

  if (
    !cleanApiBaseUrl ||
    (providerId === DEFAULT_GLM_TTS_PROVIDER_ID &&
      cleanApiBaseUrl === DEFAULT_TTS_API_BASE_URL) ||
    (providerId === DEFAULT_TTS_PROVIDER_ID &&
      cleanApiBaseUrl === DEFAULT_GLM_TTS_API_BASE_URL)
  ) {
    return normalizeTtsApiBaseUrl(defaultTtsApiBaseUrlForProvider(providerId));
  }

  return normalizeTtsApiBaseUrl(cleanApiBaseUrl);
}

function defaultTtsApiBaseUrlForProvider(providerId: string) {
  return providerId === DEFAULT_GLM_TTS_PROVIDER_ID
    ? DEFAULT_GLM_TTS_API_BASE_URL
    : DEFAULT_TTS_API_BASE_URL;
}

function normalizeTtsRuntimeEnv(env: AiRuntimeEnv): TtsGenerationSecrets {
  const isLegacyPpqConfig = isLegacyPpqTtsConfig(env);
  const providerId = normalizeTtsProviderId(
    isLegacyPpqConfig ? "" : env.TTS_PROVIDER_ID,
  );

  return {
    providerId,
    apiBaseUrl: normalizeTtsApiBaseUrl(
      isLegacyPpqConfig
        ? ""
        : env.TTS_API_BASE_URL || defaultTtsApiBaseUrlForProvider(providerId),
    ),
    apiKey: isLegacyPpqConfig ? "" : env.TTS_API_KEY?.trim() ?? "",
    model: normalizeTtsModelForProvider(
      isLegacyPpqConfig ? "" : env.TTS_MODEL,
      providerId,
    ),
    voiceId: normalizeTtsVoiceIdForProvider(
      isLegacyPpqConfig ? "" : env.TTS_VOICE_ID,
      providerId,
    ),
    voiceName: normalizeTtsVoiceNameForProvider(
      isLegacyPpqConfig ? "" : env.TTS_VOICE_NAME,
      providerId,
    ),
    languageCode: normalizeTtsLanguageCode(
      isLegacyPpqConfig ? "" : env.TTS_LANGUAGE_CODE,
    ),
    outputFormat: normalizeTtsOutputFormat(
      isLegacyPpqConfig ? "" : env.TTS_OUTPUT_FORMAT,
    ),
    stylePrompt: normalizeTtsStylePrompt(env.TTS_STYLE_PROMPT),
  };
}

function isLegacyPpqTtsConfig(env: AiRuntimeEnv) {
  const providerId = env.TTS_PROVIDER_ID?.trim().toLowerCase();
  const apiBaseUrl = env.TTS_API_BASE_URL?.trim().toLowerCase() ?? "";
  const model = env.TTS_MODEL?.trim().toLowerCase() ?? "";

  return (
    providerId === "ppq_tts" ||
    apiBaseUrl.includes("api.ppq.ai") ||
    model.includes("eleven") ||
    model.includes("deepgram")
  );
}

export function normalizeTtsModel(model?: string | null) {
  const normalized = model?.trim() || DEFAULT_TTS_MODEL;

  if (
    !normalized.toLowerCase().startsWith("gemini-") &&
    normalized.toLowerCase() !== DEFAULT_GLM_TTS_MODEL
  ) {
    return DEFAULT_TTS_MODEL;
  }

  return normalized;
}

export function normalizeTtsModelForProvider(
  model: string | null | undefined,
  providerId: string,
) {
  const normalized = model?.trim();

  if (providerId === DEFAULT_GLM_TTS_PROVIDER_ID) {
    return normalized?.toLowerCase() === DEFAULT_GLM_TTS_MODEL
      ? DEFAULT_GLM_TTS_MODEL
      : DEFAULT_GLM_TTS_MODEL;
  }

  return normalized?.toLowerCase().startsWith("gemini-")
    ? normalized
    : DEFAULT_TTS_MODEL;
}

export function normalizeTtsVoiceId(voiceId?: string | null) {
  return voiceId?.trim() || DEFAULT_TTS_VOICE_ID;
}

export function normalizeTtsVoiceIdForProvider(
  voiceId: string | null | undefined,
  providerId: string,
) {
  if (providerId === DEFAULT_GLM_TTS_PROVIDER_ID) {
    return voiceId?.trim() || DEFAULT_GLM_TTS_VOICE_ID;
  }

  return normalizeTtsVoiceId(voiceId);
}

export function normalizeTtsVoiceName(voiceName?: string | null) {
  return voiceName?.trim().slice(0, 160) || DEFAULT_TTS_VOICE_NAME;
}

export function normalizeTtsVoiceNameForProvider(
  voiceName: string | null | undefined,
  providerId: string,
) {
  if (providerId === DEFAULT_GLM_TTS_PROVIDER_ID) {
    return voiceName?.trim().slice(0, 160) || DEFAULT_GLM_TTS_VOICE_NAME;
  }

  return normalizeTtsVoiceName(voiceName);
}

export function normalizeTtsLanguageCode(languageCode?: string | null) {
  const normalized = languageCode?.trim().toLowerCase() || DEFAULT_TTS_LANGUAGE_CODE;
  if (isGenericTtsLanguageCode(normalized)) {
    return DEFAULT_TTS_LANGUAGE_CODE;
  }

  return normalized.slice(0, 16);
}

export function isGenericTtsLanguageCode(languageCode?: string | null) {
  const normalized = languageCode?.trim().toLowerCase();

  return (
    normalized === "multi" ||
    normalized === "multilingual" ||
    normalized === "auto" ||
    normalized === "any" ||
    normalized === "all"
  );
}

export function normalizeTtsOutputFormat(outputFormat?: string | null) {
  const normalized = outputFormat?.trim().toLowerCase() || DEFAULT_TTS_OUTPUT_FORMAT;

  if (normalized === "wav") {
    return normalized;
  }

  return DEFAULT_TTS_OUTPUT_FORMAT;
}

export function normalizeTtsStylePrompt(stylePrompt?: string | null) {
  return (stylePrompt?.trim() || DEFAULT_TTS_STYLE_PROMPT).slice(0, 1200);
}

export function normalizeNetworkProxyUrl(proxyUrl?: string | null) {
  const normalized = proxyUrl?.trim().replace(/\/+$/, "") ?? "";

  if (!normalized) {
    return "";
  }

  if (!/^https?:\/\/[^\s]+$/i.test(normalized)) {
    throw new Error("网络代理地址必须是 http 或 https URL。");
  }

  return normalized;
}

export function normalizeNoProxy(noProxy?: string | null) {
  return noProxy?.trim().slice(0, 500) || "localhost,127.0.0.1,::1";
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
  fs.mkdirSync(path.dirname(configPath), { recursive: true, mode: 0o700 });
  fs.chmodSync(path.dirname(configPath), 0o700);

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

  fs.writeFileSync(configPath, `${nextLines.join("\n")}\n`, {
    mode: 0o600,
  });
  fs.chmodSync(configPath, 0o600);
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

function compactAiTaskRouteEnv(env: Partial<Record<LocalConfigKey, string>>) {
  const compacted: Partial<Record<AiTaskRouteConfigKey, string>> = {};

  for (const key of aiTaskRouteConfigKeys) {
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

function compactTtsEnv(env: Partial<Record<LocalConfigKey, string>>) {
  const compacted: Partial<Record<TtsConfigKey, string>> = {};

  for (const key of ttsConfigKeys) {
    const value = env[key]?.trim();

    if (value) {
      compacted[key] = value;
    }
  }

  return compacted;
}

function compactNetworkProxyEnv(env: Partial<Record<LocalConfigKey, string>>) {
  const compacted: Partial<Record<NetworkProxyConfigKey, string>> = {};

  for (const key of networkProxyConfigKeys) {
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

function detectAiTaskRouteSource(
  taskType: AiTaskModelRouteTaskType,
  fileEnv: Partial<Record<LocalConfigKey, string>>,
  env: AiRuntimeEnv,
) {
  const keys = routeConfigKeysForTaskType(taskType);
  const routeKeys = [keys.apiKey, keys.model, keys.baseUrl] as const;

  if (routeKeys.some((key) => fileEnv[key]?.trim())) {
    return "file";
  }

  if (routeKeys.some((key) => env[key]?.trim())) {
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

function detectTtsConfigSource(
  fileEnv: Partial<Record<LocalConfigKey, string>>,
  env: AiRuntimeEnv,
) {
  if (Object.values(compactTtsEnv(fileEnv)).length > 0) {
    return "file";
  }

  if (
    env.TTS_PROVIDER_ID?.trim() ||
    env.TTS_API_KEY?.trim() ||
    env.TTS_API_BASE_URL?.trim() ||
    env.TTS_MODEL?.trim() ||
    env.TTS_VOICE_ID?.trim() ||
    env.TTS_VOICE_NAME?.trim() ||
    env.TTS_LANGUAGE_CODE?.trim() ||
    env.TTS_OUTPUT_FORMAT?.trim() ||
    env.TTS_STYLE_PROMPT?.trim()
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

function detectNetworkProxySource(
  fileEnv: Partial<Record<LocalConfigKey, string>>,
  env: AiRuntimeEnv,
) {
  if (Object.values(compactNetworkProxyEnv(fileEnv)).length > 0) {
    return "file";
  }

  if (
    env.HTTP_PROXY?.trim() ||
    env.HTTPS_PROXY?.trim() ||
    env.ALL_PROXY?.trim() ||
    env.NO_PROXY?.trim() ||
    env.http_proxy?.trim() ||
    env.https_proxy?.trim() ||
    env.all_proxy?.trim() ||
    env.no_proxy?.trim()
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

function isAiTaskModelRouteTaskType(
  taskType?: string | null,
): taskType is AiTaskModelRouteTaskType {
  return (
    taskType === "chapter_draft_generation" ||
    taskType === "chapter_polish_generation"
  );
}

function readAiTaskModelRouteSetting(
  taskType: AiTaskModelRouteTaskType,
  env: AiRuntimeEnv,
): AiTaskModelRouteSetting {
  const configPath = getAiConfigPath(env);
  const fileEnv = readLocalConfigFile(configPath);
  const runtimeEnv = {
    ...env,
    ...compactAiTaskRouteEnv(fileEnv),
  };
  const keys = routeConfigKeysForTaskType(taskType);
  const apiKey = runtimeEnv[keys.apiKey]?.trim() ?? "";

  return {
    taskType,
    label: aiTaskModelRouteLabel(taskType),
    hasApiKey: Boolean(apiKey),
    maskedApiKey: maskSecret(apiKey),
    model: normalizeKimiModel(runtimeEnv[keys.model]),
    baseUrl: normalizeKimiBaseUrl(runtimeEnv[keys.baseUrl]),
    isActive: Boolean(apiKey),
    source: detectAiTaskRouteSource(taskType, fileEnv, env),
  };
}

function readRouteApiKey(
  taskType: AiTaskModelRouteTaskType,
  env: AiRuntimeEnv,
) {
  const configPath = getAiConfigPath(env);
  const fileEnv = readLocalConfigFile(configPath);
  const runtimeEnv = {
    ...env,
    ...compactAiTaskRouteEnv(fileEnv),
  };
  const keys = routeConfigKeysForTaskType(taskType);

  return runtimeEnv[keys.apiKey]?.trim() ?? "";
}

function routeConfigKeysForTaskType(taskType: AiTaskModelRouteTaskType) {
  if (taskType === "chapter_draft_generation") {
    return {
      apiKey: "CHAPTER_DRAFT_API_KEY",
      model: "CHAPTER_DRAFT_MODEL",
      baseUrl: "CHAPTER_DRAFT_BASE_URL",
    } as const;
  }

  return {
    apiKey: "CHAPTER_POLISH_API_KEY",
    model: "CHAPTER_POLISH_MODEL",
    baseUrl: "CHAPTER_POLISH_BASE_URL",
  } as const;
}

function aiTaskModelRouteLabel(taskType: AiTaskModelRouteTaskType) {
  if (taskType === "chapter_draft_generation") {
    return "章节草稿生成";
  }

  return "正文精修";
}

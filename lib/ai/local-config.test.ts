import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_IMAGE_API_BASE_URL,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_IMAGE_QUALITY,
  DEFAULT_IMAGE_SIZE,
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_STATION_CAT_API_BASE_URL,
  DEFAULT_STATION_CAT_DEFAULT_MODE,
  DEFAULT_TTS_API_BASE_URL,
  DEFAULT_TTS_LANGUAGE_CODE,
  DEFAULT_TTS_MODEL,
  getAiRuntimeEnv,
  maskApiKey,
  parseAiEnv,
  parseImageGenerationEnv,
  parseNetworkProxyEnv,
  parseStationCatEnv,
  parseTtsGenerationEnv,
  readAiConnectionSettings,
  readImageGenerationSettings,
  readNetworkProxySettings,
  readStationCatPublishSettings,
  readTtsGenerationSettings,
  saveAiConnectionSettings,
  saveImageGenerationSettings,
  saveNetworkProxySettings,
  saveStationCatPublishSettings,
  saveTtsGenerationSettings,
} from "./local-config";

const tempRoots: string[] = [];
const originalEnv = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  IMAGE_API_KEY: process.env.IMAGE_API_KEY,
  IMAGE_API_BASE_URL: process.env.IMAGE_API_BASE_URL,
  IMAGE_MODEL: process.env.IMAGE_MODEL,
  IMAGE_SIZE: process.env.IMAGE_SIZE,
  IMAGE_QUALITY: process.env.IMAGE_QUALITY,
  TTS_PROVIDER_ID: process.env.TTS_PROVIDER_ID,
  TTS_API_KEY: process.env.TTS_API_KEY,
  TTS_API_BASE_URL: process.env.TTS_API_BASE_URL,
  TTS_MODEL: process.env.TTS_MODEL,
  TTS_VOICE_ID: process.env.TTS_VOICE_ID,
  TTS_VOICE_NAME: process.env.TTS_VOICE_NAME,
  TTS_LANGUAGE_CODE: process.env.TTS_LANGUAGE_CODE,
  TTS_OUTPUT_FORMAT: process.env.TTS_OUTPUT_FORMAT,
  TTS_STYLE_PROMPT: process.env.TTS_STYLE_PROMPT,
  STATION_CAT_API_BASE_URL: process.env.STATION_CAT_API_BASE_URL,
  STATION_CAT_PUBLISH_TOKEN: process.env.STATION_CAT_PUBLISH_TOKEN,
  STATION_CAT_DEFAULT_MODE: process.env.STATION_CAT_DEFAULT_MODE,
  HTTP_PROXY: process.env.HTTP_PROXY,
  HTTPS_PROXY: process.env.HTTPS_PROXY,
  ALL_PROXY: process.env.ALL_PROXY,
  NO_PROXY: process.env.NO_PROXY,
  http_proxy: process.env.http_proxy,
  https_proxy: process.env.https_proxy,
  all_proxy: process.env.all_proxy,
  no_proxy: process.env.no_proxy,
};

afterEach(() => {
  for (const tempRoot of tempRoots.splice(0)) {
    fs.rmSync(tempRoot, { force: true, recursive: true });
  }

  process.env.OPENAI_API_KEY = originalEnv.OPENAI_API_KEY;
  process.env.OPENAI_MODEL = originalEnv.OPENAI_MODEL;
  process.env.OPENAI_BASE_URL = originalEnv.OPENAI_BASE_URL;
  process.env.IMAGE_API_KEY = originalEnv.IMAGE_API_KEY;
  process.env.IMAGE_API_BASE_URL = originalEnv.IMAGE_API_BASE_URL;
  process.env.IMAGE_MODEL = originalEnv.IMAGE_MODEL;
  process.env.IMAGE_SIZE = originalEnv.IMAGE_SIZE;
  process.env.IMAGE_QUALITY = originalEnv.IMAGE_QUALITY;
  process.env.TTS_PROVIDER_ID = originalEnv.TTS_PROVIDER_ID;
  process.env.TTS_API_KEY = originalEnv.TTS_API_KEY;
  process.env.TTS_API_BASE_URL = originalEnv.TTS_API_BASE_URL;
  process.env.TTS_MODEL = originalEnv.TTS_MODEL;
  process.env.TTS_VOICE_ID = originalEnv.TTS_VOICE_ID;
  process.env.TTS_VOICE_NAME = originalEnv.TTS_VOICE_NAME;
  process.env.TTS_LANGUAGE_CODE = originalEnv.TTS_LANGUAGE_CODE;
  process.env.TTS_OUTPUT_FORMAT = originalEnv.TTS_OUTPUT_FORMAT;
  process.env.TTS_STYLE_PROMPT = originalEnv.TTS_STYLE_PROMPT;
  process.env.STATION_CAT_API_BASE_URL = originalEnv.STATION_CAT_API_BASE_URL;
  process.env.STATION_CAT_PUBLISH_TOKEN = originalEnv.STATION_CAT_PUBLISH_TOKEN;
  process.env.STATION_CAT_DEFAULT_MODE = originalEnv.STATION_CAT_DEFAULT_MODE;
  process.env.HTTP_PROXY = originalEnv.HTTP_PROXY;
  process.env.HTTPS_PROXY = originalEnv.HTTPS_PROXY;
  process.env.ALL_PROXY = originalEnv.ALL_PROXY;
  process.env.NO_PROXY = originalEnv.NO_PROXY;
  process.env.http_proxy = originalEnv.http_proxy;
  process.env.https_proxy = originalEnv.https_proxy;
  process.env.all_proxy = originalEnv.all_proxy;
  process.env.no_proxy = originalEnv.no_proxy;
});

describe("AI local connection config", () => {
  it("parses only supported server-side AI keys", () => {
    expect(
      parseAiEnv(
        [
          "# local AI config",
          "OPENAI_API_KEY=\"sk-test\"",
          "OPENAI_MODEL=deepseek-custom",
          "OPENAI_BASE_URL=https://api.example.com/v1/",
          "DATABASE_URL=file:ignored.db",
        ].join("\n"),
      ),
    ).toEqual({
      OPENAI_API_KEY: "sk-test",
      OPENAI_MODEL: "deepseek-custom",
      OPENAI_BASE_URL: "https://api.example.com/v1/",
    });
  });

  it("reads file config before environment fallbacks", () => {
    const configPath = makeTempConfigPath();
    fs.writeFileSync(
      configPath,
      [
        "OPENAI_API_KEY=file-key",
        "OPENAI_MODEL=file-model",
        "OPENAI_BASE_URL=https://file.example/v1",
      ].join("\n"),
    );

    expect(
      getAiRuntimeEnv({
        NOVELFORGE_AI_CONFIG_PATH: configPath,
        OPENAI_API_KEY: "env-key",
        OPENAI_MODEL: "env-model",
        OPENAI_BASE_URL: "https://env.example/v1",
      }),
    ).toMatchObject({
      OPENAI_API_KEY: "file-key",
      OPENAI_MODEL: "file-model",
      OPENAI_BASE_URL: "https://file.example/v1",
    });
  });

  it("saves custom model and base URL while keeping the current API key", () => {
    const configPath = makeTempConfigPath();
    fs.writeFileSync(
      configPath,
      ["DATABASE_URL=file:dev.db", "OPENAI_API_KEY=\"sk-existing\""].join("\n"),
    );

    const settings = saveAiConnectionSettings(
      {
        apiKey: "",
        model: "deepseek-v4-pro",
        baseUrl: "https://api.deepseek.example/v1/",
      },
      {
        NOVELFORGE_AI_CONFIG_PATH: configPath,
      },
    );
    const savedContent = fs.readFileSync(configPath, "utf8");

    expect(settings).toMatchObject({
      hasApiKey: true,
      maskedApiKey: "sk-exi...ting",
      model: "deepseek-v4-pro",
      baseUrl: "https://api.deepseek.example/v1",
      source: "file",
    });
    expect(savedContent).toContain("DATABASE_URL=file:dev.db");
    expect(savedContent).toContain('OPENAI_API_KEY="sk-existing"');
    expect(savedContent).toContain('OPENAI_MODEL="deepseek-v4-pro"');
    expect(savedContent).toContain(
      'OPENAI_BASE_URL="https://api.deepseek.example/v1"',
    );
  });

  it("can clear the saved API key without losing defaults", () => {
    const configPath = makeTempConfigPath();
    fs.writeFileSync(configPath, "OPENAI_API_KEY=sk-existing\n");

    const settings = saveAiConnectionSettings(
      {
        clearApiKey: true,
        model: "",
        baseUrl: "",
      },
      {
        NOVELFORGE_AI_CONFIG_PATH: configPath,
      },
    );

    expect(settings).toMatchObject({
      hasApiKey: false,
      model: DEFAULT_OPENAI_MODEL,
      baseUrl: DEFAULT_OPENAI_BASE_URL,
    });
    expect(fs.readFileSync(configPath, "utf8")).toContain("OPENAI_API_KEY=");
  });

  it("masks API keys without returning the full secret", () => {
    expect(maskApiKey("sk-1234567890")).toBe("sk-123...7890");
    expect(maskApiKey("")).toBe("未配置");
  });

  it("reports environment config when no file config exists", () => {
    const settings = readAiConnectionSettings({
      NOVELFORGE_AI_CONFIG_PATH: makeTempConfigPath(),
      OPENAI_API_KEY: "env-key",
      OPENAI_MODEL: "env-model",
      OPENAI_BASE_URL: "https://env.example/v1",
    });

    expect(settings).toMatchObject({
      hasApiKey: true,
      model: "env-model",
      baseUrl: "https://env.example/v1",
      source: "environment",
    });
  });
});

describe("Network proxy local config", () => {
  it("parses only supported proxy keys", () => {
    expect(
      parseNetworkProxyEnv(
        [
          "# network proxy config",
          "HTTP_PROXY=http://127.0.0.1:1082",
          "HTTPS_PROXY=http://127.0.0.1:1082",
          "ALL_PROXY=http://127.0.0.1:1082",
          "NO_PROXY=localhost,127.0.0.1,::1",
          "OPENAI_API_KEY=ignored",
          "http_proxy=ignored-lowercase",
        ].join("\n"),
      ),
    ).toEqual({
      HTTP_PROXY: "http://127.0.0.1:1082",
      HTTPS_PROXY: "http://127.0.0.1:1082",
      ALL_PROXY: "http://127.0.0.1:1082",
      NO_PROXY: "localhost,127.0.0.1,::1",
    });
  });

  it("saves proxy settings and exposes them through the runtime env", () => {
    const configPath = makeTempConfigPath();
    fs.writeFileSync(
      configPath,
      [
        "OPENAI_API_KEY=sk-existing",
        "TTS_API_KEY=tts-existing",
      ].join("\n"),
    );

    const settings = saveNetworkProxySettings(
      {
        noProxy: "localhost,127.0.0.1,::1",
        proxyUrl: "http://127.0.0.1:1082/",
      },
      {
        NOVELFORGE_AI_CONFIG_PATH: configPath,
      },
    );
    const savedContent = fs.readFileSync(configPath, "utf8");
    const runtimeEnv = getAiRuntimeEnv({
      NOVELFORGE_AI_CONFIG_PATH: configPath,
    });

    expect(settings).toMatchObject({
      proxyUrl: "http://127.0.0.1:1082",
      noProxy: "localhost,127.0.0.1,::1",
      source: "file",
    });
    expect(savedContent).toContain("OPENAI_API_KEY=sk-existing");
    expect(savedContent).toContain("TTS_API_KEY=tts-existing");
    expect(savedContent).toContain('HTTP_PROXY="http://127.0.0.1:1082"');
    expect(savedContent).toContain('HTTPS_PROXY="http://127.0.0.1:1082"');
    expect(savedContent).toContain('ALL_PROXY="http://127.0.0.1:1082"');
    expect(savedContent).toContain('NO_PROXY="localhost,127.0.0.1,::1"');
    expect(runtimeEnv).toMatchObject({
      HTTP_PROXY: "http://127.0.0.1:1082",
      HTTPS_PROXY: "http://127.0.0.1:1082",
      ALL_PROXY: "http://127.0.0.1:1082",
      NO_PROXY: "localhost,127.0.0.1,::1",
    });
  });

  it("reports proxy environment config when no file config exists", () => {
    const settings = readNetworkProxySettings({
      NOVELFORGE_AI_CONFIG_PATH: makeTempConfigPath(),
      HTTPS_PROXY: "http://127.0.0.1:1082",
      NO_PROXY: "localhost,127.0.0.1",
    });

    expect(settings).toMatchObject({
      proxyUrl: "http://127.0.0.1:1082",
      noProxy: "localhost,127.0.0.1",
      source: "environment",
    });
  });
});

describe("image generation local config", () => {
  it("parses only supported image generation keys", () => {
    expect(
      parseImageGenerationEnv(
        [
          "# cover image config",
          "IMAGE_API_KEY=\"img-key\"",
          "IMAGE_API_BASE_URL=https://api.ppq.ai/v1/",
          "IMAGE_MODEL=qwen-image-2",
          "IMAGE_SIZE=1024x1536",
          "IMAGE_QUALITY=high",
          "OPENAI_API_KEY=ignored",
        ].join("\n"),
      ),
    ).toEqual({
      IMAGE_API_KEY: "img-key",
      IMAGE_API_BASE_URL: "https://api.ppq.ai/v1/",
      IMAGE_MODEL: "qwen-image-2",
      IMAGE_SIZE: "1024x1536",
      IMAGE_QUALITY: "high",
    });
  });

  it("saves image settings without dropping AI or Station Cat settings", () => {
    const configPath = makeTempConfigPath();
    fs.writeFileSync(
      configPath,
      [
        "OPENAI_API_KEY=sk-existing",
        "OPENAI_MODEL=deepseek-v4-pro",
        "STATION_CAT_PUBLISH_TOKEN=station-token",
      ].join("\n"),
    );

    const settings = saveImageGenerationSettings(
      {
        apiBaseUrl: "https://api.ppq.ai/v1/",
        apiKey: "ppq-secret",
        model: "qwen-image-2",
        size: "1024x1536",
        quality: "standard",
      },
      {
        NOVELFORGE_AI_CONFIG_PATH: configPath,
      },
    );
    const savedContent = fs.readFileSync(configPath, "utf8");

    expect(settings).toMatchObject({
      hasApiKey: true,
      maskedApiKey: "ppq-se...cret",
      apiBaseUrl: "https://api.ppq.ai/v1",
      model: "qwen-image-2",
      size: "1024x1536",
      quality: "standard",
      source: "file",
    });
    expect(savedContent).toContain("OPENAI_API_KEY=sk-existing");
    expect(savedContent).toContain("OPENAI_MODEL=deepseek-v4-pro");
    expect(savedContent).toContain("STATION_CAT_PUBLISH_TOKEN=station-token");
    expect(savedContent).toContain('IMAGE_API_KEY="ppq-secret"');
    expect(savedContent).toContain('IMAGE_API_BASE_URL="https://api.ppq.ai/v1"');
    expect(savedContent).toContain('IMAGE_MODEL="qwen-image-2"');
    expect(savedContent).toContain('IMAGE_SIZE="1024x1536"');
    expect(savedContent).toContain('IMAGE_QUALITY="standard"');
  });

  it("can clear the saved image API key without losing defaults", () => {
    const configPath = makeTempConfigPath();
    fs.writeFileSync(configPath, "IMAGE_API_KEY=ppq-existing\n");

    const settings = saveImageGenerationSettings(
      {
        clearApiKey: true,
        apiBaseUrl: "",
        model: "",
        size: "",
        quality: "",
      },
      {
        NOVELFORGE_AI_CONFIG_PATH: configPath,
      },
    );

    expect(settings).toMatchObject({
      hasApiKey: false,
      apiBaseUrl: DEFAULT_IMAGE_API_BASE_URL,
      model: DEFAULT_IMAGE_MODEL,
      size: DEFAULT_IMAGE_SIZE,
      quality: DEFAULT_IMAGE_QUALITY,
    });
    expect(fs.readFileSync(configPath, "utf8")).toContain("IMAGE_API_KEY=");
  });

  it("reports image environment config when no file config exists", () => {
    const settings = readImageGenerationSettings({
      NOVELFORGE_AI_CONFIG_PATH: makeTempConfigPath(),
      IMAGE_API_KEY: "env-image-key",
      IMAGE_API_BASE_URL: "https://env.image.example/v1",
      IMAGE_MODEL: "env-image-model",
      IMAGE_SIZE: "1024x1024",
      IMAGE_QUALITY: "high",
    });

    expect(settings).toMatchObject({
      hasApiKey: true,
      apiBaseUrl: "https://env.image.example/v1",
      model: "env-image-model",
      size: "1024x1024",
      quality: "high",
      source: "environment",
    });
  });
});

describe("TTS generation local config", () => {
  it("parses only supported TTS keys", () => {
    expect(
      parseTtsGenerationEnv(
        [
          "# audiobook config",
          "TTS_PROVIDER_ID=google_tts",
          "TTS_API_KEY=\"tts-key\"",
          "TTS_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta/",
          "TTS_MODEL=gemini-2.5-flash-preview-tts",
          "TTS_VOICE_ID=Kore",
          "TTS_VOICE_NAME=Kore - Firm",
          "TTS_LANGUAGE_CODE=cmn",
          "TTS_OUTPUT_FORMAT=wav",
          "TTS_STYLE_PROMPT=中文小说旁白",
          "IMAGE_API_KEY=ignored",
        ].join("\n"),
      ),
    ).toEqual({
      TTS_PROVIDER_ID: "google_tts",
      TTS_API_KEY: "tts-key",
      TTS_API_BASE_URL: "https://generativelanguage.googleapis.com/v1beta/",
      TTS_MODEL: "gemini-2.5-flash-preview-tts",
      TTS_VOICE_ID: "Kore",
      TTS_VOICE_NAME: "Kore - Firm",
      TTS_LANGUAGE_CODE: "cmn",
      TTS_OUTPUT_FORMAT: "wav",
      TTS_STYLE_PROMPT: "中文小说旁白",
    });
  });

  it("saves TTS settings without dropping other local settings", () => {
    const configPath = makeTempConfigPath();
    fs.writeFileSync(
      configPath,
      [
        "OPENAI_API_KEY=sk-existing",
        "IMAGE_API_KEY=image-secret",
        "STATION_CAT_PUBLISH_TOKEN=station-token",
      ].join("\n"),
    );

    const settings = saveTtsGenerationSettings(
      {
        apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta/",
        apiKey: "tts-secret",
        languageCode: "cmn",
        model: "gemini-2.5-flash-preview-tts",
        outputFormat: "wav",
        providerId: "google_tts",
        stylePrompt: "中文长篇小说旁白",
        voiceId: "Kore",
        voiceName: "Kore - Firm",
      },
      {
        NOVELFORGE_AI_CONFIG_PATH: configPath,
      },
    );
    const savedContent = fs.readFileSync(configPath, "utf8");

    expect(settings).toMatchObject({
      apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
      hasApiKey: true,
      languageCode: "cmn",
      model: "gemini-2.5-flash-preview-tts",
      source: "file",
      voiceId: "Kore",
    });
    expect(savedContent).toContain("OPENAI_API_KEY=sk-existing");
    expect(savedContent).toContain("IMAGE_API_KEY=image-secret");
    expect(savedContent).toContain("STATION_CAT_PUBLISH_TOKEN=station-token");
    expect(savedContent).toContain('TTS_API_KEY="tts-secret"');
    expect(savedContent).toContain(
      'TTS_API_BASE_URL="https://generativelanguage.googleapis.com/v1beta"',
    );
    expect(savedContent).toContain('TTS_MODEL="gemini-2.5-flash-preview-tts"');
    expect(savedContent).toContain('TTS_VOICE_ID="Kore"');
  });

  it("can clear the saved TTS API key without losing defaults", () => {
    const configPath = makeTempConfigPath();
    fs.writeFileSync(configPath, "TTS_API_KEY=tts-existing\n");

    const settings = saveTtsGenerationSettings(
      {
        clearApiKey: true,
        apiBaseUrl: "",
        languageCode: "",
        model: "",
        outputFormat: "",
        providerId: "",
      },
      {
        NOVELFORGE_AI_CONFIG_PATH: configPath,
      },
    );

    expect(settings).toMatchObject({
      apiBaseUrl: DEFAULT_TTS_API_BASE_URL,
      hasApiKey: false,
      languageCode: DEFAULT_TTS_LANGUAGE_CODE,
      model: DEFAULT_TTS_MODEL,
    });
    expect(fs.readFileSync(configPath, "utf8")).toContain("TTS_API_KEY=");
  });

  it("normalizes generic TTS language labels to the default concrete language", () => {
    const configPath = makeTempConfigPath();
    fs.writeFileSync(configPath, "TTS_LANGUAGE_CODE=multi\n");

    const settings = readTtsGenerationSettings({
      NOVELFORGE_AI_CONFIG_PATH: configPath,
    });

    expect(settings.languageCode).toBe(DEFAULT_TTS_LANGUAGE_CODE);
  });

  it("migrates legacy PPQ TTS settings to Google Gemini defaults", () => {
    const configPath = makeTempConfigPath();
    fs.writeFileSync(
      configPath,
      [
        "TTS_PROVIDER_ID=ppq_tts",
        "TTS_API_KEY=ppq-existing",
        "TTS_API_BASE_URL=https://api.ppq.ai/v1",
        "TTS_MODEL=eleven_multilingual_v2",
        "TTS_VOICE_ID=old-voice",
        "TTS_OUTPUT_FORMAT=mp3",
      ].join("\n"),
    );

    const settings = readTtsGenerationSettings({
      NOVELFORGE_AI_CONFIG_PATH: configPath,
    });

    expect(settings).toMatchObject({
      apiBaseUrl: DEFAULT_TTS_API_BASE_URL,
      hasApiKey: false,
      languageCode: DEFAULT_TTS_LANGUAGE_CODE,
      model: DEFAULT_TTS_MODEL,
      outputFormat: "wav",
      providerId: "google_tts",
      voiceId: "Kore",
    });
  });

  it("reports TTS environment config when no file config exists", () => {
    const settings = readTtsGenerationSettings({
      NOVELFORGE_AI_CONFIG_PATH: makeTempConfigPath(),
      TTS_API_BASE_URL: "https://generativelanguage.googleapis.com/v1beta",
      TTS_API_KEY: "env-tts-key",
      TTS_LANGUAGE_CODE: "cmn",
      TTS_MODEL: "gemini-2.5-pro-preview-tts",
      TTS_PROVIDER_ID: "google_tts",
      TTS_VOICE_ID: "Kore",
    });

    expect(settings).toMatchObject({
      apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
      hasApiKey: true,
      model: "gemini-2.5-pro-preview-tts",
      source: "environment",
      voiceId: "Kore",
    });
  });
});

describe("Station Cat local publish config", () => {
  it("parses only supported Station Cat keys", () => {
    expect(
      parseStationCatEnv(
        [
          "# station cat config",
          "STATION_CAT_API_BASE_URL=https://wwwstationcat.org/",
          "STATION_CAT_PUBLISH_TOKEN=\"publish-token\"",
          "STATION_CAT_DEFAULT_MODE=publish",
          "OPENAI_API_KEY=ignored",
        ].join("\n"),
      ),
    ).toEqual({
      STATION_CAT_API_BASE_URL: "https://wwwstationcat.org/",
      STATION_CAT_PUBLISH_TOKEN: "publish-token",
      STATION_CAT_DEFAULT_MODE: "publish",
    });
  });

  it("saves global Station Cat settings without dropping AI settings", () => {
    const configPath = makeTempConfigPath();
    fs.writeFileSync(
      configPath,
      [
        "OPENAI_API_KEY=sk-existing",
        "OPENAI_MODEL=deepseek-v4-pro",
      ].join("\n"),
    );

    const settings = saveStationCatPublishSettings(
      {
        apiBaseUrl: "https://wwwstationcat.org/",
        token: "station-cat-secret",
        defaultMode: "publish",
      },
      {
        NOVELFORGE_AI_CONFIG_PATH: configPath,
      },
    );
    const savedContent = fs.readFileSync(configPath, "utf8");

    expect(settings).toMatchObject({
      hasToken: true,
      maskedToken: "statio...cret",
      apiBaseUrl: "https://wwwstationcat.org",
      defaultMode: "publish",
      source: "file",
    });
    expect(savedContent).toContain("OPENAI_API_KEY=sk-existing");
    expect(savedContent).toContain("OPENAI_MODEL=deepseek-v4-pro");
    expect(savedContent).toContain(
      'STATION_CAT_API_BASE_URL="https://wwwstationcat.org"',
    );
    expect(savedContent).toContain('STATION_CAT_PUBLISH_TOKEN="station-cat-secret"');
    expect(savedContent).toContain('STATION_CAT_DEFAULT_MODE="publish"');
  });

  it("can clear the saved Station Cat token without losing defaults", () => {
    const configPath = makeTempConfigPath();
    fs.writeFileSync(configPath, "STATION_CAT_PUBLISH_TOKEN=station-token\n");

    const settings = saveStationCatPublishSettings(
      {
        clearToken: true,
        apiBaseUrl: "",
        defaultMode: "",
      },
      {
        NOVELFORGE_AI_CONFIG_PATH: configPath,
      },
    );

    expect(settings).toMatchObject({
      hasToken: false,
      apiBaseUrl: DEFAULT_STATION_CAT_API_BASE_URL,
      defaultMode: DEFAULT_STATION_CAT_DEFAULT_MODE,
    });
    expect(fs.readFileSync(configPath, "utf8")).toContain(
      "STATION_CAT_PUBLISH_TOKEN=",
    );
  });

  it("reports Station Cat environment config when no file config exists", () => {
    const settings = readStationCatPublishSettings({
      NOVELFORGE_AI_CONFIG_PATH: makeTempConfigPath(),
      STATION_CAT_API_BASE_URL: "https://env.stationcat.example",
      STATION_CAT_PUBLISH_TOKEN: "env-token",
      STATION_CAT_DEFAULT_MODE: "publish",
    });

    expect(settings).toMatchObject({
      hasToken: true,
      apiBaseUrl: "https://env.stationcat.example",
      defaultMode: "publish",
      source: "environment",
    });
  });
});

function makeTempConfigPath() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "novelforge-ai-config-"));
  tempRoots.push(tempRoot);

  return path.join(tempRoot, ".env");
}

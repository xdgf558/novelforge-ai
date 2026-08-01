import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_IMAGE_API_BASE_URL,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_IMAGE_QUALITY,
  DEFAULT_IMAGE_SIZE,
  DEFAULT_GLM_TTS_API_BASE_URL,
  DEFAULT_GLM_TTS_MODEL,
  DEFAULT_GLM_TTS_VOICE_ID,
  DEFAULT_KIMI_API_BASE_URL,
  DEFAULT_KIMI_K2_6_MODEL,
  DEFAULT_KIMI_K3_MODEL,
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_OPENAI_MODEL,
  GPT_5_6_LUNA_MODEL,
  DEFAULT_STATION_CAT_API_BASE_URL,
  DEFAULT_STATION_CAT_DEFAULT_MODE,
  DEFAULT_TTS_API_BASE_URL,
  DEFAULT_TTS_LANGUAGE_CODE,
  DEFAULT_TTS_MODEL,
  getAiRuntimeEnv,
  getAiRuntimeEnvForTaskType,
  maskApiKey,
  parseAiEnv,
  parseAiTaskModelRouteEnv,
  parseImageGenerationEnv,
  parseNetworkProxyEnv,
  parseStationCatEnv,
  parseTtsGenerationEnv,
  readAiConnectionSettings,
  readAiTaskModelRouteSettings,
  readImageGenerationSettings,
  readNetworkProxySettings,
  readStationCatPublishSettings,
  readTtsGenerationSettings,
  saveAiConnectionSettings,
  saveAiTaskModelRouteSettings,
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
  CHAPTER_DRAFT_API_KEY: process.env.CHAPTER_DRAFT_API_KEY,
  CHAPTER_DRAFT_MODEL: process.env.CHAPTER_DRAFT_MODEL,
  CHAPTER_DRAFT_BASE_URL: process.env.CHAPTER_DRAFT_BASE_URL,
  CHAPTER_POLISH_API_KEY: process.env.CHAPTER_POLISH_API_KEY,
  CHAPTER_POLISH_MODEL: process.env.CHAPTER_POLISH_MODEL,
  CHAPTER_POLISH_BASE_URL: process.env.CHAPTER_POLISH_BASE_URL,
  CHAPTER_POLISH_USE_DRAFT_CONNECTION:
    process.env.CHAPTER_POLISH_USE_DRAFT_CONNECTION,
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
  process.env.CHAPTER_DRAFT_API_KEY = originalEnv.CHAPTER_DRAFT_API_KEY;
  process.env.CHAPTER_DRAFT_MODEL = originalEnv.CHAPTER_DRAFT_MODEL;
  process.env.CHAPTER_DRAFT_BASE_URL = originalEnv.CHAPTER_DRAFT_BASE_URL;
  process.env.CHAPTER_POLISH_API_KEY = originalEnv.CHAPTER_POLISH_API_KEY;
  process.env.CHAPTER_POLISH_MODEL = originalEnv.CHAPTER_POLISH_MODEL;
  process.env.CHAPTER_POLISH_BASE_URL = originalEnv.CHAPTER_POLISH_BASE_URL;
  process.env.CHAPTER_POLISH_USE_DRAFT_CONNECTION =
    originalEnv.CHAPTER_POLISH_USE_DRAFT_CONNECTION;
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

describe("AI task model route config", () => {
  it("parses only supported task-level route keys", () => {
    expect(
      parseAiTaskModelRouteEnv(
        [
          "CHAPTER_DRAFT_API_KEY=kimi-draft",
          "CHAPTER_DRAFT_MODEL=kimi-k2.6",
          "CHAPTER_DRAFT_BASE_URL=https://api.moonshot.cn/v1/",
          "CHAPTER_POLISH_API_KEY=kimi-polish",
          "CHAPTER_POLISH_MODEL=kimi-k2.6-polish",
          "CHAPTER_POLISH_BASE_URL=https://kimi.example/v1",
          "CHAPTER_POLISH_USE_DRAFT_CONNECTION=1",
          "OPENAI_API_KEY=ignored",
        ].join("\n"),
      ),
    ).toEqual({
      CHAPTER_DRAFT_API_KEY: "kimi-draft",
      CHAPTER_DRAFT_MODEL: "kimi-k2.6",
      CHAPTER_DRAFT_BASE_URL: "https://api.moonshot.cn/v1/",
      CHAPTER_POLISH_API_KEY: "kimi-polish",
      CHAPTER_POLISH_MODEL: "kimi-k2.6-polish",
      CHAPTER_POLISH_BASE_URL: "https://kimi.example/v1",
      CHAPTER_POLISH_USE_DRAFT_CONNECTION: "1",
    });
  });

  it("reads inactive Kimi routes as defaults until their keys are configured", () => {
    const settings = readAiTaskModelRouteSettings({
      NOVELFORGE_AI_CONFIG_PATH: makeTempConfigPath(),
    });

    expect(settings.routes.chapterDraft).toMatchObject({
      taskType: "chapter_draft_generation",
      model: DEFAULT_KIMI_K2_6_MODEL,
      baseUrl: DEFAULT_KIMI_API_BASE_URL,
      hasApiKey: false,
      isActive: false,
      source: "default",
    });
    expect(settings.routes.chapterPolish).toMatchObject({
      taskType: "chapter_polish_generation",
      model: DEFAULT_KIMI_K3_MODEL,
      baseUrl: DEFAULT_KIMI_API_BASE_URL,
      hasApiKey: false,
      isActive: false,
      useDraftConnection: false,
      isUsingSharedConnection: false,
      source: "default",
    });
  });

  it("keeps an explicitly saved K2.6 polish model after the K3 default upgrade", () => {
    const configPath = makeTempConfigPath();
    fs.writeFileSync(
      configPath,
      [
        "CHAPTER_POLISH_API_KEY=kimi-polish",
        "CHAPTER_POLISH_MODEL=kimi-k2.6",
        "CHAPTER_POLISH_BASE_URL=https://api.moonshot.cn/v1",
      ].join("\n"),
    );

    const settings = readAiTaskModelRouteSettings({
      NOVELFORGE_AI_CONFIG_PATH: configPath,
    });

    expect(settings.routes.chapterPolish).toMatchObject({
      model: "kimi-k2.6",
      hasApiKey: true,
      isActive: true,
      isUsingSharedConnection: false,
    });
  });

  it("lets K3 polish and whole-story review reuse the draft Kimi connection", () => {
    const configPath = makeTempConfigPath();
    const settings = saveAiTaskModelRouteSettings(
      {
        draftApiKey: "shared-kimi-key",
        draftModel: "kimi-k2.6",
        draftBaseUrl: "https://kimi-gateway.example/v1",
        polishApiKey: "",
        polishModel: "",
        polishBaseUrl: "https://unused.example/v1",
        polishUseDraftConnection: true,
      },
      {
        NOVELFORGE_AI_CONFIG_PATH: configPath,
      },
    );
    const wholeReviewEnv = getAiRuntimeEnvForTaskType(
      "short_story_whole_review",
      {
        NOVELFORGE_AI_CONFIG_PATH: configPath,
      },
    );
    const savedContent = fs.readFileSync(configPath, "utf8");

    expect(settings.routes.chapterPolish).toMatchObject({
      model: DEFAULT_KIMI_K3_MODEL,
      baseUrl: "https://kimi-gateway.example/v1",
      hasApiKey: true,
      isActive: true,
      useDraftConnection: true,
      isUsingSharedConnection: true,
      maskedApiKey: "shared...-key",
    });
    expect(wholeReviewEnv).toMatchObject({
      OPENAI_API_KEY: "shared-kimi-key",
      OPENAI_MODEL: DEFAULT_KIMI_K3_MODEL,
      OPENAI_BASE_URL: "https://kimi-gateway.example/v1",
    });
    expect(savedContent).toContain(
      'CHAPTER_POLISH_USE_DRAFT_CONNECTION="1"',
    );
  });

  it("saves task-level Kimi route settings while preserving existing keys", () => {
    const configPath = makeTempConfigPath();
    fs.writeFileSync(
      configPath,
      [
        "OPENAI_API_KEY=deepseek-existing",
        "CHAPTER_DRAFT_API_KEY=kimi-draft-existing",
      ].join("\n"),
    );

    const settings = saveAiTaskModelRouteSettings(
      {
        draftApiKey: "",
        draftModel: "kimi-k2.6",
        draftBaseUrl: "https://api.moonshot.cn/v1/",
        polishApiKey: "kimi-polish-new",
        polishModel: "kimi-k2.6",
        polishBaseUrl: "https://api.moonshot.cn/v1",
      },
      {
        NOVELFORGE_AI_CONFIG_PATH: configPath,
      },
    );
    const savedContent = fs.readFileSync(configPath, "utf8");

    expect(settings.routes.chapterDraft).toMatchObject({
      hasApiKey: true,
      maskedApiKey: "kimi-d...ting",
      model: "kimi-k2.6",
      baseUrl: "https://api.moonshot.cn/v1",
      isActive: true,
      source: "file",
    });
    expect(settings.routes.chapterPolish).toMatchObject({
      hasApiKey: true,
      maskedApiKey: "kimi-p...-new",
      model: "kimi-k2.6",
      baseUrl: "https://api.moonshot.cn/v1",
      isActive: true,
      source: "file",
    });
    expect(savedContent).toContain("OPENAI_API_KEY=deepseek-existing");
    expect(savedContent).toContain(
      'CHAPTER_DRAFT_API_KEY="kimi-draft-existing"',
    );
    expect(savedContent).toContain('CHAPTER_POLISH_API_KEY="kimi-polish-new"');
  });

  it("routes GPT-5.6 Luna chapter drafts through the OpenAI endpoint", () => {
    const configPath = makeTempConfigPath();
    const settings = saveAiTaskModelRouteSettings(
      {
        draftApiKey: "sk-luna-test",
        draftModel: GPT_5_6_LUNA_MODEL,
        // Mirrors changing only the model in the settings form, which initially
        // contains the Kimi default address.
        draftBaseUrl: DEFAULT_KIMI_API_BASE_URL,
        polishApiKey: "",
        polishModel: "",
        polishBaseUrl: "",
      },
      {
        NOVELFORGE_AI_CONFIG_PATH: configPath,
      },
    );
    const draftEnv = getAiRuntimeEnvForTaskType("chapter_draft_generation", {
      NOVELFORGE_AI_CONFIG_PATH: configPath,
    });

    expect(settings.routes.chapterDraft).toMatchObject({
      model: GPT_5_6_LUNA_MODEL,
      baseUrl: DEFAULT_OPENAI_BASE_URL,
      hasApiKey: true,
      isActive: true,
    });
    expect(draftEnv).toMatchObject({
      OPENAI_API_KEY: "sk-luna-test",
      OPENAI_MODEL: GPT_5_6_LUNA_MODEL,
      OPENAI_BASE_URL: DEFAULT_OPENAI_BASE_URL,
    });
    expect(fs.readFileSync(configPath, "utf8")).toContain(
      `CHAPTER_DRAFT_MODEL="${GPT_5_6_LUNA_MODEL}"`,
    );
  });

  it("can clear one task route key without clearing the other route", () => {
    const configPath = makeTempConfigPath();
    fs.writeFileSync(
      configPath,
      [
        "CHAPTER_DRAFT_API_KEY=kimi-draft",
        "CHAPTER_POLISH_API_KEY=kimi-polish",
      ].join("\n"),
    );

    const settings = saveAiTaskModelRouteSettings(
      {
        clearDraftApiKey: true,
        draftModel: "",
        draftBaseUrl: "",
        polishApiKey: "",
        polishModel: "kimi-k2.6",
        polishBaseUrl: "https://api.moonshot.cn/v1",
      },
      {
        NOVELFORGE_AI_CONFIG_PATH: configPath,
      },
    );
    const savedContent = fs.readFileSync(configPath, "utf8");

    expect(settings.routes.chapterDraft).toMatchObject({
      hasApiKey: false,
      isActive: false,
      model: DEFAULT_KIMI_K2_6_MODEL,
      baseUrl: DEFAULT_KIMI_API_BASE_URL,
    });
    expect(settings.routes.chapterPolish).toMatchObject({
      hasApiKey: true,
      isActive: true,
      model: "kimi-k2.6",
    });
    expect(savedContent).toContain("CHAPTER_DRAFT_API_KEY=");
    expect(savedContent).toContain('CHAPTER_POLISH_API_KEY="kimi-polish"');
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

  it("supports GLM-TTS settings and provider-specific defaults", () => {
    const configPath = makeTempConfigPath();

    const settings = saveTtsGenerationSettings(
      {
        apiBaseUrl: DEFAULT_TTS_API_BASE_URL,
        apiKey: "glm-secret",
        languageCode: "zh",
        model: "gemini-2.5-flash-preview-tts",
        outputFormat: "wav",
        providerId: "glm_tts",
        voiceId: "",
        voiceName: "",
      },
      {
        NOVELFORGE_AI_CONFIG_PATH: configPath,
      },
    );

    expect(settings).toMatchObject({
      apiBaseUrl: DEFAULT_GLM_TTS_API_BASE_URL,
      hasApiKey: true,
      model: DEFAULT_GLM_TTS_MODEL,
      providerId: "glm_tts",
      voiceId: DEFAULT_GLM_TTS_VOICE_ID,
    });
    expect(fs.readFileSync(configPath, "utf8")).toContain('TTS_MODEL="glm-tts"');
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

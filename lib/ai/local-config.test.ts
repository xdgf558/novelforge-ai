import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_OPENAI_MODEL,
  getAiRuntimeEnv,
  maskApiKey,
  parseAiEnv,
  readAiConnectionSettings,
  saveAiConnectionSettings,
} from "./local-config";

const tempRoots: string[] = [];
const originalEnv = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
};

afterEach(() => {
  for (const tempRoot of tempRoots.splice(0)) {
    fs.rmSync(tempRoot, { force: true, recursive: true });
  }

  process.env.OPENAI_API_KEY = originalEnv.OPENAI_API_KEY;
  process.env.OPENAI_MODEL = originalEnv.OPENAI_MODEL;
  process.env.OPENAI_BASE_URL = originalEnv.OPENAI_BASE_URL;
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

function makeTempConfigPath() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "novelforge-ai-config-"));
  tempRoots.push(tempRoot);

  return path.join(tempRoot, ".env");
}

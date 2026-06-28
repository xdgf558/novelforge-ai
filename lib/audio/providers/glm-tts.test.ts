import { describe, expect, it, vi } from "vitest";
import {
  buildGlmTtsPayload,
  GlmTtsProvider,
  glmTtsVoiceOptions,
} from "./glm-tts";

describe("GLM-TTS provider", () => {
  it("builds the GLM-TTS speech payload", () => {
    const payload = buildGlmTtsPayload({
      inputText: "你好，离线未来。",
      languageCode: "zh",
      modelId: "glm-tts",
      outputFormat: "wav",
      providerId: "glm_tts",
      stylePrompt: "中文小说旁白，语气自然沉稳。",
      voiceId: "female",
    });

    expect(payload).toMatchObject({
      model: "glm-tts",
      response_format: "wav",
      speed: 1,
      voice: "female",
      volume: 1,
    });
    expect(payload.input).toContain("你好，离线未来。");
  });

  it("returns built-in GLM voice options without a network request", async () => {
    const provider = new GlmTtsProvider({
      settings: {
        apiBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
        apiKey: "glm-key",
      },
    });

    await expect(provider.listVoices()).resolves.toEqual(glmTtsVoiceOptions);
  });

  it("calls the BigModel audio speech endpoint and returns WAV bytes", async () => {
    const wavBytes = makeTinyWav();
    const fetchImpl = vi.fn(async () =>
      new Response(wavBytes, {
        headers: {
          "content-type": "audio/wav",
          "x-request-id": "glm_req_1",
        },
        status: 200,
      }),
    );
    const provider = new GlmTtsProvider({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      settings: {
        apiBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
        apiKey: "glm-key",
      },
    });

    const result = await provider.synthesizeSegment({
      inputText: "你好。",
      languageCode: "zh",
      modelId: "glm-tts",
      outputFormat: "wav",
      providerId: "glm_tts",
      voiceId: "female",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://open.bigmodel.cn/api/paas/v4/audio/speech",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer glm-key",
        }),
        method: "POST",
      }),
    );
    expect(result.contentType).toBe("audio/wav");
    expect(result.audioBytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(result.providerRequestId).toBe("glm_req_1");
  });

  it("surfaces GLM error messages", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: {
            code: "1214",
            message: "音色id不存在",
          },
        }),
        {
          headers: {
            "content-type": "application/json",
          },
          status: 400,
        },
      ),
    );
    const provider = new GlmTtsProvider({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      settings: {
        apiBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
        apiKey: "glm-key",
      },
    });

    await expect(
      provider.synthesizeSegment({
        inputText: "你好。",
        languageCode: "zh",
        modelId: "glm-tts",
        outputFormat: "wav",
        providerId: "glm_tts",
        voiceId: "test",
      }),
    ).rejects.toThrow("音色id不存在");
  });
});

function makeTinyWav() {
  const pcm = Buffer.from([0, 0, 1, 0]);
  const header = Buffer.alloc(44);

  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.byteLength, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(24000, 24);
  header.writeUInt32LE(48000, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.byteLength, 40);

  return Buffer.concat([header, pcm]);
}

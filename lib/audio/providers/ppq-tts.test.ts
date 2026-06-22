import { describe, expect, it, vi } from "vitest";
import {
  buildPpqSpeechPayload,
  extractPpqVoices,
  PpqTtsProvider,
  readAudioResponseBytes,
} from "./ppq-tts";

describe("PPQ TTS provider", () => {
  it("builds OpenAI-compatible speech payload with ElevenLabs voice id", () => {
    expect(
      buildPpqSpeechPayload({
        providerId: "ppq_tts",
        inputText: "你好，欢迎来到离线未来。",
        languageCode: "zh",
        modelId: "eleven_multilingual_v2",
        outputFormat: "mp3",
        stylePrompt: "中文小说旁白",
        voiceId: "voice_123",
      }),
    ).toEqual({
      input: "你好，欢迎来到离线未来。",
      instructions: "中文小说旁白",
      language: "zh",
      model: "eleven_multilingual_v2",
      voice: "voice_123",
    });
  });

  it("extracts voices from common PPQ response shapes", () => {
    expect(
      extractPpqVoices(
        {
          data: [
            {
              id: "voice_1",
              name: "George",
              provider: "ElevenLabs",
              language: "zh",
            },
            {
              voice_id: "voice_2",
              display_name: "Aura",
              provider: "Deepgram",
            },
          ],
        },
        "eleven_multilingual_v2",
      ),
    ).toEqual([
      expect.objectContaining({
        id: "voice_1",
        name: "George",
        provider: "ElevenLabs",
      }),
    ]);
  });

  it("lists voices with authorization header", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "voice_1",
              name: "Narrator",
              provider: "ElevenLabs",
            },
          ],
        }),
        {
          status: 200,
        },
      ),
    );
    const provider = new PpqTtsProvider({
      fetchImpl,
      settings: {
        apiBaseUrl: "https://api.ppq.ai/v1",
        apiKey: "ppq-key",
      },
    });

    await expect(
      provider.listVoices({
        languageCode: "zh",
        modelId: "eleven_multilingual_v2",
      }),
    ).resolves.toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.ppq.ai/v1/audio/voices?language=zh",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer ppq-key",
        },
      }),
    );
  });

  it("retries voice listing without language when the filtered request fails", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "unsupported language" }), {
          status: 400,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            object: "list",
            data: [
              {
                id: "voice_1",
                language: "multi",
                model_id: "eleven_v3",
                name: "Narrator",
                provider: "elevenlabs",
              },
            ],
          }),
          {
            status: 200,
          },
        ),
      );
    const provider = new PpqTtsProvider({
      fetchImpl,
      settings: {
        apiBaseUrl: "https://api.ppq.ai/v1",
        apiKey: "ppq-key",
      },
    });

    await expect(
      provider.listVoices({
        languageCode: "zh",
        modelId: "eleven_multilingual_v2",
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: "voice_1",
        name: "Narrator",
      }),
    ]);
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "https://api.ppq.ai/v1/audio/voices?language=zh",
      expect.any(Object),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "https://api.ppq.ai/v1/audio/voices",
      expect.any(Object),
    );
  });

  it("rejects segments above the model safety limit", async () => {
    const provider = new PpqTtsProvider({
      fetchImpl: vi.fn(),
      settings: {
        apiBaseUrl: "https://api.ppq.ai/v1",
        apiKey: "ppq-key",
      },
    });

    await expect(
      provider.synthesizeSegment({
        providerId: "ppq_tts",
        inputText: "a".repeat(5001),
        languageCode: "zh",
        modelId: "eleven_multilingual_v2",
        outputFormat: "mp3",
      }),
    ).rejects.toThrow("超过当前模型");
  });

  it("rejects successful non-audio responses", async () => {
    const provider = new PpqTtsProvider({
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "not audio" }), {
          headers: {
            "content-type": "application/json",
          },
          status: 200,
        }),
      ),
      settings: {
        apiBaseUrl: "https://api.ppq.ai/v1",
        apiKey: "ppq-key",
      },
    });

    await expect(
      provider.synthesizeSegment({
        providerId: "ppq_tts",
        inputText: "一段正常文本。",
        languageCode: "zh",
        modelId: "eleven_multilingual_v2",
        outputFormat: "mp3",
      }),
    ).rejects.toThrow("不是音频响应");
  });

  it("rejects audio responses above the content-length limit", async () => {
    const response = new Response("audio", {
      headers: {
        "content-length": "11",
      },
      status: 200,
    });

    await expect(readAudioResponseBytes(response, 10)).rejects.toThrow(
      "超过单段大小上限",
    );
  });

  it("rejects streamed audio responses above the byte limit", async () => {
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(6));
          controller.enqueue(new Uint8Array(6));
          controller.close();
        },
      }),
      {
        status: 200,
      },
    );

    await expect(readAudioResponseBytes(response, 10)).rejects.toThrow(
      "超过单段大小上限",
    );
  });

  it("reads normal audio response bytes", async () => {
    const response = new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
    });

    await expect(readAudioResponseBytes(response, 10)).resolves.toEqual(
      Buffer.from([1, 2, 3]),
    );
  });
});

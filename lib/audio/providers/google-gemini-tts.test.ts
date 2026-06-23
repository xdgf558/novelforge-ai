import { describe, expect, it, vi } from "vitest";
import {
  buildGeminiTtsPayload,
  extractGeminiAudio,
  GoogleGeminiTtsProvider,
  googleGeminiVoiceOptions,
  wrapPcm16AsWav,
} from "./google-gemini-tts";

describe("Google Gemini TTS provider", () => {
  it("builds a Gemini audio generation payload with a prebuilt voice", () => {
    const payload = buildGeminiTtsPayload({
      inputText: "你好，离线未来。",
      languageCode: "cmn",
      modelId: "gemini-2.5-flash-preview-tts",
      outputFormat: "wav",
      providerId: "google_tts",
      stylePrompt: "中文小说旁白，语气自然沉稳。",
      voiceId: "Kore",
    });

    expect(payload).toMatchObject({
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Kore",
            },
          },
        },
      },
    });
    expect(payload.contents[0].parts[0].text).toContain("你好，离线未来。");
  });

  it("returns the built-in Google voice list without a network request", async () => {
    const provider = new GoogleGeminiTtsProvider({
      settings: {
        apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
        apiKey: "google-key",
      },
    });

    await expect(provider.listVoices()).resolves.toEqual(googleGeminiVoiceOptions);
  });

  it("wraps Gemini PCM audio as WAV", () => {
    const wavBytes = wrapPcm16AsWav(Buffer.from([0, 0, 1, 0]));

    expect(wavBytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(wavBytes.subarray(8, 12).toString("ascii")).toBe("WAVE");
    expect(wavBytes.readUInt32LE(24)).toBe(24000);
  });

  it("extracts inline PCM audio data from Gemini response JSON", () => {
    const audio = extractGeminiAudio({
      candidates: [
        {
          content: {
            parts: [
              {
                inlineData: {
                  data: Buffer.from([0, 0, 1, 0]).toString("base64"),
                  mimeType: "audio/L16;codec=pcm;rate=24000",
                },
              },
            ],
          },
        },
      ],
    });

    expect(audio.audioBytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(audio.mimeType).toBe("audio/L16;codec=pcm;rate=24000");
  });

  it("calls Gemini generateContent and returns WAV bytes", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      data: Buffer.from([0, 0, 1, 0]).toString("base64"),
                      mimeType: "audio/L16;codec=pcm;rate=24000",
                    },
                  },
                ],
              },
            },
          ],
        }),
        {
          headers: {
            "content-type": "application/json",
            "x-request-id": "req_123",
          },
          status: 200,
        },
      ),
    );
    const provider = new GoogleGeminiTtsProvider({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      settings: {
        apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
        apiKey: "google-key",
      },
    });

    const result = await provider.synthesizeSegment({
      inputText: "你好。",
      languageCode: "cmn",
      modelId: "gemini-2.5-flash-preview-tts",
      outputFormat: "wav",
      providerId: "google_tts",
      voiceId: "Kore",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-goog-api-key": "google-key",
        }),
        method: "POST",
      }),
    );
    expect(result.contentType).toBe("audio/wav");
    expect(result.audioBytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(result.providerRequestId).toBe("req_123");
  });
});

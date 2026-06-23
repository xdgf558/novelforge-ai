import {
  DEFAULT_TTS_MODEL,
  DEFAULT_TTS_VOICE_ID,
  readTtsGenerationSecrets,
  type AiRuntimeEnv,
  type TtsGenerationSecrets,
} from "@/lib/ai/local-config";
import { createServerFetch } from "@/lib/server-fetch";
import { maxAudioSegmentBytes } from "../audio-assets";
import { estimateAudioDurationSeconds, geminiTtsInputLimit } from "../estimate-cost";
import type {
  TtsCostEstimate,
  TtsProvider,
  TtsProviderSettings,
  TtsSynthesisRequest,
  TtsSynthesisResult,
  TtsVoice,
} from "./types";

type FetchLike = typeof fetch;

const ttsRequestTimeoutMs = 180_000;
const geminiPcmSampleRate = 24_000;
const geminiPcmChannels = 1;
const geminiBitsPerSample = 16;
export const maxGeminiJsonBytes =
  Math.ceil(maxAudioSegmentBytes * 1.4) + 1024 * 1024;

export const googleGeminiTtsModelOptions = [
  {
    label: "Gemini 2.5 Flash Preview TTS",
    value: "gemini-2.5-flash-preview-tts",
  },
  {
    label: "Gemini 2.5 Pro Preview TTS",
    value: "gemini-2.5-pro-preview-tts",
  },
];

export const googleGeminiVoiceOptions: TtsVoice[] = [
  { id: "Zephyr", name: "Zephyr - Bright", languageCode: "cmn" },
  { id: "Puck", name: "Puck - Upbeat", languageCode: "cmn" },
  { id: "Charon", name: "Charon - Informative", languageCode: "cmn" },
  { id: "Kore", name: "Kore - Firm", languageCode: "cmn" },
  { id: "Fenrir", name: "Fenrir - Excitable", languageCode: "cmn" },
  { id: "Leda", name: "Leda - Youthful", languageCode: "cmn" },
  { id: "Orus", name: "Orus - Firm", languageCode: "cmn" },
  { id: "Aoede", name: "Aoede - Breezy", languageCode: "cmn" },
  { id: "Callirrhoe", name: "Callirrhoe - Easy-going", languageCode: "cmn" },
  { id: "Autonoe", name: "Autonoe - Bright", languageCode: "cmn" },
  { id: "Enceladus", name: "Enceladus - Breathy", languageCode: "cmn" },
  { id: "Iapetus", name: "Iapetus - Clear", languageCode: "cmn" },
  { id: "Umbriel", name: "Umbriel - Easy-going", languageCode: "cmn" },
  { id: "Algieba", name: "Algieba - Smooth", languageCode: "cmn" },
  { id: "Despina", name: "Despina - Smooth", languageCode: "cmn" },
  { id: "Erinome", name: "Erinome - Clear", languageCode: "cmn" },
  { id: "Algenib", name: "Algenib - Gravelly", languageCode: "cmn" },
  { id: "Rasalgethi", name: "Rasalgethi - Informative", languageCode: "cmn" },
  { id: "Laomedeia", name: "Laomedeia - Upbeat", languageCode: "cmn" },
  { id: "Achernar", name: "Achernar - Soft", languageCode: "cmn" },
  { id: "Alnilam", name: "Alnilam - Firm", languageCode: "cmn" },
  { id: "Schedar", name: "Schedar - Even", languageCode: "cmn" },
  { id: "Gacrux", name: "Gacrux - Mature", languageCode: "cmn" },
  { id: "Pulcherrima", name: "Pulcherrima - Forward", languageCode: "cmn" },
  { id: "Achird", name: "Achird - Friendly", languageCode: "cmn" },
  { id: "Zubenelgenubi", name: "Zubenelgenubi - Casual", languageCode: "cmn" },
  { id: "Vindemiatrix", name: "Vindemiatrix - Gentle", languageCode: "cmn" },
  { id: "Sadachbia", name: "Sadachbia - Lively", languageCode: "cmn" },
  { id: "Sadaltager", name: "Sadaltager - Knowledgeable", languageCode: "cmn" },
  { id: "Sulafat", name: "Sulafat - Warm", languageCode: "cmn" },
];

export class GoogleGeminiTtsProvider implements TtsProvider {
  id = "google_tts" as const;
  displayName = "Google Gemini TTS";
  defaultModelId = DEFAULT_TTS_MODEL;

  private readonly fetchImpl: FetchLike;
  private readonly settings: TtsProviderSettings;

  constructor({
    fetchImpl,
    settings,
  }: {
    fetchImpl?: FetchLike;
    settings: TtsProviderSettings;
  }) {
    this.fetchImpl = fetchImpl ?? createServerFetch();
    this.settings = settings;
  }

  maxInputChars() {
    return geminiTtsInputLimit();
  }

  async listVoices(): Promise<TtsVoice[]> {
    return googleGeminiVoiceOptions;
  }

  async estimateCost(input: {
    chars: number;
    modelId: string;
  }): Promise<TtsCostEstimate> {
    return {
      estimatedSeconds: estimateAudioDurationSeconds(input.chars),
      estimatedCostCents: null,
      note: "估算仅供参考，实际费用以 Google AI Studio / Google Cloud 账单为准。",
    };
  }

  async synthesizeSegment(
    request: TtsSynthesisRequest,
  ): Promise<TtsSynthesisResult> {
    this.assertConfigured();

    const inputText = request.inputText.trim();

    if (!inputText) {
      throw new Error("TTS 输入文本不能为空。");
    }

    if (inputText.length > this.maxInputChars()) {
      throw new Error("TTS 输入文本超过当前模型的安全分段上限。");
    }

    if (request.outputFormat !== "wav") {
      throw new Error("Google Gemini TTS 当前仅支持导出 WAV。");
    }

    const modelId = request.modelId.trim() || DEFAULT_TTS_MODEL;
    const endpoint = `${this.settings.apiBaseUrl}/models/${encodeURIComponent(
      modelId,
    )}:generateContent`;
    const response = await fetchWithTimeout(
      this.fetchImpl,
      endpoint,
      {
        body: JSON.stringify(buildGeminiTtsPayload(request)),
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.settings.apiKey,
        },
        method: "POST",
      },
      ttsRequestTimeoutMs,
    );
    const responseText = await readTextResponseWithLimit(
      response,
      maxGeminiJsonBytes,
    );
    const responseJson = parseJsonResponse(responseText);

    if (!response.ok) {
      throw new Error(extractGeminiErrorMessage(responseJson, response.status));
    }

    const audio = extractGeminiAudio(responseJson);

    return {
      audioBytes: audio.audioBytes,
      contentType: "audio/wav",
      providerRequestId:
        response.headers.get("x-request-id") ||
        response.headers.get("x-goog-request-id") ||
        null,
      providerMeta: {
        endpoint,
        model: modelId,
        sourceMimeType: audio.mimeType,
      },
    };
  }

  private assertConfigured() {
    if (!this.settings.apiKey) {
      throw new Error("尚未配置 Google Gemini API Key。");
    }
  }
}

export function createConfiguredGoogleTtsProvider({
  env,
  fetchImpl,
  settings,
}: {
  env?: AiRuntimeEnv;
  fetchImpl?: FetchLike;
  settings?: TtsGenerationSecrets;
} = {}) {
  const secrets = settings ?? readTtsGenerationSecrets(env ?? process.env);

  return new GoogleGeminiTtsProvider({
    fetchImpl,
    settings: {
      apiBaseUrl: secrets.apiBaseUrl,
      apiKey: secrets.apiKey,
    },
  });
}

export function buildGeminiTtsPayload(request: TtsSynthesisRequest) {
  return {
    contents: [
      {
        parts: [
          {
            text: buildGeminiTtsPrompt(request),
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: request.voiceId?.trim() || DEFAULT_TTS_VOICE_ID,
          },
        },
      },
    },
  };
}

function buildGeminiTtsPrompt(request: TtsSynthesisRequest) {
  const stylePrompt = request.stylePrompt?.trim();

  if (!stylePrompt) {
    return request.inputText;
  }

  return `${stylePrompt}\n\n请只朗读下面正文，不要朗读本段指令：\n${request.inputText}`;
}

export function extractGeminiAudio(responseJson: unknown) {
  const parts = geminiResponseParts(responseJson);

  for (const part of parts) {
    const inlineData = recordValue(part, "inlineData") || recordValue(part, "inline_data");
    const mimeType =
      stringValue(recordValue(inlineData, "mimeType")) ||
      stringValue(recordValue(inlineData, "mime_type")) ||
      "audio/L16;codec=pcm;rate=24000";
    const data = stringValue(recordValue(inlineData, "data"));

    if (!data) {
      continue;
    }

    const audioBytes = Buffer.from(data, "base64");

    if (audioBytes.byteLength <= 0) {
      throw new Error("Google Gemini TTS 返回了空音频数据。");
    }

    const normalizedMimeType = mimeType.toLowerCase();

    if (normalizedMimeType.includes("wav")) {
      assertGeminiAudioSize(audioBytes);

      return {
        audioBytes,
        mimeType,
      };
    }

    const wavBytes = wrapPcm16AsWav(audioBytes, sampleRateFromMimeType(mimeType));
    assertGeminiAudioSize(wavBytes);

    return {
      audioBytes: wavBytes,
      mimeType,
    };
  }

  throw new Error("Google Gemini TTS 没有返回音频数据。");
}

export async function readTextResponseWithLimit(
  response: Response,
  maxBytes: number,
) {
  const contentLength = Number(response.headers.get("content-length") || "");

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error("Google Gemini TTS 响应超过本地读取上限。");
  }

  if (!response.body) {
    const text = await response.text();
    const textBytes = new TextEncoder().encode(text).byteLength;

    if (textBytes > maxBytes) {
      throw new Error("Google Gemini TTS 响应超过本地读取上限。");
    }

    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    totalBytes += value.byteLength;

    if (totalBytes > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new Error("Google Gemini TTS 响应超过本地读取上限。");
    }

    chunks.push(decoder.decode(value, { stream: true }));
  }

  chunks.push(decoder.decode());

  return chunks.join("");
}

function geminiResponseParts(responseJson: unknown) {
  const candidates = arrayValue(recordValue(responseJson, "candidates"));
  const parts: unknown[] = [];

  for (const candidate of candidates) {
    const content = recordValue(candidate, "content");
    parts.push(...arrayValue(recordValue(content, "parts")));
  }

  return parts;
}

export function wrapPcm16AsWav(
  pcmBytes: Buffer,
  sampleRate = geminiPcmSampleRate,
) {
  const byteRate = sampleRate * geminiPcmChannels * (geminiBitsPerSample / 8);
  const blockAlign = geminiPcmChannels * (geminiBitsPerSample / 8);
  const header = Buffer.alloc(44);

  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcmBytes.byteLength, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(geminiPcmChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(geminiBitsPerSample, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcmBytes.byteLength, 40);

  return Buffer.concat([header, pcmBytes]);
}

function sampleRateFromMimeType(mimeType: string) {
  const match = mimeType.match(/rate=(\d+)/i);
  const parsed = match ? Number(match[1]) : geminiPcmSampleRate;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : geminiPcmSampleRate;
}

async function fetchWithTimeout(
  fetchImpl: FetchLike,
  input: string,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function extractGeminiErrorMessage(responseJson: unknown, status: number) {
  const error = recordValue(responseJson, "error");
  const message =
    stringValue(recordValue(error, "message")) ||
    stringValue(recordValue(responseJson, "message")) ||
    `Google Gemini TTS failed with status ${status}`;

  return `Google Gemini TTS failed: ${status} — ${message}`;
}

function parseJsonResponse(responseText: string) {
  if (!responseText.trim()) {
    return null;
  }

  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return null;
  }
}

function assertGeminiAudioSize(audioBytes: Buffer) {
  if (audioBytes.byteLength > maxAudioSegmentBytes) {
    throw new Error("Google Gemini TTS 音频超过本地保存上限。");
  }
}

function recordValue(value: unknown, key: string) {
  return isRecord(value) ? value[key] : undefined;
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

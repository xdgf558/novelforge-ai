import {
  readTtsGenerationSecrets,
  type AiRuntimeEnv,
  type TtsGenerationSecrets,
} from "@/lib/ai/local-config";
import { maxAudioSegmentBytes } from "../audio-assets";
import { estimateAudioDurationSeconds, estimateTtsCostCents } from "../estimate-cost";
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
const voiceListTimeoutMs = 30_000;

export class PpqTtsProvider implements TtsProvider {
  id = "ppq_tts" as const;
  displayName = "PPQ TTS";
  defaultModelId = "eleven_multilingual_v2";

  private readonly fetchImpl: FetchLike;
  private readonly settings: TtsProviderSettings;

  constructor({
    fetchImpl,
    settings,
  }: {
    fetchImpl?: FetchLike;
    settings: TtsProviderSettings;
  }) {
    this.fetchImpl = fetchImpl ?? fetch;
    this.settings = settings;
  }

  maxInputChars(modelId: string) {
    const normalizedModel = modelId.toLowerCase();

    if (normalizedModel.includes("deepgram")) {
      return 1500;
    }

    if (normalizedModel.includes("eleven")) {
      return 4000;
    }

    return 3000;
  }

  async listVoices(options: {
    languageCode?: string | null;
    modelId?: string | null;
  } = {}): Promise<TtsVoice[]> {
    this.assertConfigured();

    const endpoint = new URL(`${this.settings.apiBaseUrl}/audio/voices`);
    const languageCode = options.languageCode?.trim();

    if (languageCode) {
      endpoint.searchParams.set("language", languageCode);
    }

    const response = await fetchWithTimeout(
      this.fetchImpl,
      endpoint.toString(),
      {
        headers: {
          Authorization: `Bearer ${this.settings.apiKey}`,
        },
      },
      voiceListTimeoutMs,
    );
    const responseText = await response.text();
    const responseJson = parseJsonResponse(responseText);

    if (!response.ok) {
      throw new Error(extractTtsErrorMessage(responseJson, response.status));
    }

    return extractPpqVoices(responseJson, options.modelId);
  }

  async estimateCost(input: {
    chars: number;
    modelId: string;
  }): Promise<TtsCostEstimate> {
    return {
      estimatedSeconds: estimateAudioDurationSeconds(input.chars),
      estimatedCostCents: estimateTtsCostCents({
        charCount: input.chars,
        modelId: input.modelId,
      }),
      note: "估算仅供参考，实际费用以 PPQ 后台账单为准。",
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

    if (inputText.length > this.maxInputChars(request.modelId)) {
      throw new Error("TTS 输入文本超过当前模型的安全分段上限。");
    }

    const endpoint = `${this.settings.apiBaseUrl}/audio/speech`;
    const payload = buildPpqSpeechPayload(request);
    const response = await fetchWithTimeout(
      this.fetchImpl,
      endpoint,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.settings.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
      ttsRequestTimeoutMs,
    );

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(
        extractTtsErrorMessage(parseJsonResponse(responseText), response.status),
      );
    }

    const contentType =
      response.headers.get("content-type") ||
      mimeTypeForAudioFormat(request.outputFormat);
    const audioBytes = await readAudioResponseBytes(response);

    return {
      audioBytes,
      contentType,
      providerRequestId:
        response.headers.get("x-request-id") ||
        response.headers.get("cf-ray") ||
        null,
      providerMeta: {
        endpoint,
        model: request.modelId,
      },
    };
  }

  private assertConfigured() {
    if (!this.settings.apiKey) {
      throw new Error("尚未配置 PPQ TTS API Key。");
    }
  }
}

export async function readAudioResponseBytes(
  response: Response,
  maxBytes = maxAudioSegmentBytes,
) {
  const contentLength = Number(response.headers.get("content-length") || "0");

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error("TTS 音频响应超过单段大小上限。");
  }

  if (!response.body) {
    const fallbackBytes = Buffer.from(await response.arrayBuffer());

    if (fallbackBytes.byteLength > maxBytes) {
      throw new Error("TTS 音频响应超过单段大小上限。");
    }

    return fallbackBytes;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      totalBytes += value.byteLength;

      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new Error("TTS 音频响应超过单段大小上限。");
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), totalBytes);
}

export function createConfiguredTtsProvider({
  env,
  fetchImpl,
  settings,
}: {
  env?: AiRuntimeEnv;
  fetchImpl?: FetchLike;
  settings?: TtsGenerationSecrets;
} = {}) {
  const secrets = settings ?? readTtsGenerationSecrets(env ?? process.env);

  if (secrets.providerId !== "ppq_tts") {
    throw new Error("第一版有声小说导出只支持 PPQ TTS。");
  }

  return new PpqTtsProvider({
    fetchImpl,
    settings: {
      apiBaseUrl: secrets.apiBaseUrl,
      apiKey: secrets.apiKey,
    },
  });
}

export function buildPpqSpeechPayload(request: TtsSynthesisRequest) {
  const payload: Record<string, unknown> = {
    input: request.inputText,
    model: request.modelId,
  };

  if (request.voiceId?.trim()) {
    payload.voice = request.voiceId.trim();
  }

  if (request.languageCode.trim()) {
    payload.language = request.languageCode.trim();
  }

  if (request.outputFormat && request.outputFormat !== "mp3") {
    payload.response_format = request.outputFormat;
  }

  if (request.stylePrompt?.trim()) {
    payload.instructions = request.stylePrompt.trim();
  }

  return payload;
}

export function extractPpqVoices(responseJson: unknown, modelId?: string | null) {
  const candidates = voiceArray(responseJson);
  const normalizedModel = modelId?.toLowerCase() ?? "";

  return candidates.flatMap((candidate) => {
    if (!isRecord(candidate)) {
      return [];
    }

    const id =
      stringValue(candidate.id) ||
      stringValue(candidate.voice_id) ||
      stringValue(candidate.voiceId);
    const name =
      stringValue(candidate.name) ||
      stringValue(candidate.display_name) ||
      stringValue(candidate.displayName) ||
      id;

    if (!id || !name) {
      return [];
    }

    const provider =
      stringValue(candidate.provider) ||
      stringValue(candidate.vendor) ||
      stringValue(candidate.type);
    const model =
      stringValue(candidate.model) ||
      stringValue(candidate.model_id) ||
      stringValue(candidate.modelId);
    const providerLower = provider?.toLowerCase() ?? "";
    const modelLower = model?.toLowerCase() ?? "";

    if (
      normalizedModel.includes("eleven") &&
      (providerLower || modelLower) &&
      !providerLower.includes("eleven") &&
      !modelLower.includes("eleven")
    ) {
      return [];
    }

    if (
      normalizedModel.includes("deepgram") &&
      (providerLower || modelLower) &&
      !providerLower.includes("deepgram") &&
      !modelLower.includes("deepgram")
    ) {
      return [];
    }

    return [
      {
        id,
        name,
        languageCode:
          stringValue(candidate.language) ||
          stringValue(candidate.language_code) ||
          stringValue(candidate.languageCode) ||
          null,
        gender: stringValue(candidate.gender) || null,
        provider: provider || null,
        description:
          stringValue(candidate.description) ||
          stringValue(candidate.preview) ||
          null,
        providerMeta: candidate,
      },
    ];
  });
}

function voiceArray(responseJson: unknown) {
  if (Array.isArray(responseJson)) {
    return responseJson;
  }

  if (!isRecord(responseJson)) {
    return [];
  }

  if (Array.isArray(responseJson.data)) {
    return responseJson.data;
  }

  if (Array.isArray(responseJson.voices)) {
    return responseJson.voices;
  }

  return [];
}

async function fetchWithTimeout(
  fetchImpl: FetchLike,
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
) {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    return await fetchImpl(input, {
      ...init,
      signal: abortController.signal,
    });
  } catch (error) {
    throw new Error(formatTtsRequestFailure(error));
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseJsonResponse(responseText: string) {
  if (!responseText.trim()) {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return {
      message: responseText.slice(0, 500),
    };
  }
}

function extractTtsErrorMessage(responseJson: unknown, status: number) {
  if (isRecord(responseJson)) {
    if (isRecord(responseJson.error)) {
      const errorMessage = stringValue(responseJson.error.message);

      if (errorMessage) {
        return errorMessage;
      }
    }

    const directMessage =
      stringValue(responseJson.message) || stringValue(responseJson.error);

    if (directMessage) {
      return directMessage;
    }
  }

  return `TTS 请求失败，状态码 ${status}。`;
}

function formatTtsRequestFailure(error: unknown) {
  if (error instanceof Error && error.name === "AbortError") {
    return "TTS 接口请求超时。";
  }

  if (error instanceof Error) {
    return `TTS 接口请求失败：${error.message}`;
  }

  return "TTS 接口请求失败。";
}

function mimeTypeForAudioFormat(format: string) {
  if (format === "wav") {
    return "audio/wav";
  }

  if (format === "ogg") {
    return "audio/ogg";
  }

  if (format === "pcm") {
    return "application/octet-stream";
  }

  return "audio/mpeg";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

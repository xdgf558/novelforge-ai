import {
  DEFAULT_GLM_TTS_API_BASE_URL,
  DEFAULT_GLM_TTS_MODEL,
  DEFAULT_GLM_TTS_VOICE_ID,
  readTtsGenerationSecrets,
  type AiRuntimeEnv,
  type TtsGenerationSecrets,
} from "@/lib/ai/local-config";
import { createServerFetch } from "@/lib/server-fetch";
import {
  isSupportedAudioContentType,
  maxAudioSegmentBytes,
  normalizeAudioContentType,
} from "../audio-assets";
import { estimateAudioDurationSeconds, glmTtsInputLimit } from "../estimate-cost";
import type {
  TtsCostEstimate,
  TtsProvider,
  TtsProviderSettings,
  TtsSynthesisRequest,
  TtsSynthesisResult,
  TtsVoice,
} from "./types";

type FetchLike = typeof fetch;

const glmTtsRequestTimeoutMs = 180_000;

export const glmTtsModelOptions = [
  {
    label: "GLM-TTS（智谱，有声阅读）",
    value: DEFAULT_GLM_TTS_MODEL,
  },
];

export const glmTtsVoiceOptions: TtsVoice[] = [
  {
    id: DEFAULT_GLM_TTS_VOICE_ID,
    name: "彤彤（默认）",
    languageCode: "zh",
    provider: "BigModel",
  },
  { id: "小陈", name: "小陈", languageCode: "zh", provider: "BigModel" },
  { id: "锤锤", name: "锤锤", languageCode: "zh", provider: "BigModel" },
  { id: "jam", name: "jam", languageCode: "zh", provider: "BigModel" },
  { id: "kazi", name: "kazi", languageCode: "zh", provider: "BigModel" },
  { id: "douji", name: "douji", languageCode: "zh", provider: "BigModel" },
  { id: "luodo", name: "luodo", languageCode: "zh", provider: "BigModel" },
];

export class GlmTtsProvider implements TtsProvider {
  id = "glm_tts" as const;
  displayName = "GLM-TTS";
  defaultModelId = DEFAULT_GLM_TTS_MODEL;

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
    return glmTtsInputLimit();
  }

  async listVoices(): Promise<TtsVoice[]> {
    return glmTtsVoiceOptions;
  }

  async estimateCost(input: {
    chars: number;
    modelId: string;
  }): Promise<TtsCostEstimate> {
    return {
      estimatedSeconds: estimateAudioDurationSeconds(input.chars),
      estimatedCostCents: null,
      note: "估算仅供参考，实际费用以智谱 BigModel 账单为准。",
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
      throw new Error("GLM-TTS 当前仅支持导出 WAV。");
    }

    const modelId = request.modelId.trim() || DEFAULT_GLM_TTS_MODEL;
    const endpoint = buildGlmTtsEndpoint(this.settings.apiBaseUrl);
    const response = await fetchWithTimeout(
      this.fetchImpl,
      endpoint,
      {
        body: JSON.stringify(buildGlmTtsPayload(request, modelId)),
        headers: {
          Authorization: `Bearer ${this.settings.apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      },
      glmTtsRequestTimeoutMs,
    );

    if (!response.ok) {
      throw new Error(await extractGlmTtsErrorMessage(response));
    }

    const contentType = normalizeAudioContentType(
      response.headers.get("content-type") || "audio/wav",
    );

    if (
      !isSupportedAudioContentType(contentType) ||
      (contentType !== "audio/wav" && contentType !== "application/octet-stream")
    ) {
      throw new Error("GLM-TTS 返回的不是 WAV 音频。");
    }

    const audioBytes = await readBinaryResponseWithLimit(
      response,
      maxAudioSegmentBytes,
    );

    return {
      audioBytes,
      contentType,
      providerRequestId:
        response.headers.get("x-request-id") ||
        response.headers.get("x-zhipu-request-id") ||
        null,
      providerMeta: {
        endpoint,
        model: modelId,
      },
    };
  }

  private assertConfigured() {
    if (!this.settings.apiKey) {
      throw new Error("尚未配置 GLM-TTS API Key。");
    }
  }
}

export function createConfiguredGlmTtsProvider({
  env,
  fetchImpl,
  settings,
}: {
  env?: AiRuntimeEnv;
  fetchImpl?: FetchLike;
  settings?: TtsGenerationSecrets;
} = {}) {
  const secrets = settings ?? readTtsGenerationSecrets(env ?? process.env);

  return new GlmTtsProvider({
    fetchImpl,
    settings: {
      apiBaseUrl: secrets.apiBaseUrl || DEFAULT_GLM_TTS_API_BASE_URL,
      apiKey: secrets.apiKey,
    },
  });
}

export function buildGlmTtsPayload(
  request: TtsSynthesisRequest,
  modelId = DEFAULT_GLM_TTS_MODEL,
) {
  return {
    input: buildGlmTtsInput(request),
    model: modelId,
    response_format: "wav",
    speed: 1,
    voice: request.voiceId?.trim() || DEFAULT_GLM_TTS_VOICE_ID,
    volume: 1,
  };
}

function buildGlmTtsInput(request: TtsSynthesisRequest) {
  const stylePrompt = request.stylePrompt?.trim();

  if (!stylePrompt) {
    return request.inputText;
  }

  return `${stylePrompt}\n\n请只朗读下面正文，不要朗读本段指令：\n${request.inputText}`;
}

function buildGlmTtsEndpoint(apiBaseUrl: string) {
  const cleanBaseUrl = (apiBaseUrl || DEFAULT_GLM_TTS_API_BASE_URL).replace(
    /\/+$/,
    "",
  );

  if (cleanBaseUrl.endsWith("/audio/speech")) {
    return cleanBaseUrl;
  }

  return `${cleanBaseUrl}/audio/speech`;
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

async function readBinaryResponseWithLimit(response: Response, maxBytes: number) {
  const contentLength = Number(response.headers.get("content-length") || "");

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error("GLM-TTS 音频响应超过单段大小上限。");
  }

  if (!response.body) {
    const bytes = Buffer.from(await response.arrayBuffer());

    if (bytes.byteLength > maxBytes) {
      throw new Error("GLM-TTS 音频响应超过单段大小上限。");
    }

    return bytes;
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    totalBytes += value.byteLength;

    if (totalBytes > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new Error("GLM-TTS 音频响应超过单段大小上限。");
    }

    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks);
}

async function extractGlmTtsErrorMessage(response: Response) {
  const status = response.status;
  const text = await response.text().catch(() => "");

  if (!text.trim()) {
    return `GLM-TTS failed: ${status}`;
  }

  try {
    const json = JSON.parse(text) as unknown;
    const error = recordValue(json, "error");
    const message =
      stringValue(recordValue(error, "message")) ||
      stringValue(recordValue(json, "message")) ||
      text.trim();

    return `GLM-TTS failed: ${status} — ${message}`;
  } catch {
    return `GLM-TTS failed: ${status} — ${text.trim().slice(0, 220)}`;
  }
}

function recordValue(value: unknown, key: string) {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

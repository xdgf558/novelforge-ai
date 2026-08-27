import {
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_OPENAI_MODEL,
  GPT_5_6_LUNA_MODEL,
  GPT_5_6_TERRA_MODEL,
  getAiRuntimeEnv,
  getAiRuntimeEnvForTaskType,
  normalizeAiBaseUrl,
} from "./local-config";
import { createServerFetch } from "@/lib/server-fetch";

type EnvLike = {
  [key: string]: string | undefined;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_BASE_URL?: string;
};

export type OpenAIMessageRole = "developer" | "system" | "user";

export type OpenAITextMessage = {
  role: OpenAIMessageRole;
  content: string;
};

export type OpenAIChatMessage = {
  role: "system" | "user";
  content: string;
};

export type OpenAITextRequest = {
  input: string;
  model?: string;
  systemPrompt?: string;
  developerPrompt?: string;
};

export type OpenAIUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type OpenAITextResult = {
  outputText: string;
  responseJson: unknown;
  usage: OpenAIUsage;
};

type FetchLike = typeof fetch;

export const defaultOpenAIRequestTimeoutMs = 120_000;

export function getConfiguredOpenAIModel(env: EnvLike = getAiRuntimeEnv()) {
  return env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

export function getConfiguredOpenAIModelForTaskType(
  taskType?: string | null,
  env: EnvLike = getAiRuntimeEnvForTaskType(taskType),
) {
  return getConfiguredOpenAIModel(env);
}

export function getConfiguredOpenAIBaseUrl(env: EnvLike = getAiRuntimeEnv()) {
  return normalizeAiBaseUrl(env.OPENAI_BASE_URL);
}

export function hasConfiguredOpenAIKey(env: EnvLike = getAiRuntimeEnv()) {
  return Boolean(env.OPENAI_API_KEY?.trim());
}

export function buildOpenAIResponsesPayload(request: OpenAITextRequest) {
  const model = request.model?.trim() || getConfiguredOpenAIModel();
  const input = buildOpenAIInputMessages(request);

  return {
    model,
    input,
    ...(isGpt56XhighModel(model)
      ? { reasoning: { effort: "xhigh" as const } }
      : {}),
  };
}

export function buildOpenAIInputMessages(request: OpenAITextRequest) {
  const messages: OpenAITextMessage[] = [];

  if (request.systemPrompt?.trim()) {
    messages.push({
      role: "system",
      content: request.systemPrompt.trim(),
    });
  }

  if (request.developerPrompt?.trim()) {
    messages.push({
      role: "developer",
      content: request.developerPrompt.trim(),
    });
  }

  messages.push({
    role: "user",
    content: request.input,
  });

  return messages.map((message) => ({
    role: message.role,
    content: [
      {
        type: "input_text",
        text: message.content,
      },
    ],
  }));
}

export function buildOpenAIChatCompletionsPayload(request: OpenAITextRequest) {
  const model = request.model?.trim() || getConfiguredOpenAIModel();
  const reasoningEffort = getChatCompletionsReasoningEffort(model);

  return {
    model,
    messages: buildOpenAIChatMessages(request),
    ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
  };
}

export function buildOpenAIChatMessages(request: OpenAITextRequest) {
  const messages: OpenAIChatMessage[] = [];
  const systemContent = [request.systemPrompt, request.developerPrompt]
    .map((content) => content?.trim())
    .filter(Boolean)
    .join("\n\n");

  if (systemContent) {
    messages.push({
      role: "system",
      content: systemContent,
    });
  }

  messages.push({
    role: "user",
    content: request.input,
  });

  return messages;
}

export async function createOpenAITextResponse(
  request: OpenAITextRequest,
  options: {
    env?: EnvLike;
    fetchImpl?: FetchLike;
    timeoutMs?: number;
    stream?: boolean;
    onStreamProgress?: () => Promise<void> | void;
  } = {},
): Promise<OpenAITextResult> {
  assertServerOnly();

  const env = options.env ?? getAiRuntimeEnv();
  const apiKey = env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const baseUrl = getConfiguredOpenAIBaseUrl(env);
  const timeoutMs = normalizeOpenAIRequestTimeoutMs(options.timeoutMs);
  const fetchImpl =
    options.fetchImpl ?? createServerFetch(env, { callerTimeoutMs: timeoutMs });
  const resolvedRequest = {
    ...request,
    model: request.model ?? getConfiguredOpenAIModel(env),
  };
  const useResponsesApi = shouldUseResponsesApi(baseUrl);
  const useStreamingChatCompletions = Boolean(options.stream && !useResponsesApi);
  const basePayload = useResponsesApi
    ? buildOpenAIResponsesPayload(resolvedRequest)
    : buildOpenAIChatCompletionsPayload(resolvedRequest);
  const payload = useStreamingChatCompletions
    ? {
        ...basePayload,
        stream: true,
        ...(isKimiModel(resolvedRequest.model ?? "")
          ? {
              stream_options: {
                include_usage: true,
              },
            }
          : {}),
      }
    : basePayload;
  const endpoint = `${baseUrl}/${useResponsesApi ? "responses" : "chat/completions"}`;
  const requestBody = JSON.stringify(payload);
  const abortController = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let rejectTimeout: ((error: Error) => void) | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    rejectTimeout = reject;
  });
  const resetTimeout = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      abortController.abort();
      rejectTimeout?.(createOpenAIRequestTimeoutError());
    }, timeoutMs);
  };
  let response: Response;
  let responseText: string;

  try {
    resetTimeout();
    response = await Promise.race([
      fetchImpl(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: requestBody,
        signal: abortController.signal,
      }),
      timeoutPromise,
    ]);
    resetTimeout();

    if (
      useStreamingChatCompletions &&
      response.ok &&
      response.headers.get("content-type")?.includes("text/event-stream")
    ) {
      return await readOpenAIChatCompletionStream(response, {
        onProgress: options.onStreamProgress,
        resetTimeout,
        timeoutPromise,
      });
    }

    responseText = await Promise.race([response.text(), timeoutPromise]);
  } catch (error) {
    throw new Error(
      formatOpenAIRequestFailure(
        error,
        endpoint,
        requestBody.length,
        timeoutMs,
        useStreamingChatCompletions,
      ),
    );
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }

  const responseJson = parseOpenAIResponseBody(responseText, response.status);

  if (!response.ok) {
    throw new Error(extractOpenAIErrorMessage(responseJson, response.status));
  }

  return {
    outputText: extractOpenAIOutputText(responseJson),
    responseJson,
    usage: extractOpenAIUsage(responseJson),
  };
}

async function readOpenAIChatCompletionStream(
  response: Response,
  options: {
    onProgress?: () => Promise<void> | void;
    resetTimeout: () => void;
    timeoutPromise: Promise<never>;
  },
): Promise<OpenAITextResult> {
  if (!response.body) {
    throw new Error("AI 流式响应没有可读取的正文。");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let outputText = "";
  let receivedDone = false;
  let responseId: string | undefined;
  let responseModel: string | undefined;
  let responseCreated: number | undefined;
  let finishReason: unknown = null;
  let usageJson: Record<string, unknown> | undefined;

  const processData = (data: string) => {
    if (data === "[DONE]") {
      receivedDone = true;
      return;
    }

    let eventJson: unknown;

    try {
      eventJson = JSON.parse(data);
    } catch {
      throw new Error(`AI 流式响应包含无法解析的数据：${data.slice(0, 200)}`);
    }

    if (!isRecord(eventJson)) {
      return;
    }

    if (isRecord(eventJson.error)) {
      throw new Error(extractOpenAIErrorMessage(eventJson, response.status));
    }

    responseId ??=
      typeof eventJson.id === "string" ? eventJson.id : undefined;
    responseModel ??=
      typeof eventJson.model === "string" ? eventJson.model : undefined;
    responseCreated ??= readNumber(eventJson.created);
    usageJson = extractStreamingUsage(eventJson) ?? usageJson;

    if (!Array.isArray(eventJson.choices)) {
      return;
    }

    for (const choice of eventJson.choices) {
      if (!isRecord(choice)) {
        continue;
      }

      if (choice.finish_reason != null) {
        finishReason = choice.finish_reason;
      }

      if (isRecord(choice.delta) && typeof choice.delta.content === "string") {
        outputText += choice.delta.content;
      }
    }
  };

  while (!receivedDone) {
    const result = await Promise.race([reader.read(), options.timeoutPromise]);

    if (result.done) {
      pending += decoder.decode();
      break;
    }

    options.resetTimeout();
    await options.onProgress?.();
    pending += decoder.decode(result.value, { stream: true });

    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? "";

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (!trimmedLine.startsWith("data:")) {
        continue;
      }

      processData(trimmedLine.slice(5).trimStart());

      if (receivedDone) {
        break;
      }
    }
  }

  if (!receivedDone && pending.trim().startsWith("data:")) {
    processData(pending.trim().slice(5).trimStart());
  }

  if (!receivedDone) {
    throw new Error("AI 流式响应提前结束，未收到完整结束标记，已放弃本次半成品。");
  }

  const responseJson = {
    ...(responseId ? { id: responseId } : {}),
    object: "chat.completion",
    ...(responseCreated != null ? { created: responseCreated } : {}),
    ...(responseModel ? { model: responseModel } : {}),
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: outputText,
        },
        finish_reason: finishReason,
      },
    ],
    ...(usageJson ? { usage: usageJson } : {}),
  };

  return {
    outputText,
    responseJson,
    usage: extractOpenAIUsage(responseJson),
  };
}

export function extractOpenAIOutputText(responseJson: unknown) {
  if (!isRecord(responseJson)) {
    return "";
  }

  if (typeof responseJson.output_text === "string") {
    return responseJson.output_text;
  }

  if (typeof responseJson.choices !== "undefined") {
    return extractChatCompletionOutputText(responseJson.choices);
  }

  const output = responseJson.output;

  if (!Array.isArray(output)) {
    return "";
  }

  return output
    .flatMap((item) => (isRecord(item) && Array.isArray(item.content) ? item.content : []))
    .map((content) => {
      if (!isRecord(content)) {
        return "";
      }

      if (typeof content.text === "string") {
        return content.text;
      }

      if (typeof content.refusal === "string") {
        return content.refusal;
      }

      return "";
    })
    .filter(Boolean)
    .join("\n");
}

export function extractOpenAIUsage(responseJson: unknown): OpenAIUsage {
  if (!isRecord(responseJson) || !isRecord(responseJson.usage)) {
    return {};
  }

  return {
    inputTokens:
      readNumber(responseJson.usage.input_tokens) ??
      readNumber(responseJson.usage.prompt_tokens),
    outputTokens:
      readNumber(responseJson.usage.output_tokens) ??
      readNumber(responseJson.usage.completion_tokens),
    totalTokens: readNumber(responseJson.usage.total_tokens),
  };
}

function extractOpenAIErrorMessage(responseJson: unknown, status: number) {
  if (
    isRecord(responseJson) &&
    isRecord(responseJson.error) &&
    typeof responseJson.error.message === "string"
  ) {
    return responseJson.error.message;
  }

  if (isRecord(responseJson) && typeof responseJson.message === "string") {
    return responseJson.message;
  }

  return `OpenAI request failed with status ${status}.`;
}

function extractChatCompletionOutputText(choices: unknown) {
  if (!Array.isArray(choices)) {
    return "";
  }

  return choices
    .map((choice) => {
      if (!isRecord(choice)) {
        return "";
      }

      if (
        isRecord(choice.message) &&
        typeof choice.message.content === "string"
      ) {
        return choice.message.content;
      }

      if (isRecord(choice.delta) && typeof choice.delta.content === "string") {
        return choice.delta.content;
      }

      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function parseOpenAIResponseBody(responseText: string, status: number) {
  if (!responseText.trim()) {
    return {
      error: {
        message: `OpenAI-compatible request failed with status ${status} and an empty response body.`,
      },
    };
  }

  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return {
      error: {
        message: `OpenAI-compatible request failed with status ${status} and a non-JSON response body: ${responseText.slice(0, 200)}`,
      },
    };
  }
}

function shouldUseResponsesApi(baseUrl: string) {
  return baseUrl === DEFAULT_OPENAI_BASE_URL;
}

function isKimiK3Model(model: string) {
  const normalized = model.trim().toLowerCase();

  return normalized === "kimi-k3" || normalized.startsWith("kimi-k3-");
}

function isGpt56XhighModel(model: string) {
  const normalized = model.trim().toLowerCase();

  return (
    normalized === GPT_5_6_LUNA_MODEL ||
    normalized.startsWith(`${GPT_5_6_LUNA_MODEL}-`) ||
    normalized === GPT_5_6_TERRA_MODEL ||
    normalized.startsWith(`${GPT_5_6_TERRA_MODEL}-`)
  );
}

function getChatCompletionsReasoningEffort(model: string) {
  if (isGpt56XhighModel(model)) {
    return "xhigh" as const;
  }

  if (isKimiK3Model(model)) {
    return "max" as const;
  }

  return null;
}

function isKimiModel(model: string) {
  return model.trim().toLowerCase().startsWith("kimi-");
}

function formatOpenAIRequestFailure(
  error: unknown,
  endpoint: string,
  payloadLength: number,
  timeoutMs: number,
  streaming = false,
) {
  if (isAbortError(error)) {
    if (streaming) {
      return `AI 接口连续 ${timeoutMs / 1000} 秒未收到新数据：${endpoint}，请求体约 ${formatPayloadLength(payloadLength)}。请稍后重试。`;
    }

    return `AI 接口请求超时（${timeoutMs / 1000} 秒）：${endpoint}，请求体约 ${formatPayloadLength(payloadLength)}。请稍后重试，或缩短本次输入。`;
  }

  const message = error instanceof Error ? error.message : String(error);
  const cause =
    error instanceof Error
      ? formatErrorCause((error as Error & { cause?: unknown }).cause)
      : "";

  return [
    `AI 接口请求未收到响应：${endpoint}`,
    `请求体约 ${formatPayloadLength(payloadLength)}`,
    message,
    cause ? `原因：${cause}` : "",
  ]
    .filter(Boolean)
    .join("；");
}

function normalizeOpenAIRequestTimeoutMs(timeoutMs?: number) {
  if (!Number.isFinite(timeoutMs) || !timeoutMs || timeoutMs <= 0) {
    return defaultOpenAIRequestTimeoutMs;
  }

  return Math.max(1_000, Math.round(timeoutMs));
}

function createOpenAIRequestTimeoutError() {
  const error = new Error("AI request timed out.");
  error.name = "AbortError";
  return error;
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function formatErrorCause(cause: unknown) {
  if (!isRecord(cause)) {
    return "";
  }

  const parts = [
    typeof cause.code === "string" ? cause.code : "",
    typeof cause.message === "string" ? cause.message : "",
  ].filter(Boolean);

  return parts.join(" ");
}

function formatPayloadLength(length: number) {
  if (length < 1024) {
    return `${length} 字符`;
  }

  return `${(length / 1024).toFixed(1)} KB`;
}

function extractStreamingUsage(
  eventJson: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (isRecord(eventJson.usage)) {
    return eventJson.usage;
  }

  if (!Array.isArray(eventJson.choices)) {
    return undefined;
  }

  for (const choice of eventJson.choices) {
    if (isRecord(choice) && isRecord(choice.usage)) {
      return choice.usage;
    }
  }

  return undefined;
}

function assertServerOnly() {
  if (typeof window !== "undefined") {
    throw new Error("OpenAI client can only run on the server.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

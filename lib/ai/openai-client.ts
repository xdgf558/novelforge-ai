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

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";

export function getConfiguredOpenAIModel(env: EnvLike = process.env) {
  return env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

export function hasConfiguredOpenAIKey(env: EnvLike = process.env) {
  return Boolean(env.OPENAI_API_KEY?.trim());
}

export function buildOpenAIResponsesPayload(request: OpenAITextRequest) {
  const input = buildOpenAIInputMessages(request);

  return {
    model: request.model?.trim() || getConfiguredOpenAIModel(),
    input,
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

export async function createOpenAITextResponse(
  request: OpenAITextRequest,
  options: {
    env?: EnvLike;
    fetchImpl?: FetchLike;
  } = {},
): Promise<OpenAITextResult> {
  assertServerOnly();

  const env = options.env ?? process.env;
  const apiKey = env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const baseUrl = normalizeOpenAIBaseUrl(env.OPENAI_BASE_URL);
  const fetchImpl = options.fetchImpl ?? fetch;
  const payload = buildOpenAIResponsesPayload({
    ...request,
    model: request.model ?? getConfiguredOpenAIModel(env),
  });

  const response = await fetchImpl(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseJson = (await response.json()) as unknown;

  if (!response.ok) {
    throw new Error(extractOpenAIErrorMessage(responseJson, response.status));
  }

  return {
    outputText: extractOpenAIOutputText(responseJson),
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
    inputTokens: readNumber(responseJson.usage.input_tokens),
    outputTokens: readNumber(responseJson.usage.output_tokens),
    totalTokens: readNumber(responseJson.usage.total_tokens),
  };
}

function normalizeOpenAIBaseUrl(baseUrl?: string) {
  return (baseUrl?.trim() || DEFAULT_OPENAI_BASE_URL).replace(/\/+$/, "");
}

function extractOpenAIErrorMessage(responseJson: unknown, status: number) {
  if (
    isRecord(responseJson) &&
    isRecord(responseJson.error) &&
    typeof responseJson.error.message === "string"
  ) {
    return responseJson.error.message;
  }

  return `OpenAI request failed with status ${status}.`;
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

import {
  readImageGenerationSecrets,
  type AiRuntimeEnv,
  type ImageGenerationSecrets,
} from "./local-config";

type FetchLike = typeof fetch;

export type ImageGenerationRequest = {
  prompt: string;
  model?: string | null;
  n?: number | null;
  size?: string | null;
  quality?: string | null;
};

export type GeneratedImageResult = {
  dataBase64: string | null;
  dataUrl: string | null;
  mimeType: string | null;
  revisedPrompt: string | null;
  url: string | null;
};

export type ImageGenerationResult = {
  endpoint: string;
  images: GeneratedImageResult[];
  requestJson: unknown;
  responseJson: unknown;
};

const imageGenerationRequestTimeoutMs = 180_000;

export function hasConfiguredImageApiKey(
  env: AiRuntimeEnv = process.env,
) {
  return Boolean(readImageGenerationSecrets(env).apiKey);
}

export function buildImageGenerationPayload(
  request: ImageGenerationRequest,
  settings: Pick<ImageGenerationSecrets, "model" | "size" | "quality">,
) {
  const payload: Record<string, unknown> = {
    model: request.model?.trim() || settings.model,
    prompt: request.prompt,
    n: normalizeImageCount(request.n),
  };
  const size = request.size?.trim() || settings.size;
  const quality = request.quality?.trim() || settings.quality;

  if (size && size !== "default") {
    payload.size = size;
  }

  if (quality && quality !== "default") {
    payload.quality = quality;
  }

  return payload;
}

export async function createImageGeneration(
  request: ImageGenerationRequest,
  options: {
    env?: AiRuntimeEnv;
    fetchImpl?: FetchLike;
  } = {},
): Promise<ImageGenerationResult> {
  assertServerOnly();

  const settings = readImageGenerationSecrets(options.env ?? process.env);

  if (!settings.apiKey) {
    throw new Error("IMAGE_API_KEY is not configured.");
  }

  const endpoint = `${settings.apiBaseUrl}/images/generations`;
  const payload = buildImageGenerationPayload(request, settings);
  const requestBody = JSON.stringify(payload);
  const fetchImpl = options.fetchImpl ?? fetch;
  const abortController = new AbortController();
  const timeoutId = setTimeout(
    () => abortController.abort(),
    imageGenerationRequestTimeoutMs,
  );
  let response: Response;

  try {
    response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        "Content-Type": "application/json",
      },
      body: requestBody,
      signal: abortController.signal,
    });
  } catch (error) {
    throw new Error(formatImageRequestFailure(error, endpoint, requestBody.length));
  } finally {
    clearTimeout(timeoutId);
  }

  const responseText = await response.text();
  const responseJson = parseImageResponseBody(responseText, response.status);

  if (!response.ok) {
    throw new Error(extractImageErrorMessage(responseJson, response.status));
  }

  const images = extractGeneratedImages(responseJson);

  if (images.length === 0) {
    throw new Error("图片生成接口没有返回可用图片。");
  }

  return {
    endpoint,
    images,
    requestJson: payload,
    responseJson,
  };
}

export function extractGeneratedImages(responseJson: unknown): GeneratedImageResult[] {
  const candidates = imageCandidateArray(responseJson);

  return candidates.flatMap((candidate) => {
    if (!isRecord(candidate)) {
      return [];
    }

    const rawData =
      stringValue(candidate.b64_json) ||
      stringValue(candidate.data) ||
      stringValue(candidate.base64) ||
      "";
    const parsedData = parseImageDataValue(rawData);
    const url =
      stringValue(candidate.url) ||
      stringValue(candidate.image_url) ||
      stringValue(candidate.imageUrl) ||
      null;
    const mimeType =
      parsedData.mimeType ||
      stringValue(candidate.mime_type) ||
      stringValue(candidate.mimeType) ||
      (parsedData.dataBase64 ? "image/png" : null);
    const revisedPrompt =
      stringValue(candidate.revised_prompt) ||
      stringValue(candidate.revisedPrompt) ||
      null;

    if (!parsedData.dataBase64 && !url) {
      return [];
    }

    return [
      {
        dataBase64: parsedData.dataBase64,
        dataUrl:
          parsedData.dataUrl ||
          (parsedData.dataBase64 && mimeType
            ? `data:${mimeType};base64,${parsedData.dataBase64}`
            : null),
        mimeType,
        revisedPrompt,
        url,
      },
    ];
  });
}

export function extractImageErrorMessage(responseJson: unknown, status: number) {
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

  return `Image generation request failed with status ${status}.`;
}

function imageCandidateArray(responseJson: unknown) {
  if (!isRecord(responseJson)) {
    return [];
  }

  if (Array.isArray(responseJson.data)) {
    return responseJson.data;
  }

  if (Array.isArray(responseJson.images)) {
    return responseJson.images;
  }

  if (Array.isArray(responseJson.output)) {
    return responseJson.output;
  }

  return [];
}

function parseImageDataValue(value: string): {
  dataBase64: string | null;
  dataUrl: string | null;
  mimeType: string | null;
} {
  const cleanValue = value.trim();

  if (!cleanValue) {
    return {
      dataBase64: null,
      dataUrl: null,
      mimeType: null,
    };
  }

  const dataUrlMatch = /^data:([^;,]+);base64,(.+)$/i.exec(cleanValue);

  if (dataUrlMatch) {
    return {
      dataBase64: dataUrlMatch[2],
      dataUrl: cleanValue,
      mimeType: dataUrlMatch[1],
    };
  }

  return {
    dataBase64: cleanValue,
    dataUrl: null,
    mimeType: null,
  };
}

function parseImageResponseBody(responseText: string, status: number) {
  if (!responseText.trim()) {
    return {};
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return {
      error: {
        message: `Image generation returned non-JSON response with status ${status}.`,
      },
      raw: responseText.slice(0, 500),
    };
  }
}

function normalizeImageCount(value?: number | null) {
  const count = Number(value);

  if (!Number.isInteger(count) || count < 1) {
    return 1;
  }

  return Math.min(count, 4);
}

function formatImageRequestFailure(
  error: unknown,
  endpoint: string,
  payloadLength: number,
) {
  const cause =
    error instanceof Error && error.name === "AbortError"
      ? "请求超时"
      : error instanceof Error
        ? error.message
        : String(error);

  return [
    `图片生成接口请求失败：${endpoint}`,
    `请求体约 ${formatPayloadLength(payloadLength)}。`,
    `原因：${cause}`,
  ].join(" ");
}

function formatPayloadLength(length: number) {
  if (length >= 1024 * 1024) {
    return `${(length / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(length / 1024))} KB`;
}

function assertServerOnly() {
  if (typeof window !== "undefined") {
    throw new Error("Image generation can only run on the server.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

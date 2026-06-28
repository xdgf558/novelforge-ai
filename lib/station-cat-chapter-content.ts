import { createServerFetch } from "./server-fetch";

export type StationCatPublishedChapterContent = {
  remoteId: string;
  title: string;
  body: string;
  status: string;
  updatedAt: string | null;
};

type FetchLike = typeof fetch;

const requestTimeoutMs = 60_000;
const maxChapterContentJsonBytes = 5 * 1024 * 1024;

export function buildStationCatChapterContentEndpoint(
  apiBaseUrl: string,
  remoteChapterId: string,
) {
  const cleaned = apiBaseUrl.trim();

  if (!cleaned) {
    throw new Error("Station Cat API Base URL is required.");
  }

  let url: URL;

  try {
    url = new URL(cleaned);
  } catch {
    throw new Error("Station Cat API Base URL must be a valid URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Station Cat API Base URL must use http or https.");
  }

  const path = url.pathname.replace(/\/+$/, "");
  const encodedId = encodeURIComponent(remoteChapterId);

  if (path.endsWith("/api/novelforge/chapters")) {
    url.pathname = `${path}/${encodedId}/content`;
  } else if (path.endsWith("/api/novelforge")) {
    url.pathname = `${path}/chapters/${encodedId}/content`;
  } else {
    url.pathname = `${path || ""}/api/novelforge/chapters/${encodedId}/content`;
  }

  url.search = "";
  url.hash = "";

  return url.toString();
}

export async function fetchStationCatPublishedChapterContent(
  {
    apiBaseUrl,
    remoteChapterId,
    token,
  }: {
    apiBaseUrl: string;
    remoteChapterId: string;
    token: string;
  },
  options: {
    fetchImpl?: FetchLike;
  } = {},
): Promise<StationCatPublishedChapterContent> {
  const cleanRemoteId = remoteChapterId.trim();

  if (!cleanRemoteId) {
    throw new Error("章节还没有网站远端 ID，请先发布到个人网站。");
  }

  if (!token.trim()) {
    throw new Error("尚未配置 Station Cat Publish Token。");
  }

  const fetchImpl = options.fetchImpl ?? createServerFetch();
  const endpoint = buildStationCatChapterContentEndpoint(apiBaseUrl, cleanRemoteId);
  const response = await fetchWithTimeout(
    fetchImpl,
    endpoint,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      method: "GET",
    },
    requestTimeoutMs,
  );
  const responseText = await readTextResponseWithLimit(
    response,
    maxChapterContentJsonBytes,
  );
  const responseJson = parseJsonResponse(responseText);

  if (!response.ok) {
    throw new Error(extractStationCatContentError(responseJson, response.status));
  }

  return parsePublishedChapterContent(responseJson, cleanRemoteId);
}

export function parsePublishedChapterContent(
  responseJson: unknown,
  remoteChapterId: string,
): StationCatPublishedChapterContent {
  const chapter =
    recordValue(responseJson, "chapter") ||
    recordValue(responseJson, "data") ||
    responseJson;
  const status =
    stringValue(recordValue(chapter, "status")) ||
    stringValue(recordValue(chapter, "publishStatus")) ||
    "published";

  if (!isPublishedStatus(status)) {
    throw new Error("网站章节当前不是公开发布状态。");
  }

  const body =
    stringValue(recordValue(chapter, "body")) ||
    stringValue(recordValue(chapter, "content")) ||
    stringValue(recordValue(chapter, "text")) ||
    stringValue(recordValue(chapter, "markdown")) ||
    htmlToPlainText(stringValue(recordValue(chapter, "html")));

  if (!body.trim()) {
    throw new Error("网站没有返回可朗读的章节正文。");
  }

  return {
    remoteId:
      stringValue(recordValue(chapter, "id")) ||
      stringValue(recordValue(chapter, "chapterId")) ||
      remoteChapterId,
    title: stringValue(recordValue(chapter, "title")),
    body: body.trim(),
    status,
    updatedAt:
      stringValue(recordValue(chapter, "updatedAt")) ||
      stringValue(recordValue(chapter, "publishedAt")) ||
      null,
  };
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

async function readTextResponseWithLimit(response: Response, maxBytes: number) {
  const contentLength = Number(response.headers.get("content-length") || "");

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error("Station Cat 章节正文响应超过本地读取上限。");
  }

  if (!response.body) {
    const text = await response.text();
    const bytes = new TextEncoder().encode(text).byteLength;

    if (bytes > maxBytes) {
      throw new Error("Station Cat 章节正文响应超过本地读取上限。");
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
      throw new Error("Station Cat 章节正文响应超过本地读取上限。");
    }

    chunks.push(decoder.decode(value, { stream: true }));
  }

  chunks.push(decoder.decode());

  return chunks.join("");
}

function extractStationCatContentError(responseJson: unknown, status: number) {
  const error = recordValue(responseJson, "error");
  const message =
    stringValue(recordValue(error, "message")) ||
    stringValue(recordValue(responseJson, "message")) ||
    `Station Cat chapter content failed with status ${status}`;

  return `Station Cat 正文读取失败：${status} — ${message}`;
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

function isPublishedStatus(status: string) {
  const normalized = status.trim().toLowerCase();

  return (
    normalized === "published" ||
    normalized === "publish" ||
    normalized === "public" ||
    normalized === "online"
  );
}

function htmlToPlainText(html: string) {
  if (!html.trim()) {
    return "";
  }

  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function recordValue(value: unknown, key: string) {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

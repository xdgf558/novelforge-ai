import { createServerFetch } from "@/lib/server-fetch";

export const stationCatChapterAnalyticsPath =
  "/api/novelforge/analytics/chapter";
export const stationCatChapterInsightsPath =
  "/api/novelforge/analytics/insights";

const readerFeedbackRequestTimeoutMs = 60_000;
const maxReaderFeedbackJsonBytes = 1024 * 1024;

type FetchLike = typeof fetch;

export type NormalizedChapterAnalytics = {
  views: number | null;
  likes: number | null;
  comments: number | null;
  favorites: number | null;
  shares: number | null;
  completionRate: number | null;
  averageReadSeconds: number | null;
  dropOffPoint: string | null;
  engagementScore: number | null;
  rawJson: string;
};

export type NormalizedChapterInsight = {
  summary: string | null;
  pacing: string | null;
  focus: string | null;
  hookStrategy: string | null;
  riskNotesJson: string | null;
  characterPriorityJson: string | null;
  rawJson: string;
};

export type StationCatReaderFeedback = {
  analytics: NormalizedChapterAnalytics;
  insight: NormalizedChapterInsight;
};

export class ReaderFeedbackError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "ReaderFeedbackError";
    this.statusCode = statusCode;
  }
}

export async function fetchStationCatReaderFeedback(
  {
    apiBaseUrl,
    token,
    remoteChapterId,
  }: {
    apiBaseUrl: string;
    token: string;
    remoteChapterId: string;
  },
  options: {
    fetchImpl?: FetchLike;
  } = {},
): Promise<StationCatReaderFeedback> {
  const cleanToken = token.trim();
  const cleanRemoteChapterId = remoteChapterId.trim();

  if (!cleanToken) {
    throw new ReaderFeedbackError("Station Cat Token 未配置。");
  }

  if (!cleanRemoteChapterId) {
    throw new ReaderFeedbackError("缺少远端章节 ID。");
  }

  const fetchImpl = options.fetchImpl ?? createServerFetch();
  const analyticsUrl = buildStationCatReaderFeedbackEndpoint({
    apiBaseUrl,
    pathPrefix: stationCatChapterAnalyticsPath,
    remoteChapterId: cleanRemoteChapterId,
  });
  const insightsUrl = buildStationCatReaderFeedbackEndpoint({
    apiBaseUrl,
    pathPrefix: stationCatChapterInsightsPath,
    remoteChapterId: cleanRemoteChapterId,
  });

  const [analyticsJson, insightJson] = await Promise.all([
    fetchStationCatJson({
      fetchImpl,
      token: cleanToken,
      url: analyticsUrl,
      label: "章节读者数据",
    }),
    fetchStationCatJson({
      fetchImpl,
      token: cleanToken,
      url: insightsUrl,
      label: "章节读者洞察",
    }),
  ]);

  return {
    analytics: normalizeChapterAnalytics(analyticsJson),
    insight: normalizeChapterInsight(insightJson),
  };
}

export function buildStationCatReaderFeedbackEndpoint({
  apiBaseUrl,
  pathPrefix,
  remoteChapterId,
}: {
  apiBaseUrl: string;
  pathPrefix: string;
  remoteChapterId: string;
}) {
  const cleaned = apiBaseUrl.trim();

  if (!cleaned) {
    throw new ReaderFeedbackError("Station Cat API Base URL 未配置。");
  }

  let url: URL;

  try {
    url = new URL(cleaned);
  } catch {
    throw new ReaderFeedbackError("Station Cat API Base URL 不是有效 URL。");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new ReaderFeedbackError("Station Cat API Base URL 必须使用 http 或 https。");
  }

  const basePath = url.pathname
    .replace(/\/api\/novelforge\/import\/?$/, "")
    .replace(/\/api\/novelforge\/?$/, "")
    .replace(/\/+$/, "");
  const normalizedPrefix = pathPrefix.startsWith("/") ? pathPrefix : `/${pathPrefix}`;

  url.pathname = `${basePath}${normalizedPrefix}/${encodeURIComponent(remoteChapterId)}`;
  url.search = "";
  url.hash = "";

  return url.toString();
}

export function normalizeChapterAnalytics(rawJson: unknown): NormalizedChapterAnalytics {
  const source = unwrapPayload(rawJson, [
    "analytics",
    "chapterAnalytics",
    "metrics",
    "data",
    "result",
  ]);

  return {
    views: numberField(source, ["views", "viewCount", "readCount", "reads"]),
    likes: numberField(source, ["likes", "likeCount"]),
    comments: numberField(source, ["comments", "commentCount"]),
    favorites: numberField(source, ["favorites", "favoriteCount", "bookmarks"]),
    shares: numberField(source, ["shares", "shareCount"]),
    completionRate: rateField(source, [
      "completionRate",
      "completion_rate",
      "finishRate",
      "finish_rate",
      "readCompletionRate",
    ]),
    averageReadSeconds: integerField(source, [
      "averageReadSeconds",
      "average_read_seconds",
      "avgReadSeconds",
      "avg_read_seconds",
      "averageReadTimeSeconds",
      "avgReadDuration",
    ]),
    dropOffPoint: stringField(source, [
      "dropOffPoint",
      "drop_off_point",
      "dropoffPoint",
      "dropOff",
      "mainDropOff",
    ]),
    engagementScore: numberField(source, [
      "engagementScore",
      "engagement_score",
      "interactionScore",
    ]),
    rawJson: stringifyJson(rawJson),
  };
}

export function normalizeChapterInsight(rawJson: unknown): NormalizedChapterInsight {
  const source = unwrapPayload(rawJson, [
    "insight",
    "insights",
    "analysis",
    "data",
    "result",
  ]);
  const riskNotes = unknownField(source, [
    "riskNotes",
    "risk_notes",
    "risks",
    "readerRisks",
  ]);
  const characterPriority = unknownField(source, [
    "characterPriority",
    "character_priority",
    "characters",
    "focusCharacters",
  ]);

  return {
    summary: stringField(source, ["summary", "overview", "report"]),
    pacing: stringField(source, ["pacing", "rhythm", "pace"]),
    focus: stringField(source, ["focus", "readerFocus", "reader_focus"]),
    hookStrategy: stringField(source, [
      "hookStrategy",
      "hook_strategy",
      "nextHook",
      "retentionHook",
    ]),
    riskNotesJson: riskNotes == null ? null : stringifyJson(riskNotes),
    characterPriorityJson:
      characterPriority == null ? null : stringifyJson(characterPriority),
    rawJson: stringifyJson(rawJson),
  };
}

async function fetchStationCatJson({
  fetchImpl,
  label,
  token,
  url,
}: {
  fetchImpl: FetchLike;
  label: string;
  token: string;
  url: string;
}) {
  const abortController = new AbortController();
  const timeoutId = setTimeout(
    () => abortController.abort(),
    readerFeedbackRequestTimeoutMs,
  );
  let response: Response;

  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: abortController.signal,
    });
  } catch (error) {
    throw new ReaderFeedbackError(
      `${label}请求失败：${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  const responseText = await readTextResponseWithLimit(response);
  const responseJson = parseJsonResponse(responseText);

  if (!response.ok) {
    throw new ReaderFeedbackError(
      `${label}请求失败：${extractErrorMessage(responseJson, response.status)}`,
      response.status,
    );
  }

  return responseJson;
}

async function readTextResponseWithLimit(response: Response) {
  const contentLengthHeader = response.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : NaN;

  if (Number.isFinite(contentLength) && contentLength > maxReaderFeedbackJsonBytes) {
    throw new ReaderFeedbackError("读者反馈响应过大，已拒绝读取。");
  }

  if (!response.body) {
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > maxReaderFeedbackJsonBytes) {
      throw new ReaderFeedbackError("读者反馈响应过大，已拒绝读取。");
    }
    return text;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    if (!value) {
      continue;
    }

    totalBytes += value.byteLength;
    if (totalBytes > maxReaderFeedbackJsonBytes) {
      await reader.cancel().catch(() => undefined);
      throw new ReaderFeedbackError("读者反馈响应过大，已拒绝读取。");
    }

    chunks.push(value);
  }

  return new TextDecoder().decode(concatUint8Arrays(chunks, totalBytes));
}

function concatUint8Arrays(chunks: Uint8Array[], totalBytes: number) {
  const output = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return output;
}

function parseJsonResponse(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ReaderFeedbackError("读者反馈接口没有返回有效 JSON。");
  }
}

function extractErrorMessage(value: unknown, status: number) {
  const record = asRecord(value);
  const message = firstString(
    record?.message,
    record?.error,
    record?.detail,
    record?.reason,
  );

  return message || `HTTP ${status}`;
}

function unwrapPayload(value: unknown, keys: string[]) {
  let current = asRecord(value) ?? {};

  for (const key of keys) {
    const nested = asRecord(current[key]);
    if (nested) {
      current = nested;
    }
  }

  return current;
}

function unknownField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (record[key] != null) {
      return record[key];
    }
  }

  return null;
}

function stringField(record: Record<string, unknown>, keys: string[]) {
  const value = unknownField(record, keys);
  return firstString(value) || null;
}

function numberField(record: Record<string, unknown>, keys: string[]) {
  const value = unknownField(record, keys);
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(/%$/, ""))
        : NaN;

  return Number.isFinite(parsed) ? parsed : null;
}

function integerField(record: Record<string, unknown>, keys: string[]) {
  const value = numberField(record, keys);
  return value == null ? null : Math.round(value);
}

function rateField(record: Record<string, unknown>, keys: string[]) {
  const value = numberField(record, keys);

  if (value == null) {
    return null;
  }

  if (value > 1 && value <= 100) {
    return value / 100;
  }

  return value;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function stringifyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

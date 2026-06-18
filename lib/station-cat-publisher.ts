import { createHash } from "node:crypto";
import type {
  PublishChangedItem,
  PublishMode,
  StandardPublishPackage,
} from "./publish-platforms";

export const stationCatImportContract = "station-cat-novelforge-import";
export const stationCatImportContractVersion = 1;
export const stationCatImportPath = "/api/novelforge/import";

export type StationCatChangedItem = {
  localType: PublishChangedItem["localType"];
  localId: string;
  label: string;
  contentHash: string;
  remoteId: string | null;
  changeType: PublishChangedItem["changeType"];
  payload: unknown;
};

export type StationCatImportRequest = {
  contract: typeof stationCatImportContract;
  contractVersion: typeof stationCatImportContractVersion;
  requestId: string;
  mode: PublishMode;
  onlyChanged: boolean;
  source: {
    app: "NovelForge AI";
    packageFormat: StandardPublishPackage["format"];
    packageVersion: StandardPublishPackage["version"];
    generatedAt: string;
  };
  publishPackage: StandardPublishPackage;
  changedItems: StationCatChangedItem[];
};

export type StationCatResultItem = {
  localType: string;
  localId: string;
  remoteId: string | null;
  status: "created" | "updated" | "unchanged" | "skipped" | "failed";
  message: string | null;
};

export type StationCatPublishResult = {
  ok: boolean;
  statusCode: number;
  requestId: string | null;
  remoteBookId: string | null;
  remoteIds: Record<string, string>;
  previewUrl: string | null;
  publishUrl: string | null;
  resultMessage: string | null;
  errors: string[];
  items: StationCatResultItem[];
  rawJson: unknown;
};

type FetchLike = typeof fetch;

export class StationCatPublishError extends Error {
  statusCode: number;
  responseJson: unknown;

  constructor(message: string, statusCode: number, responseJson: unknown) {
    super(message);
    this.name = "StationCatPublishError";
    this.statusCode = statusCode;
    this.responseJson = responseJson;
  }
}

export function buildStationCatImportRequest({
  publishPackage,
  changedItems,
  mode,
  onlyChanged,
  requestId,
}: {
  publishPackage: StandardPublishPackage;
  changedItems: readonly PublishChangedItem[];
  mode: PublishMode;
  onlyChanged: boolean;
  requestId?: string;
}): StationCatImportRequest {
  const mappedChangedItems = changedItems.map((item) => ({
    localType: item.localType,
    localId: item.localId,
    label: item.label,
    contentHash: item.contentHash,
    remoteId: item.remoteId ?? null,
    changeType: item.changeType,
    payload: item.payload,
  }));

  return {
    contract: stationCatImportContract,
    contractVersion: stationCatImportContractVersion,
    requestId:
      requestId ??
      buildStationCatRequestId({
        projectId: publishPackage.project.id,
        generatedAt: publishPackage.generatedAt,
        mode,
        onlyChanged,
        changedItems: mappedChangedItems,
      }),
    mode,
    onlyChanged,
    source: {
      app: "NovelForge AI",
      packageFormat: publishPackage.format,
      packageVersion: publishPackage.version,
      generatedAt: publishPackage.generatedAt,
    },
    publishPackage,
    changedItems: mappedChangedItems,
  };
}

export function serializeStationCatImportRequest(
  request: StationCatImportRequest,
) {
  return `${JSON.stringify(request, null, 2)}\n`;
}

export function buildStationCatImportEndpoint(apiBaseUrl: string) {
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

  if (path.endsWith(stationCatImportPath)) {
    url.pathname = path;
  } else if (path.endsWith("/api/novelforge")) {
    url.pathname = `${path}/import`;
  } else {
    url.pathname = `${path || ""}${stationCatImportPath}`;
  }

  url.search = "";
  url.hash = "";

  return url.toString();
}

export async function publishToStationCat(
  {
    apiBaseUrl,
    token,
    request,
  }: {
    apiBaseUrl: string;
    token: string;
    request: StationCatImportRequest;
  },
  options: {
    fetchImpl?: FetchLike;
  } = {},
): Promise<StationCatPublishResult> {
  assertServerOnly();

  const cleanToken = token.trim();

  if (!cleanToken) {
    throw new Error("Station Cat publish token is not configured.");
  }

  const endpoint = buildStationCatImportEndpoint(apiBaseUrl);
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cleanToken}`,
      "Content-Type": "application/json",
      "X-NovelForge-Contract": `${stationCatImportContract}.v${stationCatImportContractVersion}`,
    },
    body: serializeStationCatImportRequest(request),
  });
  const responseJson = await readJsonResponse(response);

  if (!response.ok) {
    throw new StationCatPublishError(
      extractStationCatErrorMessage(responseJson, response.status),
      response.status,
      responseJson,
    );
  }

  return parseStationCatPublishResult(responseJson, response.status);
}

export function parseStationCatPublishResult(
  responseJson: unknown,
  statusCode = 200,
): StationCatPublishResult {
  const record = isRecord(responseJson) ? responseJson : {};
  const okValue = record.ok ?? record.success;

  return {
    ok: typeof okValue === "boolean" ? okValue : statusCode < 400,
    statusCode,
    requestId: firstString(record.requestId, record.request_id),
    remoteBookId: firstString(record.remoteBookId, record.bookId, record.workId),
    remoteIds: parseRemoteIds(record.remoteIds ?? record.remote_ids),
    previewUrl: firstString(record.previewUrl, record.preview_url),
    publishUrl: firstString(record.publishUrl, record.publish_url, record.url),
    resultMessage: firstString(
      record.resultMessage,
      record.message,
      record.detail,
    ),
    errors: parseErrors(record.errors, record.error),
    items: parseResultItems(record.items ?? record.changedItems),
    rawJson: responseJson,
  };
}

export function remoteIdForStationCatItem(
  result: StationCatPublishResult,
  item: Pick<PublishChangedItem, "localType" | "localId">,
) {
  const matchedItem = result.items.find(
    (resultItem) =>
      resultItem.localType === item.localType && resultItem.localId === item.localId,
  );

  if (matchedItem?.remoteId) {
    return matchedItem.remoteId;
  }

  if (item.localType === "project") {
    return result.remoteIds.project ?? result.remoteBookId;
  }

  if (item.localType === "cover") {
    return result.remoteIds.cover ?? null;
  }

  if (result.items.length > 0 && !matchedItem) {
    return null;
  }

  return result.remoteIds[item.localId] ?? null;
}

export function stationCatItemSucceeded(
  result: StationCatPublishResult,
  item: Pick<PublishChangedItem, "localType" | "localId">,
) {
  const matchedItem = result.items.find(
    (resultItem) =>
      resultItem.localType === item.localType && resultItem.localId === item.localId,
  );

  if (matchedItem) {
    return matchedItem.status !== "failed";
  }

  if (item.localType === "project" && (result.remoteIds.project || result.remoteBookId)) {
    return true;
  }

  if (item.localType === "cover" && result.remoteIds.cover) {
    return true;
  }

  if (result.items.length > 0) {
    return false;
  }

  return result.ok;
}

function buildStationCatRequestId({
  projectId,
  generatedAt,
  mode,
  onlyChanged,
  changedItems,
}: {
  projectId: string;
  generatedAt: string;
  mode: PublishMode;
  onlyChanged: boolean;
  changedItems: readonly StationCatChangedItem[];
}) {
  const signature = createHash("sha256")
    .update(
      JSON.stringify({
        projectId,
        generatedAt,
        mode,
        onlyChanged,
        changedItems: changedItems.map((item) => ({
          localType: item.localType,
          localId: item.localId,
          contentHash: item.contentHash,
          changeType: item.changeType,
        })),
      }),
    )
    .digest("hex")
    .slice(0, 16);

  return `novelforge:${projectId || "project"}:${signature}`;
}

async function readJsonResponse(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function extractStationCatErrorMessage(responseJson: unknown, status: number) {
  if (isRecord(responseJson)) {
    const explicitMessage = firstString(
      responseJson.message,
      responseJson.detail,
      responseJson.errorMessage,
    );

    if (explicitMessage) {
      return explicitMessage;
    }

    if (isRecord(responseJson.error)) {
      const code = firstString(responseJson.error.code);
      const nestedMessage = firstString(
        responseJson.error.message,
        responseJson.error.detail,
      );

      if (nestedMessage) {
        return code ? `${code}: ${nestedMessage}` : nestedMessage;
      }
    }
  }

  return `Station Cat publish request failed with status ${status}.`;
}

function parseErrors(errors: unknown, error: unknown) {
  const parsedErrors = Array.isArray(errors)
    ? errors.flatMap((item) => {
        if (typeof item === "string" && item.trim()) {
          return [item.trim()];
        }

        if (isRecord(item)) {
          const code = firstString(item.code);
          const message = firstString(item.message, item.detail, item.code);

          return message ? [code && code !== message ? `${code}: ${message}` : message] : [];
        }

        return [];
      })
    : [];

  if (parsedErrors.length > 0) {
    return parsedErrors;
  }

  if (typeof error === "string" && error.trim()) {
    return [error.trim()];
  }

  if (isRecord(error)) {
    const code = firstString(error.code);
    const message = firstString(error.message, error.detail, error.code);

    return message ? [code && code !== message ? `${code}: ${message}` : message] : [];
  }

  return [];
}

function parseRemoteIds(value: unknown) {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, entryValue]) =>
      typeof entryValue === "string" && entryValue.trim()
        ? [[key, entryValue.trim()]]
        : [],
    ),
  );
}

function parseResultItems(value: unknown): StationCatResultItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const localType = firstString(item.localType, item.local_type);
    const localId = firstString(item.localId, item.local_id);

    if (!localType || !localId) {
      return [];
    }

    return [
      {
        localType,
        localId,
        remoteId: firstString(item.remoteId, item.remote_id),
        status: normalizeResultItemStatus(item.status),
        message: firstString(item.message, item.detail),
      },
    ];
  });
}

function normalizeResultItemStatus(value: unknown): StationCatResultItem["status"] {
  return value === "created" ||
    value === "updated" ||
    value === "unchanged" ||
    value === "skipped" ||
    value === "failed"
    ? value
    : "updated";
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function assertServerOnly() {
  if (typeof window !== "undefined") {
    throw new Error("Station Cat publisher can only run on the server.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

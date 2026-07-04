import { buildExportData, projectPublishInclude } from "@/lib/project-export-data";
import { chapterSnapshot, chapterValuesFromRecord } from "@/lib/chapter-fields";
import {
  buildPublishSyncItems,
  buildStandardPublishPackage,
  diffPublishSyncItems,
  filterPublishChangedItemsByUploadScope,
  hashPublishPayload,
  normalizePublishMode,
  publishModeLabel,
  stringifyStandardPublishPackage,
  type PublishChangedItem,
  type PublishMode,
  type PublishUploadScope,
} from "@/lib/publish-platforms";
import { prisma } from "@/lib/prisma";
import {
  buildStationCatImportEndpoint,
  buildStationCatImportRequest,
  publishToStationCat,
  remoteIdForStationCatItem,
  serializeStationCatImportRequest,
  stationCatItemSucceeded,
  type StationCatPublishResult,
} from "@/lib/station-cat-publisher";

export type PublishUploadSelection = {
  scope: PublishUploadScope;
  chapterId: string | null;
};

export async function createPublishRun({
  projectId,
  project,
  target,
  mode,
  onlyChanged,
  uploadSelection,
}: {
  projectId: string;
  project: NonNullable<Awaited<ReturnType<typeof loadProjectForPublishRun>>>;
  target: NonNullable<Awaited<ReturnType<typeof loadPublishTargetForRun>>>;
  mode: PublishMode;
  onlyChanged: boolean;
  uploadSelection: PublishUploadSelection;
}) {
  const standardPackage = buildStandardPublishPackage(buildExportData(project));
  const syncItems = buildPublishSyncItems(standardPackage);
  const candidateChangedItems = onlyChanged
    ? diffPublishSyncItems(syncItems, target.syncStates)
    : markAllSyncItemsForUpload(syncItems, target.syncStates);
  const changedItems = filterPublishChangedItemsByUploadScope(
    candidateChangedItems,
    uploadSelection.scope,
    uploadSelection.chapterId,
  );
  const uploadDescription = describePublishUploadSelection(
    uploadSelection,
    standardPackage,
  );
  const completedAt = new Date();
  const stationCatRequest =
    target.platformKey === "station_cat"
      ? buildStationCatImportRequest({
          publishPackage: standardPackage,
          changedItems,
          mode,
          onlyChanged,
        })
      : null;
  const stationCatEndpoint =
    target.platformKey === "station_cat" && target.apiBaseUrl
      ? buildStationCatImportEndpoint(target.apiBaseUrl)
      : null;
  const stationCatAttempt = stationCatRequest
    ? await runStationCatPublishAttempt({
        apiBaseUrl: target.apiBaseUrl,
        token: target.tokenSecret,
        request: stationCatRequest,
        mode,
        onlyChanged,
        changedCount: changedItems.length,
        uploadDescription,
        endpoint: stationCatEndpoint,
      })
    : null;
  const runStatus = stationCatAttempt?.status ?? "completed";
  const stationCatResult = stationCatAttempt?.result ?? null;
  const changedItemsJson = JSON.stringify(
    changedItems.map((item) => serializeChangedItem(item, stationCatResult)),
    null,
    2,
  );
  const resultMessage =
    stationCatAttempt?.resultMessage ??
    buildPublishRunMessage({
      mode,
      onlyChanged,
      changedCount: changedItems.length,
      uploadDescription,
      hasToken: Boolean(target.tokenSecret),
      hasApiBaseUrl: Boolean(target.apiBaseUrl),
    });
  const errorMessage = stationCatAttempt?.errorMessage ?? null;
  const publishedChapterIds = publishedChapterIdsForSuccessfulStationCatItems(
    changedItems,
    stationCatResult,
  );
  const publishedChapterIdSet = new Set(publishedChapterIds);

  await prisma.$transaction(async (tx) => {
    await tx.publishRun.create({
      data: {
        projectId,
        targetId: target.id,
        mode,
        status: runStatus,
        packageJson: stationCatRequest
          ? serializeStationCatImportRequest(stationCatRequest)
          : stringifyStandardPublishPackage(standardPackage),
        changedItemsJson,
        previewUrl: stationCatResult?.previewUrl ?? null,
        publishUrl: stationCatResult?.publishUrl ?? null,
        resultMessage,
        errorMessage,
        completedAt,
      },
    });

    for (const item of changedItems) {
      if (stationCatResult && !stationCatItemSucceeded(stationCatResult, item)) {
        continue;
      }

      if (stationCatRequest && !stationCatResult?.ok) {
        continue;
      }

      const remoteId = stationCatResult
        ? remoteIdForStationCatItem(stationCatResult, item)
        : (item.remoteId ?? null);
      const contentHash =
        item.localType === "chapter" && publishedChapterIdSet.has(item.localId)
          ? publishedChapterContentHash(item)
          : item.contentHash;

      await tx.publishSyncState.upsert({
        where: {
          targetId_localType_localId: {
            targetId: target.id,
            localType: item.localType,
            localId: item.localId,
          },
        },
        create: {
          projectId,
          targetId: target.id,
          localType: item.localType,
          localId: item.localId,
          remoteId,
          contentHash,
          lastMode: mode,
          lastSyncedAt: completedAt,
        },
        update: {
          remoteId,
          contentHash,
          lastMode: mode,
          lastSyncedAt: completedAt,
        },
      });
    }

    if (publishedChapterIds.length > 0) {
      const chaptersToMark = await tx.chapter.findMany({
        where: {
          projectId,
          id: {
            in: publishedChapterIds,
          },
          status: {
            not: "published",
          },
        },
      });

      for (const chapter of chaptersToMark) {
        const snapshot = chapterSnapshot({
          ...chapterValuesFromRecord(chapter),
          status: "published",
        });

        await tx.chapter.update({
          where: {
            id: chapter.id,
          },
          data: snapshot,
        });

        const versionCount = await tx.chapterVersion.count({
          where: {
            chapterId: chapter.id,
          },
        });

        await tx.chapterVersion.create({
          data: {
            projectId,
            chapterId: chapter.id,
            versionNumber: versionCount + 1,
            snapshotJson: JSON.stringify(snapshot),
            changeReason: "上传到 Station Cat 后自动标记为已发布。",
            sourceType: "station_cat_publish",
          },
        });
      }
    }
  });
}

export async function loadProjectForPublishRun(projectId: string) {
  return prisma.project.findUnique({
    where: {
      id: projectId,
    },
    include: projectPublishInclude,
  });
}

export async function loadPublishTargetForRun(projectId: string, targetId: string) {
  return prisma.publishTarget.findFirst({
    where: {
      id: targetId,
      projectId,
      status: "active",
    },
    include: {
      syncStates: true,
    },
  });
}

export async function ensureGlobalStationCatTarget(
  projectId: string,
  settings: {
    apiBaseUrl: string;
    token: string;
    defaultMode: PublishMode;
  },
) {
  const existingTarget = await prisma.publishTarget.findFirst({
    where: {
      projectId,
      platformKey: "station_cat",
      name: "Station Cat 全局配置",
      status: "active",
    },
    select: {
      id: true,
    },
  });
  const data = {
    name: "Station Cat 全局配置",
    platformKey: "station_cat",
    apiBaseUrl: settings.apiBaseUrl,
    defaultMode: normalizePublishMode(settings.defaultMode),
    tokenSecret: settings.token || null,
    tokenUpdatedAt: new Date(),
  };

  if (existingTarget) {
    const target = await prisma.publishTarget.update({
      where: {
        id: existingTarget.id,
      },
      data,
      select: {
        id: true,
      },
    });

    return target.id;
  }

  const target = await prisma.publishTarget.create({
    data: {
      projectId,
      ...data,
    },
    select: {
      id: true,
    },
  });

  return target.id;
}

export function markAllSyncItemsForUpload(
  syncItems: ReturnType<typeof buildPublishSyncItems>,
  previousStates: {
    localType: string;
    localId: string;
    remoteId?: string | null;
  }[],
): PublishChangedItem[] {
  return syncItems.map((item) => {
    const previousState = previousStates.find(
      (state) => state.localType === item.localType && state.localId === item.localId,
    );

    return {
      ...item,
      remoteId: previousState?.remoteId ?? null,
      changeType: previousState ? "update" : "create",
    };
  });
}

export function describePublishUploadSelection(
  selection: PublishUploadSelection,
  standardPackage: ReturnType<typeof buildStandardPublishPackage>,
) {
  if (selection.scope !== "chapter") {
    return "全部变更";
  }

  const chapter = standardPackage.chapters.find(
    (item) => item.id === selection.chapterId,
  );

  if (!chapter) {
    return "指定章节";
  }

  return `指定章节：第 ${chapter.chapterNumber ?? "?"} 章《${chapter.title}》`;
}

export function publishedChapterIdsForSuccessfulStationCatItems(
  changedItems: readonly Pick<PublishChangedItem, "localType" | "localId">[],
  stationCatResult?: StationCatPublishResult | null,
) {
  if (!stationCatResult?.ok) {
    return [];
  }

  return [
    ...new Set(
      changedItems.flatMap((item) =>
        item.localType === "chapter" &&
        stationCatItemSucceeded(stationCatResult, item)
          ? [item.localId]
          : [],
      ),
    ),
  ];
}

function publishedChapterContentHash(item: PublishChangedItem) {
  if (!isObjectPayload(item.payload)) {
    return item.contentHash;
  }

  return hashPublishPayload({
    ...item.payload,
    status: "published",
  });
}

function isObjectPayload(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function runStationCatPublishAttempt({
  apiBaseUrl,
  token,
  request,
  mode,
  onlyChanged,
  changedCount,
  uploadDescription,
  endpoint,
}: {
  apiBaseUrl?: string | null;
  token?: string | null;
  request: Parameters<typeof publishToStationCat>[0]["request"];
  mode: PublishMode;
  onlyChanged: boolean;
  changedCount: number;
  uploadDescription: string;
  endpoint: string | null;
}): Promise<{
  status: "completed" | "failed";
  result: StationCatPublishResult | null;
  resultMessage: string;
  errorMessage: string | null;
}> {
  if (changedCount === 0) {
    return {
      status: "completed",
      result: null,
      resultMessage: `Station Cat 无需同步：${uploadDescription} / ${onlyChanged ? "仅上传变更" : "强制上传"}模式下没有检测到待上传条目，未调用网站 API。`,
      errorMessage: null,
    };
  }

  if (!apiBaseUrl) {
    return {
      status: "failed",
      result: null,
      resultMessage: "Station Cat 发布失败：尚未填写 API Base URL。",
      errorMessage: "Station Cat API Base URL is not configured.",
    };
  }

  if (!token) {
    return {
      status: "failed",
      result: null,
      resultMessage:
        "Station Cat 发布失败：尚未保存 Station Cat Publish Token，请先在目标网站配置中填写。",
      errorMessage: "Station Cat Publish Token is not configured.",
    };
  }

  try {
    const result = await publishToStationCat({
      apiBaseUrl,
      token,
      request,
    });

    if (!result.ok) {
      const errorMessage = stationCatResultErrorMessage(result);

      return {
        status: "failed",
        result,
        resultMessage: `Station Cat 返回失败：${errorMessage}`,
        errorMessage,
      };
    }

    return {
      status: "completed",
      result,
      resultMessage: buildStationCatSuccessMessage({
        mode,
        changedCount,
        endpoint,
        requestId: result.requestId ?? request.requestId,
        message: result.resultMessage,
      }),
      errorMessage: null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error.";

    return {
      status: "failed",
      result: null,
      resultMessage: `Station Cat 发布失败：${errorMessage}`,
      errorMessage,
    };
  }
}

function serializeChangedItem(
  item: PublishChangedItem,
  stationCatResult?: StationCatPublishResult | null,
) {
  const remoteItem = stationCatResult?.items.find(
    (resultItem) =>
      resultItem.localType === item.localType && resultItem.localId === item.localId,
  );

  return {
    localType: item.localType,
    localId: item.localId,
    label: item.label,
    contentHash: item.contentHash,
    remoteId: stationCatResult
      ? remoteIdForStationCatItem(stationCatResult, item)
      : (item.remoteId ?? null),
    changeType: item.changeType,
    remoteStatus: remoteItem?.status ?? null,
    remoteMessage: remoteItem?.message ?? null,
  };
}

function buildPublishRunMessage({
  mode,
  onlyChanged,
  changedCount,
  uploadDescription,
  hasToken,
  hasApiBaseUrl,
}: {
  mode: string;
  onlyChanged: boolean;
  changedCount: number;
  uploadDescription: string;
  hasToken: boolean;
  hasApiBaseUrl: boolean;
}) {
  const uploadScope = onlyChanged ? "仅上传变更" : "强制上传";
  const baseMessage = `${uploadDescription} / ${uploadScope}标准包已准备完成：${publishModeLabel(mode)}，检测到 ${changedCount} 个待上传条目。`;

  if (!hasToken) {
    return `${baseMessage} 当前目标尚未保存 Token，等待补齐后再接入真实网站导入。`;
  }

  if (!hasApiBaseUrl) {
    return `${baseMessage} 当前目标尚未填写 API 地址，等待网站端接口定稿。`;
  }

  return `${baseMessage} 软件端已保存目标和 Token；真实上传将在网站 API 接入后启用。`;
}

function buildStationCatSuccessMessage({
  mode,
  changedCount,
  endpoint,
  requestId,
  message,
}: {
  mode: string;
  changedCount: number;
  endpoint: string | null;
  requestId: string;
  message: string | null;
}) {
  return [
    `Station Cat 已完成：${publishModeLabel(mode)}，同步 ${changedCount} 个条目。`,
    endpoint ? `接口：${endpoint}。` : "",
    `请求 ID：${requestId}。`,
    message ? `网站返回：${message}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function stationCatResultErrorMessage(result: StationCatPublishResult) {
  return (
    result.errors.join("；") ||
    result.resultMessage ||
    `Station Cat returned status ${result.statusCode}.`
  );
}

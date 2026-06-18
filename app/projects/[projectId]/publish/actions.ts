"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import {
  buildPublishPackageContext,
  parsePublishPackageOutput,
  type PublishPackageChapterContext,
} from "@/lib/ai/publish-packages";
import { hasConfirmedChapterText } from "@/lib/ai/chapter-summaries";
import { ensureDefaultPromptTemplate } from "@/lib/ai/prompt-template-store";
import { activeAiTaskStatuses } from "@/lib/ai/status";
import { startLoggedOpenAITextTask } from "@/lib/ai/task-logger";
import { readStationCatPublishSecrets } from "@/lib/ai/local-config";
import { buildExportData, projectPublishInclude } from "@/lib/project-export-data";
import {
  buildPublishSyncItems,
  buildStandardPublishPackage,
  diffPublishSyncItems,
  normalizePublishMode,
  publishModeLabel,
  publishPlatformOptions,
  stringifyStandardPublishPackage,
  type PublishChangedItem,
  type PublishMode,
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

const publishPackageTemplateKey = "wechat_publish_packaging";
const publishPackageTaskType = "wechat_publish_packaging";

export async function generatePublishPackage(
  projectId: string,
  chapterId: string,
) {
  const activeTask = await findActivePublishPackageTask(projectId, chapterId);

  if (activeTask) {
    revalidatePublishPaths(projectId, chapterId);
    redirect(`/projects/${projectId}/publish`);
  }

  const contextInput = await loadPublishPackageContext(projectId, chapterId);

  if (!hasConfirmedChapterText(contextInput.chapter)) {
    revalidatePublishPaths(projectId, chapterId);
    redirect(`/projects/${projectId}/publish`);
  }

  const template = await ensureDefaultPromptTemplate(
    projectId,
    publishPackageTemplateKey,
  );
  const context = buildPublishPackageContext(contextInput);

  await startLoggedOpenAITextTask(
    {
      projectId,
      chapterId,
      promptTemplateId: template.id,
      taskType: template.taskType,
      model: undefined,
      inputContextSummary: context.inputContextSummary,
      inputJson: context.inputJson,
    },
    {
      systemPrompt: template.systemPrompt,
      developerPrompt: [
        template.userPrompt,
        template.contextNotes,
        template.responseSchema
          ? `请严格输出符合以下 JSON Schema 的 JSON：\n${template.responseSchema}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      input: context.inputText,
    },
    {
      onCompleted: async (task) => {
        const suggestion = parsePublishPackageOutput(task.outputText, {
          chapterTitle: contextInput.chapter.title,
          finalText: contextInput.chapter.finalText,
        });

        if (!suggestion) {
          return;
        }

        await prisma.publishPackage.create({
          data: {
            projectId,
            chapterId,
            aiTaskId: task.id,
            titleCandidatesJson: JSON.stringify(
              suggestion.titleCandidates,
              null,
              2,
            ),
            selectedTitle: suggestion.selectedTitle,
            openingGuide: suggestion.openingGuide,
            chapterSummary: suggestion.chapterSummary,
            endingQuestion: suggestion.endingQuestion,
            nextChapterPreview: suggestion.nextChapterPreview,
            commentGuide: suggestion.commentGuide,
            collectionTitle: suggestion.collectionTitle,
            coverPrompt: suggestion.coverPrompt,
            markdownBody: suggestion.markdownBody,
            checklistJson: JSON.stringify(suggestion.checklist, null, 2),
            status: "draft",
          },
        });
      },
    },
  );

  revalidatePublishPaths(projectId, chapterId);
  redirect(`/projects/${projectId}/publish`);
}

export async function markPublishPackageExported(
  projectId: string,
  publishPackageId: string,
) {
  const publishPackage = await prisma.publishPackage.findFirst({
    where: {
      id: publishPackageId,
      projectId,
    },
    select: {
      id: true,
      chapterId: true,
      aiTaskId: true,
    },
  });

  if (!publishPackage) {
    notFound();
  }

  await prisma.$transaction(async (tx) => {
    await tx.publishPackage.update({
      where: {
        id: publishPackage.id,
      },
      data: {
        status: "exported",
      },
    });

    if (publishPackage.aiTaskId) {
      await tx.aiTask.update({
        where: {
          id: publishPackage.aiTaskId,
        },
        data: {
          adoptionState: "adopted",
        },
      });
    }
  });

  revalidatePublishPaths(projectId, publishPackage.chapterId);
  redirect(`/projects/${projectId}/publish`);
}

export async function savePublishTarget(projectId: string, formData: FormData) {
  await assertProject(projectId);

  const targetId = clean(formData.get("targetId")?.toString());
  const platformKey = clean(formData.get("platformKey")?.toString()) || "station_cat";
  const name =
    clean(formData.get("name")?.toString()) ||
    publishPlatformOptions.find((option) => option.value === platformKey)?.defaultName ||
    "自定义发布目标";
  const apiBaseUrl = normalizeOptionalUrl(formData.get("apiBaseUrl")?.toString());
  const defaultMode = normalizePublishMode(formData.get("defaultMode")?.toString());
  const tokenInput = clean(formData.get("token")?.toString());
  const clearToken = formData.get("clearToken") === "on";

  if (targetId) {
    const target = await prisma.publishTarget.findFirst({
      where: {
        id: targetId,
        projectId,
      },
      select: {
        id: true,
        tokenSecret: true,
      },
    });

    if (!target) {
      notFound();
    }

    await prisma.publishTarget.update({
      where: {
        id: target.id,
      },
      data: {
        name,
        platformKey,
        apiBaseUrl,
        defaultMode,
        tokenSecret: clearToken ? null : tokenInput || target.tokenSecret,
        tokenUpdatedAt: clearToken || tokenInput ? new Date() : undefined,
      },
    });
  } else {
    await prisma.publishTarget.create({
      data: {
        projectId,
        name,
        platformKey,
        apiBaseUrl,
        defaultMode,
        tokenSecret: tokenInput || null,
        tokenUpdatedAt: tokenInput ? new Date() : null,
      },
    });
  }

  revalidatePublishPaths(projectId);
  redirect(`/projects/${projectId}/publish`);
}

export async function preparePublishRun(
  projectId: string,
  targetId: string,
  formData: FormData,
) {
  const mode = normalizePublishMode(formData.get("publishMode")?.toString());
  const onlyChanged = formData.get("onlyChanged") === "on";
  const [project, target] = await Promise.all([
    loadProjectForPublishRun(projectId),
    loadPublishTargetForRun(projectId, targetId),
  ]);

  if (!project || !target) {
    notFound();
  }

  await createPublishRun({
    projectId,
    project,
    target,
    mode,
    onlyChanged,
  });

  revalidatePublishPaths(projectId);
  redirect(`/projects/${projectId}/publish`);
}

export async function prepareGlobalStationCatPublishRun(
  projectId: string,
  formData: FormData,
) {
  const stationCatSettings = readStationCatPublishSecrets();
  const mode = normalizePublishMode(
    formData.get("publishMode")?.toString() || stationCatSettings.defaultMode,
  );
  const onlyChanged = formData.get("onlyChanged") === "on";
  const project = await loadProjectForPublishRun(projectId);

  if (!project) {
    notFound();
  }

  const targetId = await ensureGlobalStationCatTarget(projectId, {
    apiBaseUrl: stationCatSettings.apiBaseUrl,
    token: stationCatSettings.token,
    defaultMode: mode,
  });
  const target = await loadPublishTargetForRun(projectId, targetId);

  if (!target) {
    notFound();
  }

  await createPublishRun({
    projectId,
    project,
    target,
    mode,
    onlyChanged,
  });

  revalidatePublishPaths(projectId);
  redirect(`/projects/${projectId}/publish`);
}

async function createPublishRun({
  projectId,
  project,
  target,
  mode,
  onlyChanged,
}: {
  projectId: string;
  project: NonNullable<Awaited<ReturnType<typeof loadProjectForPublishRun>>>;
  target: NonNullable<Awaited<ReturnType<typeof loadPublishTargetForRun>>>;
  mode: PublishMode;
  onlyChanged: boolean;
}) {
  const standardPackage = buildStandardPublishPackage(buildExportData(project));
  const syncItems = buildPublishSyncItems(standardPackage);
  const changedItems = onlyChanged
    ? diffPublishSyncItems(syncItems, target.syncStates)
    : markAllSyncItemsForUpload(syncItems, target.syncStates);
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
      hasToken: Boolean(target.tokenSecret),
      hasApiBaseUrl: Boolean(target.apiBaseUrl),
    });
  const errorMessage = stationCatAttempt?.errorMessage ?? null;

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
          contentHash: item.contentHash,
          lastMode: mode,
          lastSyncedAt: completedAt,
        },
        update: {
          remoteId,
          contentHash: item.contentHash,
          lastMode: mode,
          lastSyncedAt: completedAt,
        },
      });
    }
  });
}

async function loadProjectForPublishRun(projectId: string) {
  return prisma.project.findUnique({
    where: {
      id: projectId,
    },
    include: projectPublishInclude,
  });
}

async function loadPublishTargetForRun(projectId: string, targetId: string) {
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

async function ensureGlobalStationCatTarget(
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

async function runStationCatPublishAttempt({
  apiBaseUrl,
  token,
  request,
  mode,
  onlyChanged,
  changedCount,
  endpoint,
}: {
  apiBaseUrl?: string | null;
  token?: string | null;
  request: Parameters<typeof publishToStationCat>[0]["request"];
  mode: PublishMode;
  onlyChanged: boolean;
  changedCount: number;
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
      resultMessage: `Station Cat 无需同步：${onlyChanged ? "仅变更" : "全量"}模式下没有检测到待上传条目，未调用网站 API。`,
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

async function loadPublishPackageContext(projectId: string, chapterId: string) {
  const chapter = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
      projectId,
    },
    include: {
      project: {
        include: {
          setting: true,
        },
      },
    },
  });

  if (!chapter) {
    notFound();
  }

  const [latestSummaryTask, recentPublishPackages] = await Promise.all([
    prisma.aiTask.findFirst({
      where: {
        projectId,
        chapterId,
        taskType: "chapter_summary_extraction",
        status: "completed",
      },
      orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        inputContextSummary: true,
        outputText: true,
        completedAt: true,
      },
    }),
    prisma.publishPackage.findMany({
      where: {
        projectId,
        chapterId: {
          not: chapterId,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: {
        selectedTitle: true,
        titleCandidatesJson: true,
      },
    }),
  ]);

  return {
    project: {
      title: chapter.project.title,
      genre: chapter.project.genre,
      targetAudience: chapter.project.targetAudience,
      platform: chapter.project.platform,
      description: chapter.project.description,
      wechatPositioning: chapter.project.wechatPositioning,
    },
    setting: chapter.project.setting,
    chapter: pickPublishPackageChapterContext(chapter),
    latestSummaryTask,
    recentPublishPackages,
  };
}

async function assertProject(projectId: string) {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      id: true,
    },
  });

  if (!project) {
    notFound();
  }
}

async function findActivePublishPackageTask(projectId: string, chapterId: string) {
  return prisma.aiTask.findFirst({
    where: {
      projectId,
      chapterId,
      taskType: publishPackageTaskType,
      status: {
        in: [...activeAiTaskStatuses],
      },
    },
    select: {
      id: true,
    },
  });
}

function pickPublishPackageChapterContext(chapter: PublishPackageChapterContext) {
  return {
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    goal: chapter.goal,
    finalText: chapter.finalText,
    notes: chapter.notes,
  };
}

function revalidatePublishPaths(projectId: string, chapterId?: string | null) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/ai`);
  revalidatePath(`/projects/${projectId}/publish`);
  revalidatePath(`/projects/${projectId}/chapters`);

  if (chapterId) {
    revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
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

function markAllSyncItemsForUpload(
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

function buildPublishRunMessage({
  mode,
  onlyChanged,
  changedCount,
  hasToken,
  hasApiBaseUrl,
}: {
  mode: string;
  onlyChanged: boolean;
  changedCount: number;
  hasToken: boolean;
  hasApiBaseUrl: boolean;
}) {
  const uploadScope = onlyChanged ? "仅变更" : "全量";
  const baseMessage = `${uploadScope}标准包已准备完成：${publishModeLabel(mode)}，检测到 ${changedCount} 个待上传条目。`;

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

function normalizeOptionalUrl(value?: string | null) {
  const cleaned = clean(value);

  if (!cleaned) {
    return null;
  }

  if (!/^https?:\/\/[^\s]+$/i.test(cleaned)) {
    throw new Error("发布目标 API 地址必须是 http 或 https URL。");
  }

  return cleaned.replace(/\/+$/, "");
}

function clean(value?: string | null) {
  return value?.trim() ?? "";
}

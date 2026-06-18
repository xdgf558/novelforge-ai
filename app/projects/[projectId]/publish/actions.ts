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
import { runLoggedOpenAITextTask } from "@/lib/ai/task-logger";
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
} from "@/lib/publish-platforms";
import { prisma } from "@/lib/prisma";
import {
  buildStationCatDryRunMessage,
  buildStationCatImportEndpoint,
  buildStationCatImportRequest,
  serializeStationCatImportRequest,
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

  const task = await runLoggedOpenAITextTask(
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
  );

  const suggestion = parsePublishPackageOutput(task.outputText, {
    chapterTitle: contextInput.chapter.title,
    finalText: contextInput.chapter.finalText,
  });

  if (suggestion) {
    await prisma.publishPackage.create({
      data: {
        projectId,
        chapterId,
        aiTaskId: task.id,
        titleCandidatesJson: JSON.stringify(suggestion.titleCandidates, null, 2),
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
  }

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
    prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: projectPublishInclude,
    }),
    prisma.publishTarget.findFirst({
      where: {
        id: targetId,
        projectId,
        status: "active",
      },
      include: {
        syncStates: true,
      },
    }),
  ]);

  if (!project || !target) {
    notFound();
  }

  const standardPackage = buildStandardPublishPackage(buildExportData(project));
  const syncItems = buildPublishSyncItems(standardPackage);
  const changedItems = onlyChanged
    ? diffPublishSyncItems(syncItems, target.syncStates)
    : markAllSyncItemsForUpload(syncItems, target.syncStates);
  const completedAt = new Date();
  const changedItemsJson = JSON.stringify(
    changedItems.map(serializeChangedItem),
    null,
    2,
  );
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

  await prisma.$transaction(async (tx) => {
    await tx.publishRun.create({
      data: {
        projectId,
        targetId: target.id,
        mode,
        status: "completed",
        packageJson: stationCatRequest
          ? serializeStationCatImportRequest(stationCatRequest)
          : stringifyStandardPublishPackage(standardPackage),
        changedItemsJson,
        resultMessage: buildPublishRunMessage({
          mode,
          onlyChanged,
          changedCount: changedItems.length,
          hasToken: Boolean(target.tokenSecret),
          hasApiBaseUrl: Boolean(target.apiBaseUrl),
          platformKey: target.platformKey,
          stationCatEndpoint,
          stationCatRequestId: stationCatRequest?.requestId ?? null,
        }),
        completedAt,
      },
    });

    for (const item of changedItems) {
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
          remoteId: item.remoteId ?? null,
          contentHash: item.contentHash,
          lastMode: mode,
          lastSyncedAt: completedAt,
        },
        update: {
          contentHash: item.contentHash,
          lastMode: mode,
          lastSyncedAt: completedAt,
        },
      });
    }
  });

  revalidatePublishPaths(projectId);
  redirect(`/projects/${projectId}/publish`);
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

function serializeChangedItem(item: PublishChangedItem) {
  return {
    localType: item.localType,
    localId: item.localId,
    label: item.label,
    contentHash: item.contentHash,
    remoteId: item.remoteId ?? null,
    changeType: item.changeType,
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
  platformKey,
  stationCatEndpoint,
  stationCatRequestId,
}: {
  mode: string;
  onlyChanged: boolean;
  changedCount: number;
  hasToken: boolean;
  hasApiBaseUrl: boolean;
  platformKey: string;
  stationCatEndpoint: string | null;
  stationCatRequestId: string | null;
}) {
  const uploadScope = onlyChanged ? "仅变更" : "全量";
  const baseMessage = `${uploadScope}标准包已准备完成：${publishModeLabel(mode)}，检测到 ${changedCount} 个待上传条目。`;

  if (platformKey === "station_cat") {
    return `${baseMessage} ${buildStationCatDryRunMessage({
      endpoint: stationCatEndpoint,
      requestId: stationCatRequestId,
      changedCount,
      hasToken,
    })}`;
  }

  if (!hasToken) {
    return `${baseMessage} 当前目标尚未保存 Token，等待补齐后再接入真实网站导入。`;
  }

  if (!hasApiBaseUrl) {
    return `${baseMessage} 当前目标尚未填写 API 地址，等待网站端接口定稿。`;
  }

  return `${baseMessage} 软件端已保存目标和 Token；真实上传将在网站 API 接入后启用。`;
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

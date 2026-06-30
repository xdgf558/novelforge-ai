"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import {
  buildChapterBeatContext,
  type ChapterBeatChapterContext,
} from "@/lib/ai/chapter-beats";
import {
  buildChapterDraftContext,
  hasConfirmedChapterBeats,
  type ChapterDraftChapterContext,
} from "@/lib/ai/chapter-drafts";
import {
  buildSegmentedChapterPolishContext,
  buildChapterPolishContext,
  hasPolishableChapterText,
  isExcerptedChapterPolishInputJson,
  shouldSegmentChapterPolish,
  type ChapterPolishChapterContext,
} from "@/lib/ai/chapter-polishes";
import { normalizeChapterPlatformTemplate } from "@/lib/ai/chapter-platform-templates";
import {
  buildChapterSummaryContext,
  hasConfirmedChapterText,
  type ChapterSummaryChapterContext,
} from "@/lib/ai/chapter-summaries";
import { ensureDefaultPromptTemplate } from "@/lib/ai/prompt-template-store";
import { loadReaderFeedbackSignalsForChapterGeneration } from "@/lib/ai/reader-feedback-signal-store";
import { completeRunningSegmentedChapterPolishTask } from "@/lib/ai/segmented-chapter-polish-runner";
import { activeAiTaskStatuses } from "@/lib/ai/status";
import {
  createAiTask,
  markAiTaskRunning,
  startLoggedOpenAITextTask,
} from "@/lib/ai/task-logger";
import { readStationCatPublishSecrets } from "@/lib/ai/local-config";
import {
  chapterFieldNames,
  chapterValuesFromRecord,
  chapterSnapshot,
  chapterStatusOptions,
  type ChapterValues,
} from "@/lib/chapter-fields";
import { selectRelevantOutlinesForChapter } from "@/lib/outline-fields";
import {
  calculateOutlineProgress,
  chapterBelongsToOutline,
} from "@/lib/outline-progress";
import { prisma } from "@/lib/prisma";
import { fetchStationCatReaderFeedback } from "@/lib/reader-feedback";
import { createMissingStorylineChapterRelationsForChapter } from "@/lib/storyline-auto-relations";

const optionalChapterText = z
  .preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? "" : value),
    z.string().trim().max(60000),
  )
  .default("");

const chapterNumberSchema = z.preprocess((value) => {
  if (typeof value !== "string" || value.trim() === "") {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}, z.number().int().positive());

const statusValues = chapterStatusOptions.map((option) => option.value) as [
  string,
  ...string[],
];

const chapterSchema = z.object({
  chapterNumber: chapterNumberSchema,
  title: z.string().trim().min(1, "请输入章节标题").max(160),
  status: z.enum(statusValues).default("draft"),
  goal: optionalChapterText,
  beats: optionalChapterText,
  draftText: optionalChapterText,
  polishedText: optionalChapterText,
  finalText: optionalChapterText,
  notes: optionalChapterText,
});

const changeReasonSchema = z
  .preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(1000).optional(),
  );

const readerRemoteIdSchema = z
  .preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(240).nullable(),
  )
  .default(null);

const chapterBeatTemplateKey = "chapter_beat_generation";
const chapterDraftTemplateKey = "chapter_draft_generation";
const chapterPolishTemplateKey = "chapter_polish_generation";
const chapterSummaryTemplateKey = "chapter_summary_extraction";
const readerFeedbackSnapshotRetentionLimit = 30;

function parseChapterForm(formData: FormData) {
  const parsedValues = chapterSchema.parse(
    Object.fromEntries(
      chapterFieldNames
        .filter((fieldName) => fieldName !== "wordCount")
        .map((fieldName) => [fieldName, formData.get(fieldName)]),
    ),
  );

  const values: ChapterValues = {
    ...parsedValues,
    wordCount: 0,
  };

  const submitIntent = formData.get("submitIntent");
  const finalizeError =
    submitIntent === "finalizeFromPolished" && !values.polishedText.trim()
      ? "missingPolishedText"
      : submitIntent === "finalizeFromDraft" && !values.draftText.trim()
        ? "missingDraftText"
        : null;
  const finalTextSource =
    submitIntent === "finalizeFromPolished"
      ? values.polishedText
      : submitIntent === "finalizeFromDraft"
        ? values.draftText
        : "";
  const shouldFinalize = Boolean(finalTextSource.trim());
  const parsedChangeReason = changeReasonSchema.parse(
    formData.get("changeReason"),
  );
  const changeReason = shouldFinalize
    ? (parsedChangeReason ??
      (submitIntent === "finalizeFromPolished"
        ? "一键定稿：将精修正文保存为定稿正文"
        : "一键定稿：将草稿正文保存为定稿正文"))
    : parsedChangeReason;

  if (shouldFinalize) {
    values.finalText = finalTextSource;
    values.status = "final";
  }

  return {
    values,
    changeReason,
    finalizeError,
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

export async function createChapter(projectId: string, formData: FormData) {
  await assertProject(projectId);

  const { values, changeReason } = parseChapterForm(formData);
  const snapshot = chapterSnapshot(values);

  const chapter = await prisma.$transaction(async (tx) => {
    const createdChapter = await tx.chapter.create({
      data: {
        projectId,
        ...snapshot,
      },
    });

    await tx.chapterVersion.create({
      data: {
        projectId,
        chapterId: createdChapter.id,
        versionNumber: 1,
        snapshotJson: JSON.stringify(snapshot),
        changeReason,
        sourceType: "manual",
      },
    });

    await createMissingStorylineChapterRelationsForChapter(
      tx,
      projectId,
      createdChapter,
    );

    return createdChapter;
  });

  await syncOutlineStatusesForChapterNumbers(projectId, [snapshot.chapterNumber]);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/chapters`);
  revalidatePath(`/projects/${projectId}/outlines`);
  revalidatePath(`/projects/${projectId}/storylines`);
  redirect(`/projects/${projectId}/chapters/${chapter.id}`);
}

export async function updateChapter(
  projectId: string,
  chapterId: string,
  formData: FormData,
) {
  const chapter = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
      projectId,
    },
    select: {
      id: true,
      chapterNumber: true,
    },
  });

  if (!chapter) {
    notFound();
  }

  const { values, changeReason, finalizeError } = parseChapterForm(formData);

  if (finalizeError) {
    const targetHash =
      finalizeError === "missingPolishedText" ? "polishedText" : "draftText";

    revalidatePath(`/projects/${projectId}/chapters/${chapterId}/edit`);
    redirect(
      `/projects/${projectId}/chapters/${chapterId}/edit?finalizeError=${finalizeError}#${targetHash}`,
    );
  }

  const snapshot = chapterSnapshot(values);

  await prisma.$transaction(async (tx) => {
    await tx.chapter.update({
      where: {
        id: chapterId,
      },
      data: snapshot,
    });

    const versionCount = await tx.chapterVersion.count({
      where: {
        chapterId,
      },
    });

    await tx.chapterVersion.create({
      data: {
        projectId,
        chapterId,
        versionNumber: versionCount + 1,
        snapshotJson: JSON.stringify(snapshot),
        changeReason,
        sourceType: "manual",
      },
    });

    await createMissingStorylineChapterRelationsForChapter(tx, projectId, {
      id: chapterId,
      chapterNumber: snapshot.chapterNumber,
    });
  });

  await syncOutlineStatusesForChapterNumbers(projectId, [
    chapter.chapterNumber,
    snapshot.chapterNumber,
  ]);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/chapters`);
  revalidatePath(`/projects/${projectId}/outlines`);
  revalidatePath(`/projects/${projectId}/storylines`);
  revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
  revalidatePath(`/projects/${projectId}/chapters/${chapterId}/history`);
  redirect(`/projects/${projectId}/chapters/${chapterId}`);
}

export async function deleteChapter(projectId: string, chapterId: string) {
  const chapter = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
      projectId,
    },
    select: {
      id: true,
      chapterNumber: true,
    },
  });

  if (!chapter) {
    notFound();
  }

  await prisma.chapter.delete({
    where: {
      id: chapterId,
    },
  });

  await syncOutlineStatusesForChapterNumbers(projectId, [chapter.chapterNumber]);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/chapters`);
  revalidatePath(`/projects/${projectId}/outlines`);
  revalidatePath(`/projects/${projectId}/storylines`);
  redirect(`/projects/${projectId}/chapters`);
}

export async function updateChapterReaderRemoteId(
  projectId: string,
  chapterId: string,
  formData: FormData,
) {
  const chapter = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
      projectId,
    },
    select: {
      id: true,
    },
  });

  if (!chapter) {
    notFound();
  }

  const readerRemoteId = readerRemoteIdSchema.parse(
    formData.get("readerRemoteId"),
  );

  await prisma.chapter.update({
    where: {
      id: chapterId,
    },
    data: {
      readerRemoteId,
    },
  });

  revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
  redirect(`/projects/${projectId}/chapters/${chapterId}#reader-feedback`);
}

export async function fetchChapterReaderFeedback(
  projectId: string,
  chapterId: string,
) {
  const chapter = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
      projectId,
    },
    select: {
      id: true,
      readerRemoteId: true,
    },
  });

  if (!chapter) {
    notFound();
  }

  const remoteChapterId =
    chapter.readerRemoteId?.trim() ||
    (await latestStationCatChapterRemoteId(projectId, chapterId));

  if (!remoteChapterId) {
    revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
    redirect(
      `/projects/${projectId}/chapters/${chapterId}?readerFeedbackError=missingRemoteId#reader-feedback`,
    );
  }

  const stationCatSecrets = readStationCatPublishSecrets();

  if (!stationCatSecrets.token) {
    revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
    redirect(
      `/projects/${projectId}/chapters/${chapterId}?readerFeedbackError=missingToken#reader-feedback`,
    );
  }

  try {
    const feedback = await fetchStationCatReaderFeedback({
      apiBaseUrl: stationCatSecrets.apiBaseUrl,
      token: stationCatSecrets.token,
      remoteChapterId,
    });

    await prisma.$transaction(async (tx) => {
      const fetchedAt = new Date();

      await tx.chapterAnalytics.create({
        data: {
          projectId,
          chapterId,
          remoteChapterId,
          views: feedback.analytics.views,
          likes: feedback.analytics.likes,
          comments: feedback.analytics.comments,
          favorites: feedback.analytics.favorites,
          shares: feedback.analytics.shares,
          completionRate: feedback.analytics.completionRate,
          averageReadSeconds: feedback.analytics.averageReadSeconds,
          dropOffPoint: feedback.analytics.dropOffPoint,
          engagementScore: feedback.analytics.engagementScore,
          rawJson: feedback.analytics.rawJson,
          fetchedAt,
        },
      });

      await tx.chapterInsight.create({
        data: {
          projectId,
          chapterId,
          remoteChapterId,
          summary: feedback.insight.summary,
          pacing: feedback.insight.pacing,
          focus: feedback.insight.focus,
          hookStrategy: feedback.insight.hookStrategy,
          riskNotesJson: feedback.insight.riskNotesJson,
          characterPriorityJson: feedback.insight.characterPriorityJson,
          rawJson: feedback.insight.rawJson,
          fetchedAt,
        },
      });

      await tx.chapter.update({
        where: {
          id: chapterId,
        },
        data: {
          readerFeedbackUpdatedAt: fetchedAt,
        },
      });

      await pruneChapterReaderFeedbackSnapshots(tx, chapterId);
    });
  } catch (error) {
    const errorMessage = encodeURIComponent(
      error instanceof Error ? error.message : String(error),
    );

    revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
    redirect(
      `/projects/${projectId}/chapters/${chapterId}?readerFeedbackError=fetchFailed&readerFeedbackMessage=${errorMessage}#reader-feedback`,
    );
  }

  revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
  redirect(
    `/projects/${projectId}/chapters/${chapterId}?readerFeedbackSaved=1#reader-feedback`,
  );
}

async function pruneChapterReaderFeedbackSnapshots(
  tx: Prisma.TransactionClient,
  chapterId: string,
) {
  const staleAnalytics = await tx.chapterAnalytics.findMany({
    where: {
      chapterId,
    },
    orderBy: {
      fetchedAt: "desc",
    },
    skip: readerFeedbackSnapshotRetentionLimit,
    select: {
      id: true,
    },
  });

  if (staleAnalytics.length > 0) {
    await tx.chapterAnalytics.deleteMany({
      where: {
        id: {
          in: staleAnalytics.map((snapshot) => snapshot.id),
        },
      },
    });
  }

  const staleInsights = await tx.chapterInsight.findMany({
    where: {
      chapterId,
    },
    orderBy: {
      fetchedAt: "desc",
    },
    skip: readerFeedbackSnapshotRetentionLimit,
    select: {
      id: true,
    },
  });

  if (staleInsights.length > 0) {
    await tx.chapterInsight.deleteMany({
      where: {
        id: {
          in: staleInsights.map((snapshot) => snapshot.id),
        },
      },
    });
  }
}

async function latestStationCatChapterRemoteId(
  projectId: string,
  chapterId: string,
) {
  const syncState = await prisma.publishSyncState.findFirst({
    where: {
      projectId,
      localType: "chapter",
      localId: chapterId,
      remoteId: {
        not: null,
      },
      target: {
        platformKey: "station_cat",
        status: "active",
      },
    },
    orderBy: [
      {
        lastSyncedAt: "desc",
      },
      {
        updatedAt: "desc",
      },
    ],
    select: {
      remoteId: true,
    },
  });

  return syncState?.remoteId?.trim() || null;
}

export async function generateChapterBeats(projectId: string, chapterId: string) {
  const activeTask = await findActiveChapterAiTask(
    projectId,
    chapterId,
    "chapter_beat_generation",
  );

  if (activeTask) {
    revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
    redirect(`/projects/${projectId}/chapters/${chapterId}`);
  }

  const contextInput = await loadChapterBeatContext(projectId, chapterId);
  const template = await ensureDefaultPromptTemplate(
    projectId,
    chapterBeatTemplateKey,
  );
  const context = buildChapterBeatContext(contextInput);

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
      developerPrompt: [template.userPrompt, template.contextNotes]
        .filter(Boolean)
        .join("\n\n"),
      input: context.inputText,
    },
  );

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/ai`);
  revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
  redirect(`/projects/${projectId}/chapters/${chapterId}`);
}

export async function generateChapterDraft(
  projectId: string,
  chapterId: string,
  formData?: FormData,
) {
  const platformTemplate = normalizeChapterPlatformTemplate(
    formData?.get("platformTemplate"),
  );
  const activeTask = await findActiveChapterAiTask(
    projectId,
    chapterId,
    "chapter_draft_generation",
  );

  if (activeTask) {
    revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
    redirect(`/projects/${projectId}/chapters/${chapterId}`);
  }

  const contextInput = await loadChapterDraftContext(projectId, chapterId);

  if (!hasConfirmedChapterBeats(contextInput.chapter)) {
    revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
    redirect(`/projects/${projectId}/chapters/${chapterId}`);
  }

  const template = await ensureDefaultPromptTemplate(
    projectId,
    chapterDraftTemplateKey,
  );
  const context = buildChapterDraftContext(contextInput, {
    platformTemplate,
  });

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
      developerPrompt: [template.userPrompt, template.contextNotes]
        .filter(Boolean)
        .join("\n\n"),
      input: context.inputText,
    },
  );

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/ai`);
  revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
  redirect(`/projects/${projectId}/chapters/${chapterId}`);
}

export async function generateChapterPolish(
  projectId: string,
  chapterId: string,
  formData?: FormData,
) {
  const platformTemplate = normalizeChapterPlatformTemplate(
    formData?.get("platformTemplate"),
  );
  const activeTask = await findActiveChapterAiTask(
    projectId,
    chapterId,
    "chapter_polish_generation",
  );

  if (activeTask) {
    revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
    redirect(`/projects/${projectId}/chapters/${chapterId}`);
  }

  const contextInput = await loadChapterPolishContext(projectId, chapterId);

  if (!hasPolishableChapterText(contextInput.chapter)) {
    revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
    redirect(`/projects/${projectId}/chapters/${chapterId}`);
  }

  const template = await ensureDefaultPromptTemplate(
    projectId,
    chapterPolishTemplateKey,
  );

  if (shouldSegmentChapterPolish(contextInput)) {
    const context = buildSegmentedChapterPolishContext(contextInput, {
      platformTemplate,
    });
    const task = await createAiTask({
      projectId,
      chapterId,
      promptTemplateId: template.id,
      taskType: template.taskType,
      model: undefined,
      inputContextSummary: context.inputContextSummary,
      inputJson: context.inputJson,
    });
    const runningTask = await markAiTaskRunning(task.id);

    void completeRunningSegmentedChapterPolishTask(runningTask.id).catch(
      (error) => {
        console.error("Background segmented chapter polish failed:", error);
      },
    );

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/ai`);
    revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
    redirect(`/projects/${projectId}/chapters/${chapterId}`);
  }

  const context = buildChapterPolishContext(contextInput, {
    platformTemplate,
  });

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
      developerPrompt: [template.userPrompt, template.contextNotes]
        .filter(Boolean)
        .join("\n\n"),
      input: context.inputText,
    },
  );

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/ai`);
  revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
  redirect(`/projects/${projectId}/chapters/${chapterId}`);
}

export async function generateChapterSummary(projectId: string, chapterId: string) {
  const activeTask = await findActiveChapterAiTask(
    projectId,
    chapterId,
    "chapter_summary_extraction",
  );

  if (activeTask) {
    revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
    redirect(`/projects/${projectId}/chapters/${chapterId}`);
  }

  const contextInput = await loadChapterSummaryContext(projectId, chapterId);

  if (!hasConfirmedChapterText(contextInput.chapter)) {
    revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
    redirect(`/projects/${projectId}/chapters/${chapterId}`);
  }

  const template = await ensureDefaultPromptTemplate(
    projectId,
    chapterSummaryTemplateKey,
  );
  const context = buildChapterSummaryContext(contextInput);

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
  );

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/ai`);
  revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
  redirect(`/projects/${projectId}/chapters/${chapterId}`);
}

export async function adoptChapterBeats(
  projectId: string,
  chapterId: string,
  taskId: string,
) {
  const [chapter, task] = await Promise.all([
    prisma.chapter.findFirst({
      where: {
        id: chapterId,
        projectId,
      },
    }),
    prisma.aiTask.findFirst({
      where: {
        id: taskId,
        projectId,
        chapterId,
        taskType: "chapter_beat_generation",
        status: "completed",
      },
      select: {
        id: true,
        outputText: true,
      },
    }),
  ]);

  const beats = task?.outputText?.trim();

  if (!chapter || !task || !beats) {
    notFound();
  }

  const snapshot = chapterSnapshot({
    ...chapterValuesFromRecord(chapter),
    beats,
  });

  await prisma.$transaction(async (tx) => {
    await tx.chapter.update({
      where: {
        id: chapterId,
      },
      data: snapshot,
    });

    const versionCount = await tx.chapterVersion.count({
      where: {
        chapterId,
      },
    });

    await tx.chapterVersion.create({
      data: {
        projectId,
        chapterId,
        versionNumber: versionCount + 1,
        snapshotJson: JSON.stringify(snapshot),
        changeReason: `采用 AI 章节节拍任务 ${task.id}`,
        sourceType: "ai_chapter_beats",
      },
    });

    await tx.aiTask.update({
      where: {
        id: task.id,
      },
      data: {
        adoptionState: "adopted",
      },
    });
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/ai`);
  revalidatePath(`/projects/${projectId}/chapters`);
  revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
  revalidatePath(`/projects/${projectId}/chapters/${chapterId}/history`);
  redirect(`/projects/${projectId}/chapters/${chapterId}`);
}

export async function adoptChapterDraft(
  projectId: string,
  chapterId: string,
  taskId: string,
) {
  const [chapter, task] = await Promise.all([
    prisma.chapter.findFirst({
      where: {
        id: chapterId,
        projectId,
      },
    }),
    prisma.aiTask.findFirst({
      where: {
        id: taskId,
        projectId,
        chapterId,
        taskType: "chapter_draft_generation",
        status: "completed",
      },
      select: {
        id: true,
        outputText: true,
      },
    }),
  ]);

  const draftText = task?.outputText?.trim();

  if (!chapter || !task || !draftText) {
    notFound();
  }

  const snapshot = chapterSnapshot({
    ...chapterValuesFromRecord(chapter),
    draftText,
  });

  await prisma.$transaction(async (tx) => {
    await tx.chapter.update({
      where: {
        id: chapterId,
      },
      data: snapshot,
    });

    const versionCount = await tx.chapterVersion.count({
      where: {
        chapterId,
      },
    });

    await tx.chapterVersion.create({
      data: {
        projectId,
        chapterId,
        versionNumber: versionCount + 1,
        snapshotJson: JSON.stringify(snapshot),
        changeReason: `采用 AI 章节草稿任务 ${task.id}`,
        sourceType: "ai_chapter_draft",
      },
    });

    await tx.aiTask.update({
      where: {
        id: task.id,
      },
      data: {
        adoptionState: "adopted",
      },
    });
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/ai`);
  revalidatePath(`/projects/${projectId}/chapters`);
  revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
  revalidatePath(`/projects/${projectId}/chapters/${chapterId}/history`);
  redirect(`/projects/${projectId}/chapters/${chapterId}`);
}

export async function adoptChapterPolish(
  projectId: string,
  chapterId: string,
  taskId: string,
) {
  const [chapter, task] = await Promise.all([
    prisma.chapter.findFirst({
      where: {
        id: chapterId,
        projectId,
      },
    }),
    prisma.aiTask.findFirst({
      where: {
        id: taskId,
        projectId,
        chapterId,
        taskType: "chapter_polish_generation",
        status: "completed",
      },
      select: {
        id: true,
        inputJson: true,
        outputText: true,
        adoptionState: true,
      },
    }),
  ]);

  const polishedText = task?.outputText?.trim();

  if (!chapter || !task || !polishedText) {
    notFound();
  }

  if (task.adoptionState !== "not_reviewed") {
    revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
    redirect(`/projects/${projectId}/chapters/${chapterId}`);
  }

  if (isExcerptedChapterPolishInputJson(task.inputJson)) {
    revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
    redirect(
      `/projects/${projectId}/chapters/${chapterId}?polishError=excerptedTaskCannotAdopt`,
    );
  }

  const snapshot = chapterSnapshot({
    ...chapterValuesFromRecord(chapter),
    polishedText,
    status: chapter.status === "published" ? "published" : "revising",
  });

  await prisma.$transaction(async (tx) => {
    const adoptedTask = await tx.aiTask.updateMany({
      where: {
        id: task.id,
        adoptionState: "not_reviewed",
      },
      data: {
        adoptionState: "adopted",
      },
    });

    if (adoptedTask.count !== 1) {
      return;
    }

    await tx.chapter.update({
      where: {
        id: chapterId,
      },
      data: snapshot,
    });

    const versionCount = await tx.chapterVersion.count({
      where: {
        chapterId,
      },
    });

    await tx.chapterVersion.create({
      data: {
        projectId,
        chapterId,
        versionNumber: versionCount + 1,
        snapshotJson: JSON.stringify(snapshot),
        changeReason: `采用 AI 正文精修任务 ${task.id}`,
        sourceType: "ai_chapter_polish",
      },
    });
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/ai`);
  revalidatePath(`/projects/${projectId}/chapters`);
  revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
  revalidatePath(`/projects/${projectId}/chapters/${chapterId}/history`);
  redirect(`/projects/${projectId}/chapters/${chapterId}`);
}

async function findActiveChapterAiTask(
  projectId: string,
  chapterId: string,
  taskType: string,
) {
  return prisma.aiTask.findFirst({
    where: {
      projectId,
      chapterId,
      taskType,
      status: {
        in: [...activeAiTaskStatuses],
      },
    },
    select: {
      id: true,
    },
  });
}

async function syncOutlineStatusesForChapterNumbers(
  projectId: string,
  chapterNumbers: Iterable<number>,
) {
  const numbersToSync = [...new Set(chapterNumbers)];

  if (numbersToSync.length === 0) {
    return;
  }

  const [outlines, chapters] = await Promise.all([
    prisma.outline.findMany({
      where: {
        projectId,
        status: {
          not: "archived",
        },
      },
    }),
    prisma.chapter.findMany({
      where: {
        projectId,
      },
      select: {
        chapterNumber: true,
        status: true,
      },
    }),
  ]);
  const matchingOutlines = outlines.filter((outline) =>
    numbersToSync.some((chapterNumber) =>
      chapterBelongsToOutline(chapterNumber, outline),
    ),
  );

  await Promise.all(
    matchingOutlines.map((outline) => {
      const progress = calculateOutlineProgress(outline, chapters);

      if (outline.status === progress.statusSuggestion) {
        return null;
      }

      return prisma.outline.update({
        where: {
          id: outline.id,
        },
        data: {
          status: progress.statusSuggestion,
        },
      });
    }),
  );
}

async function loadChapterBeatContext(projectId: string, chapterId: string) {
  const chapter = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
      projectId,
    },
    include: {
      project: {
        select: {
          title: true,
          genre: true,
          targetAudience: true,
          platform: true,
          totalWordTarget: true,
          chapterWordMin: true,
          chapterWordMax: true,
          description: true,
          wechatPositioning: true,
        },
      },
    },
  });

  if (!chapter) {
    notFound();
  }

  const [
    setting,
    outlines,
    characters,
    recentChapters,
    previousChapter,
    readerFeedbackSignals,
  ] = await Promise.all([
    prisma.projectSetting.findUnique({
      where: {
        projectId,
      },
    }),
    prisma.outline.findMany({
      where: {
        projectId,
        status: {
          not: "archived",
        },
      },
      orderBy: [
        {
          level: "asc",
        },
        {
          sortOrder: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
    }),
    prisma.character.findMany({
      where: {
        projectId,
        status: "active",
      },
      orderBy: {
        name: "asc",
      },
      take: 8,
    }),
    prisma.chapter.findMany({
      where: {
        projectId,
        chapterNumber: {
          lt: chapter.chapterNumber,
        },
      },
      orderBy: {
        chapterNumber: "desc",
      },
      take: 3,
    }),
    prisma.chapter.findFirst({
      where: {
        projectId,
        chapterNumber: {
          lt: chapter.chapterNumber,
        },
      },
      orderBy: {
        chapterNumber: "desc",
      },
    }),
    loadReaderFeedbackSignalsForChapterGeneration({
      projectId,
      beforeChapterNumber: chapter.chapterNumber,
    }),
  ]);

  return {
    project: chapter.project,
    setting,
    chapter: pickChapterContext(chapter),
    outlines: selectRelevantOutlinesForChapter(outlines, chapter.chapterNumber),
    characters,
    recentChapters: recentChapters.map(pickChapterContext).reverse(),
    previousChapter: previousChapter ? pickChapterContext(previousChapter) : null,
    readerFeedback: readerFeedbackSignals,
  };
}

async function loadChapterDraftContext(projectId: string, chapterId: string) {
  const chapter = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
      projectId,
    },
    include: {
      project: {
        select: {
          title: true,
          genre: true,
          targetAudience: true,
          platform: true,
          totalWordTarget: true,
          chapterWordMin: true,
          chapterWordMax: true,
          description: true,
          wechatPositioning: true,
        },
      },
    },
  });

  if (!chapter) {
    notFound();
  }

  const [
    setting,
    outlines,
    characters,
    previousChapter,
    readerFeedbackSignals,
  ] = await Promise.all([
    prisma.projectSetting.findUnique({
      where: {
        projectId,
      },
    }),
    prisma.outline.findMany({
      where: {
        projectId,
        status: {
          not: "archived",
        },
      },
      orderBy: [
        {
          level: "asc",
        },
        {
          sortOrder: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
    }),
    prisma.character.findMany({
      where: {
        projectId,
        status: "active",
      },
      orderBy: {
        name: "asc",
      },
      take: 8,
    }),
    prisma.chapter.findFirst({
      where: {
        projectId,
        chapterNumber: {
          lt: chapter.chapterNumber,
        },
      },
      orderBy: {
        chapterNumber: "desc",
      },
    }),
    loadReaderFeedbackSignalsForChapterGeneration({
      projectId,
      beforeChapterNumber: chapter.chapterNumber,
    }),
  ]);

  return {
    project: chapter.project,
    setting,
    chapter: pickChapterDraftContext(chapter),
    outlines: selectRelevantOutlinesForChapter(outlines, chapter.chapterNumber),
    characters,
    previousChapter: previousChapter
      ? pickChapterDraftContext(previousChapter)
      : null,
    readerFeedback: readerFeedbackSignals,
  };
}

async function loadChapterPolishContext(projectId: string, chapterId: string) {
  const chapter = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
      projectId,
    },
    include: {
      project: {
        select: {
          title: true,
          genre: true,
          targetAudience: true,
          platform: true,
          chapterWordMin: true,
          chapterWordMax: true,
          description: true,
          wechatPositioning: true,
        },
      },
    },
  });

  if (!chapter) {
    notFound();
  }

  const [setting, characters] = await Promise.all([
    prisma.projectSetting.findUnique({
      where: {
        projectId,
      },
    }),
    prisma.character.findMany({
      where: {
        projectId,
        status: "active",
      },
      orderBy: {
        name: "asc",
      },
      take: 12,
    }),
  ]);

  return {
    project: chapter.project,
    setting,
    chapter: pickChapterPolishContext(chapter),
    characters,
  };
}

async function loadChapterSummaryContext(projectId: string, chapterId: string) {
  const chapter = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
      projectId,
    },
    include: {
      project: {
        select: {
          title: true,
          genre: true,
          targetAudience: true,
          platform: true,
          description: true,
          wechatPositioning: true,
        },
      },
    },
  });

  if (!chapter) {
    notFound();
  }

  const [setting, characters] = await Promise.all([
    prisma.projectSetting.findUnique({
      where: {
        projectId,
      },
    }),
    prisma.character.findMany({
      where: {
        projectId,
        status: "active",
      },
      orderBy: {
        name: "asc",
      },
      take: 12,
    }),
  ]);

  return {
    project: chapter.project,
    setting,
    chapter: pickChapterSummaryContext(chapter),
    characters,
  };
}

function pickChapterSummaryContext(chapter: ChapterSummaryChapterContext) {
  return {
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    goal: chapter.goal,
    beats: chapter.beats,
    draftText: chapter.draftText,
    polishedText: chapter.polishedText,
    finalText: chapter.finalText,
    notes: chapter.notes,
  };
}

function pickChapterPolishContext(chapter: ChapterPolishChapterContext) {
  return {
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    goal: chapter.goal,
    beats: chapter.beats,
    draftText: chapter.draftText,
    polishedText: chapter.polishedText,
    finalText: chapter.finalText,
    notes: chapter.notes,
  };
}

function pickChapterDraftContext(chapter: ChapterDraftChapterContext) {
  return {
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    goal: chapter.goal,
    beats: chapter.beats,
    draftText: chapter.draftText,
    polishedText: chapter.polishedText,
    finalText: chapter.finalText,
    notes: chapter.notes,
  };
}

function pickChapterContext(chapter: ChapterBeatChapterContext) {
  return {
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    goal: chapter.goal,
    beats: chapter.beats,
    draftText: chapter.draftText,
    polishedText: chapter.polishedText,
    finalText: chapter.finalText,
    notes: chapter.notes,
  };
}

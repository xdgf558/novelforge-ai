"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import {
  buildPendingUpdateContext,
  normalizePendingUpdateSuggestionTargetIds,
  parsePendingUpdateSuggestions,
  type PendingUpdateChapterContext,
} from "@/lib/ai/pending-updates";
import { ensureDefaultPromptTemplate } from "@/lib/ai/prompt-template-store";
import { activeAiTaskStatuses } from "@/lib/ai/status";
import { startLoggedOpenAITextTask } from "@/lib/ai/task-logger";
import {
  selectRelevantCharacters,
  selectRelevantForeshadows,
  selectRelevantTimelineEvents,
  selectRelevantWorldRules,
} from "@/lib/ai/context-priority";
import {
  chapterFinalTextHash,
  chapterSourceMatches,
} from "@/lib/chapters/source-text";
import { findCurrentChapterSummary } from "@/lib/chapters/summaries";
import {
  applyApprovedPendingUpdate,
  PendingUpdateTargetNotFoundError,
} from "@/lib/pending-updates/approval";
import { approveAutomaticForeshadowRecoveries } from "@/lib/foreshadows/recovery-records";
import { prisma } from "@/lib/prisma";
import { assertProjectExists as assertProject } from "@/lib/server-actions/project-guards";

const pendingUpdateTemplateKey = "pending_update_extraction";

const reviewSchema = z.object({
  proposedContent: z.string().trim().min(1).max(12000),
  resolutionNote: z
    .preprocess(
      (value) =>
        value == null || (typeof value === "string" && value.trim() === "")
          ? undefined
          : value,
      z.string().trim().max(1000).optional(),
    ),
});

const rejectionSchema = z.object({
  resolutionNote: z
    .preprocess(
      (value) =>
        value == null || (typeof value === "string" && value.trim() === "")
          ? undefined
          : value,
      z.string().trim().max(1000).optional(),
    ),
});

export async function generatePendingUpdates(projectId: string, chapterId: string) {
  const activeTask = await findActivePendingUpdateTask(projectId, chapterId);

  if (activeTask) {
    revalidateChapterAndPendingUpdatePaths(projectId, chapterId);
    redirect(`/projects/${projectId}/chapters/${chapterId}`);
  }

  const contextInput = await loadPendingUpdateContext(projectId, chapterId);
  const sourceText = contextInput.chapter.finalText?.trim();

  if (!sourceText) {
    revalidateChapterAndPendingUpdatePaths(projectId, chapterId);
    redirect(`/projects/${projectId}/chapters/${chapterId}`);
  }

  const sourceTextHash = chapterFinalTextHash(sourceText);

  if (!sourceTextHash) {
    revalidateChapterAndPendingUpdatePaths(projectId, chapterId);
    redirect(`/projects/${projectId}/chapters/${chapterId}`);
  }

  const template = await ensureDefaultPromptTemplate(
    projectId,
    pendingUpdateTemplateKey,
  );
  const context = buildPendingUpdateContext(contextInput);

  await startLoggedOpenAITextTask(
    {
      projectId,
      chapterId,
      promptTemplateId: template.id,
      taskType: template.taskType,
      model: undefined,
      inputContextSummary: context.inputContextSummary,
      inputJson: {
        ...context.inputJson,
        finalTextHash: sourceTextHash,
      },
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
        const suggestions = normalizePendingUpdateSuggestionTargetIds(
          parsePendingUpdateSuggestions(task.outputText),
          contextInput,
        );

        if (suggestions.length === 0) {
          return;
        }

        await prisma.$transaction(
          suggestions.map((suggestion) =>
            prisma.pendingUpdate.create({
              data: {
                projectId,
                chapterId,
                aiTaskId: task.id,
                updateType: suggestion.updateType,
                targetType: suggestion.targetType,
                targetId: suggestion.targetId,
                targetName: suggestion.targetName,
                fieldName: suggestion.fieldName,
                title: suggestion.title,
                proposedContent: suggestion.proposedContent,
                reason: suggestion.reason,
                riskLevel: suggestion.riskLevel,
                evidence: suggestion.evidence,
                payloadJson: JSON.stringify(suggestion.payload, null, 2),
                sourceTextHash,
              },
            }),
          ),
        );
      },
    },
  );

  revalidateChapterAndPendingUpdatePaths(projectId, chapterId);
  redirect(`/projects/${projectId}/chapters/${chapterId}`);
}

export async function approvePendingUpdate(
  projectId: string,
  updateId: string,
  formData: FormData,
) {
  const parsed = reviewSchema.parse({
    proposedContent: formData.get("proposedContent"),
    resolutionNote: formData.get("resolutionNote"),
  });

  const pendingUpdate = await prisma.pendingUpdate.findFirst({
    where: {
      id: updateId,
      projectId,
      status: "pending",
    },
    include: {
      chapter: {
        select: {
          finalText: true,
        },
      },
    },
  });

  if (!pendingUpdate) {
    notFound();
  }

  if (
    pendingUpdate.sourceTextHash &&
    !chapterSourceMatches(
      pendingUpdate.sourceTextHash,
      pendingUpdate.chapter?.finalText,
    )
  ) {
    revalidatePendingUpdatePaths(projectId, pendingUpdate.chapterId);
    redirect(`/projects/${projectId}/pending-updates?review=stale-source`);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const appliedTarget = await applyApprovedPendingUpdate(
        tx,
        pendingUpdate,
        parsed.proposedContent,
      );

      await tx.pendingUpdate.update({
        where: {
          id: pendingUpdate.id,
        },
        data: {
          status: "approved",
          proposedContent: parsed.proposedContent,
          resolutionNote: parsed.resolutionNote,
          targetId: appliedTarget.targetId,
          targetType: appliedTarget.targetType,
          appliedAt: new Date(),
        },
      });
    });
  } catch (error) {
    if (error instanceof PendingUpdateTargetNotFoundError) {
      revalidatePendingUpdatePaths(projectId, pendingUpdate.chapterId);
      redirect(
        `/projects/${projectId}/pending-updates?review=target-not-found`,
      );
    }

    throw error;
  }

  revalidatePendingUpdatePaths(projectId, pendingUpdate.chapterId);
  redirect(`/projects/${projectId}/pending-updates?review=approved`);
}

export async function rejectPendingUpdate(
  projectId: string,
  updateId: string,
  formData: FormData,
) {
  const parsed = rejectionSchema.parse({
    resolutionNote: formData.get("resolutionNote"),
  });

  const pendingUpdate = await prisma.pendingUpdate.findFirst({
    where: {
      id: updateId,
      projectId,
      status: "pending",
    },
  });

  if (!pendingUpdate) {
    notFound();
  }

  await prisma.pendingUpdate.update({
    where: {
      id: pendingUpdate.id,
    },
    data: {
      status: "rejected",
      resolutionNote: parsed.resolutionNote,
      appliedAt: new Date(),
    },
  });

  revalidatePendingUpdatePaths(projectId, pendingUpdate.chapterId);
  redirect(`/projects/${projectId}/pending-updates?review=rejected`);
}

export async function approveAutomaticForeshadowRecoveryBatch(
  projectId: string,
) {
  await assertProject(projectId);

  const result = await approveAutomaticForeshadowRecoveries(projectId);

  revalidatePendingUpdatePaths(projectId);
  revalidatePath(`/projects/${projectId}/memory`);
  redirect(
    `/projects/${projectId}/pending-updates?review=auto-recovery-approved&approved=${result.approvedCount}&skipped=${result.skippedCount}`,
  );
}

async function loadPendingUpdateContext(projectId: string, chapterId: string) {
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

  const [
    setting,
    characters,
    latestSummary,
    worldRules,
    foreshadows,
    timelineEvents,
  ] = await Promise.all([
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
    }),
    findCurrentChapterSummary({
      projectId,
      chapterId,
      finalText: chapter.finalText,
    }),
    prisma.worldRule.findMany({
      where: {
        projectId,
        status: "active",
      },
    }),
    prisma.foreshadow.findMany({
      where: {
        projectId,
        status: {
          not: "abandoned",
        },
      },
    }),
    prisma.timelineEvent.findMany({
      where: {
        projectId,
        status: "active",
      },
    }),
  ]);

  const relevanceText = [
    chapter.title,
    chapter.goal,
    chapter.beats,
    chapter.finalText,
    chapter.notes,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    project: chapter.project,
    setting,
    chapter: pickPendingUpdateChapterContext(chapter),
    characters: selectRelevantCharacters(characters, relevanceText, 8),
    latestSummaryTask: latestSummary
      ? {
          id: latestSummary.id,
          inputContextSummary: latestSummary.inputContextSummary,
          outputText: latestSummary.outputText,
          completedAt: latestSummary.createdAt,
        }
      : null,
    worldRules: selectRelevantWorldRules(worldRules, relevanceText, 10),
    foreshadows: selectRelevantForeshadows(
      foreshadows,
      relevanceText,
      chapter.chapterNumber,
      14,
    ),
    timelineEvents: selectRelevantTimelineEvents(
      timelineEvents,
      relevanceText,
      14,
    ),
  };
}

function pickPendingUpdateChapterContext(chapter: PendingUpdateChapterContext) {
  return {
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    goal: chapter.goal,
    beats: chapter.beats,
    finalText: chapter.finalText,
    notes: chapter.notes,
  };
}

async function findActivePendingUpdateTask(projectId: string, chapterId: string) {
  return prisma.aiTask.findFirst({
    where: {
      projectId,
      chapterId,
      taskType: "pending_update_extraction",
      status: {
        in: [...activeAiTaskStatuses],
      },
    },
    select: {
      id: true,
    },
  });
}

function revalidateChapterAndPendingUpdatePaths(
  projectId: string,
  chapterId: string,
) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/ai`);
  revalidatePath(`/projects/${projectId}/pending-updates`);
  revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
}

function revalidatePendingUpdatePaths(
  projectId: string,
  chapterId?: string | null,
) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/settings`);
  revalidatePath(`/projects/${projectId}/settings/history`);
  revalidatePath(`/projects/${projectId}/characters`);
  revalidatePath(`/projects/${projectId}/ai`);
  revalidatePath(`/projects/${projectId}/pending-updates`);

  if (chapterId) {
    revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
  }
}

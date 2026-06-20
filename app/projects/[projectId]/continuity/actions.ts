"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import {
  buildContinuityContext,
  parseContinuityIssues,
  type ContinuityChapterContext,
} from "@/lib/ai/continuity-reports";
import { hasConfirmedChapterText } from "@/lib/ai/chapter-summaries";
import { ensureDefaultPromptTemplate } from "@/lib/ai/prompt-template-store";
import { activeAiTaskStatuses } from "@/lib/ai/status";
import { startLoggedOpenAITextTask } from "@/lib/ai/task-logger";
import { chapterSnapshot, chapterValuesFromRecord } from "@/lib/chapter-fields";
import {
  applyContinuityReplacement,
  parseContinuityReplacementFix,
} from "@/lib/continuity-fixes";
import { prisma } from "@/lib/prisma";

const continuityTemplateKey = "continuity_check";

const resolutionSchema = z.object({
  resolutionNote: z
    .preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? undefined : value,
      z.string().trim().max(1000).optional(),
    ),
});

export async function generateContinuityReport(
  projectId: string,
  chapterId: string,
) {
  const activeTask = await findActiveContinuityTask(projectId, chapterId);

  if (activeTask) {
    revalidateContinuityPaths(projectId, chapterId);
    redirect(`/projects/${projectId}/chapters/${chapterId}`);
  }

  const contextInput = await loadContinuityContext(projectId, chapterId);

  if (!hasConfirmedChapterText(contextInput.chapter)) {
    revalidateContinuityPaths(projectId, chapterId);
    redirect(`/projects/${projectId}/chapters/${chapterId}`);
  }

  const template = await ensureDefaultPromptTemplate(
    projectId,
    continuityTemplateKey,
  );
  const context = buildContinuityContext(contextInput);

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
        const issues = parseContinuityIssues(task.outputText);

        if (issues.length === 0) {
          return;
        }

        await prisma.continuityReport.createMany({
          data: issues.map((issue) => ({
            projectId,
            chapterId,
            aiTaskId: task.id,
            severity: issue.severity,
            category: issue.category,
            title: issue.title,
            description: issue.description,
            evidence: issue.evidence,
            conflictingMemory: issue.conflictingMemory,
            suggestedFix: issue.suggestedFix,
            status: "open",
          })),
        });
      },
    },
  );

  revalidateContinuityPaths(projectId, chapterId);
  redirect(`/projects/${projectId}/chapters/${chapterId}`);
}

export async function resolveContinuityReport(
  projectId: string,
  reportId: string,
  formData: FormData,
) {
  const { resolutionNote } = resolutionSchema.parse({
    resolutionNote: formData.get("resolutionNote"),
  });

  const report = await prisma.continuityReport.findFirst({
    where: {
      id: reportId,
      projectId,
    },
    select: {
      id: true,
      chapterId: true,
    },
  });

  if (!report) {
    notFound();
  }

  await prisma.continuityReport.update({
    where: {
      id: report.id,
    },
    data: {
      status: "resolved",
      resolutionNote,
      resolvedAt: new Date(),
    },
  });

  revalidateContinuityPaths(projectId, report.chapterId);
  redirect(`/projects/${projectId}/continuity`);
}

export async function reopenContinuityReport(projectId: string, reportId: string) {
  const report = await prisma.continuityReport.findFirst({
    where: {
      id: reportId,
      projectId,
    },
    select: {
      id: true,
      chapterId: true,
    },
  });

  if (!report) {
    notFound();
  }

  await prisma.continuityReport.update({
    where: {
      id: report.id,
    },
    data: {
      status: "open",
      resolutionNote: null,
      resolvedAt: null,
    },
  });

  revalidateContinuityPaths(projectId, report.chapterId);
  redirect(`/projects/${projectId}/continuity`);
}

export async function applyContinuityReportFix(
  projectId: string,
  reportId: string,
) {
  const report = await prisma.continuityReport.findFirst({
    where: {
      id: reportId,
      projectId,
    },
    include: {
      chapter: true,
    },
  });

  if (!report) {
    notFound();
  }

  if (report.status !== "open") {
    redirect(`/projects/${projectId}/continuity?fix=already-resolved`);
  }

  if (!report.chapter) {
    redirect(`/projects/${projectId}/continuity?fix=missing-chapter`);
  }

  const replacementFix = parseContinuityReplacementFix(report.suggestedFix);

  if (!replacementFix) {
    redirect(`/projects/${projectId}/continuity?fix=unsupported`);
  }

  const replacementResult = applyContinuityReplacement(
    report.chapter.finalText ?? "",
    replacementFix,
  );

  if (replacementResult.count === 0) {
    redirect(`/projects/${projectId}/continuity?fix=not-found`);
  }

  const chapterId = report.chapter.id;
  const snapshot = chapterSnapshot({
    ...chapterValuesFromRecord(report.chapter),
    finalText: replacementResult.text,
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
        changeReason: `一键修复连续性报告：${report.title}`,
        sourceType: "continuity_fix",
      },
    });

    await tx.continuityReport.update({
      where: {
        id: report.id,
      },
      data: {
        status: "resolved",
        resolutionNote: `一键修复定稿正文：将“${replacementFix.from}”替换为“${replacementFix.to}”（${replacementResult.count} 处）。`,
        resolvedAt: new Date(),
      },
    });
  });

  revalidateContinuityPaths(projectId, chapterId);
  revalidatePath(`/projects/${projectId}/chapters/${chapterId}/history`);
  redirect(`/projects/${projectId}/continuity?fix=applied`);
}

async function loadContinuityContext(projectId: string, chapterId: string) {
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

  const [
    characters,
    worldRules,
    foreshadows,
    timelineEvents,
    recentSummaryTasks,
    pendingUpdates,
  ] = await Promise.all([
    prisma.character.findMany({
      where: {
        projectId,
        status: "active",
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 12,
    }),
    prisma.worldRule.findMany({
      where: {
        projectId,
        status: "active",
      },
      orderBy: [{ riskLevel: "desc" }, { updatedAt: "desc" }],
      take: 20,
    }),
    prisma.foreshadow.findMany({
      where: {
        projectId,
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 24,
    }),
    prisma.timelineEvent.findMany({
      where: {
        projectId,
        status: "active",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 30,
    }),
    prisma.aiTask.findMany({
      where: {
        projectId,
        taskType: "chapter_summary_extraction",
        status: "completed",
      },
      orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
      take: 3,
      select: {
        id: true,
        inputContextSummary: true,
        outputText: true,
        completedAt: true,
      },
    }),
    prisma.pendingUpdate.findMany({
      where: {
        projectId,
        status: "pending",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 12,
      select: {
        title: true,
        status: true,
        targetType: true,
        riskLevel: true,
        proposedContent: true,
      },
    }),
  ]);

  const setting = chapter.project.setting;
  const contextChapter: ContinuityChapterContext = {
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    goal: chapter.goal,
    beats: chapter.beats,
    finalText: chapter.finalText,
    notes: chapter.notes,
  };

  return {
    project: {
      title: chapter.project.title,
      genre: chapter.project.genre,
      targetAudience: chapter.project.targetAudience,
      platform: chapter.project.platform,
      description: chapter.project.description,
      wechatPositioning: chapter.project.wechatPositioning,
    },
    setting,
    chapter: contextChapter,
    characters,
    worldRules,
    foreshadows,
    timelineEvents,
    recentSummaryTasks,
    pendingUpdates,
  };
}

async function findActiveContinuityTask(projectId: string, chapterId: string) {
  return prisma.aiTask.findFirst({
    where: {
      projectId,
      chapterId,
      taskType: "continuity_check",
      status: {
        in: [...activeAiTaskStatuses],
      },
    },
    select: {
      id: true,
    },
  });
}

function revalidateContinuityPaths(projectId: string, chapterId?: string | null) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/ai`);
  revalidatePath(`/projects/${projectId}/continuity`);

  if (chapterId) {
    revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
  }
}

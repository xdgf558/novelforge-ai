import {
  parseContinuityIssues,
  type ContinuityChapterContext,
} from "@/lib/ai/continuity-reports";
import {
  continuityFixPatchTaskType,
  readContinuityFixPatchReportId,
} from "@/lib/ai/continuity-fix-patches";
import { activeAiTaskStatuses } from "@/lib/ai/status";
import { shortStoryWholeReviewTaskType } from "@/lib/ai/short-story-whole-review";
import {
  selectRelevantCharacters,
  selectRelevantForeshadows,
  selectRelevantTimelineEvents,
  selectRelevantWorldRules,
} from "@/lib/ai/context-priority";
import { chapterSnapshot, chapterValuesFromRecord } from "@/lib/chapter-fields";
import { chapterSourceMatches } from "@/lib/chapters/source-text";
import { findRecentCurrentChapterSummaries } from "@/lib/chapters/summaries";
import {
  applyContinuityReplacement,
  describeContinuityReplacementFix,
  parseContinuityReplacementFix,
} from "@/lib/continuity-fixes";
import { prisma } from "@/lib/prisma";

export const continuityCheckTaskType = "continuity_check";

export async function createContinuityReportsFromTask({
  chapterId,
  outputText,
  projectId,
  sourceTextHash,
  taskId,
}: {
  chapterId: string;
  outputText?: string | null;
  projectId: string;
  sourceTextHash?: string | null;
  taskId: string;
}) {
  const issues = parseContinuityIssues(outputText);

  if (issues.length === 0) {
    return {
      count: 0,
    };
  }

  return prisma.continuityReport.createMany({
    data: issues.map((issue) => ({
      projectId,
      chapterId,
      aiTaskId: taskId,
      severity: issue.severity,
      category: issue.category,
      title: issue.title,
      description: issue.description,
      evidence: issue.evidence,
      conflictingMemory: issue.conflictingMemory,
      suggestedFix: issue.suggestedFix,
      sourceTextHash,
      status: "open",
    })),
  });
}

export async function loadContinuityContext(projectId: string, chapterId: string) {
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
    return null;
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
      },
    }),
    prisma.timelineEvent.findMany({
      where: {
        projectId,
        status: "active",
      },
    }),
    findRecentCurrentChapterSummaries({ projectId, limit: 3 }),
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
  const relevanceText = [
    chapter.title,
    chapter.goal,
    chapter.beats,
    chapter.finalText,
    chapter.notes,
  ]
    .filter(Boolean)
    .join("\n");
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
    characters: selectRelevantCharacters(characters, relevanceText, 10),
    worldRules: selectRelevantWorldRules(worldRules, relevanceText, 12),
    foreshadows: selectRelevantForeshadows(
      foreshadows,
      relevanceText,
      chapter.chapterNumber,
      16,
    ),
    timelineEvents: selectRelevantTimelineEvents(
      timelineEvents,
      relevanceText,
      18,
    ),
    recentSummaryTasks: recentSummaryTasks.map((summary) => ({
      id: summary.id,
      inputContextSummary: summary.inputContextSummary,
      outputText: summary.outputText,
      completedAt: summary.createdAt,
    })),
    pendingUpdates,
  };
}

export async function findContinuityReportSummary({
  projectId,
  reportId,
}: {
  projectId: string;
  reportId: string;
}) {
  return prisma.continuityReport.findFirst({
    where: {
      id: reportId,
      projectId,
    },
    select: {
      id: true,
      chapterId: true,
    },
  });
}

export async function resolveContinuityReportRecord({
  reportId,
  resolutionNote,
}: {
  reportId: string;
  resolutionNote?: string;
}) {
  return prisma.continuityReport.update({
    where: {
      id: reportId,
    },
    data: {
      status: "resolved",
      resolutionNote,
      resolvedAt: new Date(),
    },
  });
}

export async function reopenContinuityReportRecord(reportId: string) {
  return prisma.continuityReport.update({
    where: {
      id: reportId,
    },
    data: {
      status: "open",
      resolutionNote: null,
      resolvedAt: null,
    },
  });
}

export async function applyContinuityReportReplacementFix({
  projectId,
  reportId,
}: {
  projectId: string;
  reportId: string;
}): Promise<
  | { status: "missing-report" }
  | { status: "already-resolved" }
  | { status: "missing-chapter" }
  | { status: "unsupported" }
  | { status: "not-found" }
  | { status: "stale-report" }
  | {
      status: "applied";
      chapterId: string;
      replacementCount: number;
    }
> {
  const report = await prisma.continuityReport.findFirst({
    where: {
      id: reportId,
      projectId,
    },
    include: {
      chapter: true,
      aiTask: {
        select: {
          taskType: true,
        },
      },
    },
  });

  if (!report) {
    return {
      status: "missing-report",
    };
  }

  if (report.status !== "open") {
    return {
      status: "already-resolved",
    };
  }

  if (report.aiTask?.taskType === shortStoryWholeReviewTaskType) {
    return {
      status: "unsupported",
    };
  }

  if (!report.chapter) {
    return {
      status: "missing-chapter",
    };
  }

  if (
    report.sourceTextHash &&
    !chapterSourceMatches(report.sourceTextHash, report.chapter.finalText)
  ) {
    return {
      status: "stale-report",
    };
  }

  const replacementFix = parseContinuityReplacementFix(report.suggestedFix, {
    description: report.description,
    evidence: report.evidence,
    sourceText: report.chapter.finalText,
  });

  if (!replacementFix) {
    return {
      status: "unsupported",
    };
  }

  const replacementResult = applyContinuityReplacement(
    report.chapter.finalText ?? "",
    replacementFix,
  );

  if (replacementResult.count === 0) {
    return {
      status: "not-found",
    };
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
        resolutionNote: `一键修复定稿正文：${describeContinuityReplacementFix(
          replacementFix,
        )}（${replacementResult.count} 处）。`,
        resolvedAt: new Date(),
      },
    });
  });

  return {
    status: "applied",
    chapterId,
    replacementCount: replacementResult.count,
  };
}

export async function loadContinuityFixPatchReport({
  projectId,
  reportId,
}: {
  projectId: string;
  reportId: string;
}) {
  return prisma.continuityReport.findFirst({
    where: {
      id: reportId,
      projectId,
    },
    include: {
      project: {
        select: {
          title: true,
          genre: true,
          targetAudience: true,
          platform: true,
        },
      },
      chapter: {
        select: {
          id: true,
          chapterNumber: true,
          title: true,
          status: true,
          goal: true,
          beats: true,
          draftText: true,
          polishedText: true,
          finalText: true,
          notes: true,
        },
      },
      aiTask: {
        select: {
          taskType: true,
        },
      },
    },
  });
}

export async function findActiveContinuityTask(
  projectId: string,
  chapterId: string,
) {
  return prisma.aiTask.findFirst({
    where: {
      projectId,
      chapterId,
      taskType: continuityCheckTaskType,
      status: {
        in: [...activeAiTaskStatuses],
      },
    },
    select: {
      id: true,
    },
  });
}

export async function findActiveContinuityFixPatchTask(
  projectId: string,
  reportId: string,
) {
  const tasks = await prisma.aiTask.findMany({
    where: {
      projectId,
      taskType: continuityFixPatchTaskType,
      status: {
        in: [...activeAiTaskStatuses],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      inputJson: true,
    },
  });

  return tasks.find(
    (task) => readContinuityFixPatchReportId(task.inputJson) === reportId,
  );
}

export async function updateContinuityFixPatchTaskAdoptionState({
  adoptionState,
  projectId,
  taskId,
}: {
  adoptionState: "adopted" | "rejected";
  projectId: string;
  taskId: string;
}): Promise<
  | { status: "missing-task" }
  | { status: "already-reviewed"; chapterId: string | null; reportId: string | null }
  | { status: "updated"; chapterId: string | null; reportId: string | null }
> {
  const task = await prisma.aiTask.findFirst({
    where: {
      id: taskId,
      projectId,
      taskType: continuityFixPatchTaskType,
      status: "completed",
    },
    select: {
      id: true,
      chapterId: true,
      inputJson: true,
    },
  });

  if (!task) {
    return {
      status: "missing-task",
    };
  }

  const updated = await prisma.aiTask.updateMany({
    where: {
      id: task.id,
      projectId,
      taskType: continuityFixPatchTaskType,
      status: "completed",
      adoptionState: "not_reviewed",
    },
    data: {
      adoptionState,
    },
  });
  const reportId = readContinuityFixPatchReportId(task.inputJson);

  if (updated.count !== 1) {
    return {
      status: "already-reviewed",
      chapterId: task.chapterId,
      reportId,
    };
  }

  return {
    status: "updated",
    chapterId: task.chapterId,
    reportId,
  };
}

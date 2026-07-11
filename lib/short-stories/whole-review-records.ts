import { activeAiTaskStatuses } from "@/lib/ai/status";
import {
  parseShortStoryWholeReviewOutput,
  shortStoryWholeReviewTaskType,
  type ShortStoryWholeReviewUnit,
} from "@/lib/ai/short-story-whole-review";
import { chapterFinalTextHash } from "@/lib/chapters/source-text";
import { prisma } from "@/lib/prisma";

export async function loadShortStoryWholeReviewContext(projectId: string) {
  const [project, units, characters, foreshadows, timelineEvents] =
    await Promise.all([
      prisma.project.findFirst({
        where: {
          id: projectId,
          workType: "short_story",
        },
        include: {
          setting: true,
          shortStoryBlueprint: true,
        },
      }),
      prisma.chapter.findMany({
        where: {
          projectId,
          status: {
            in: ["final", "published"],
          },
          finalText: {
            not: null,
          },
        },
        orderBy: {
          chapterNumber: "asc",
        },
        select: {
          id: true,
          chapterNumber: true,
          title: true,
          status: true,
          goal: true,
          beats: true,
          unitSceneMovement: true,
          unitConflict: true,
          unitTurn: true,
          unitPayoffMovement: true,
          unitWordTarget: true,
          wordCount: true,
          finalText: true,
        },
      }),
      prisma.character.findMany({
        where: {
          projectId,
          status: "active",
        },
        orderBy: [
          { updatedAt: "desc" },
          { name: "asc" },
        ],
        take: 16,
        select: {
          name: true,
          roleInStory: true,
          identity: true,
          desire: true,
          fear: true,
          secret: true,
          characterArc: true,
          behaviorRules: true,
        },
      }),
      prisma.foreshadow.findMany({
        where: {
          projectId,
          status: {
            in: ["planted", "advancing", "needs_attention"],
          },
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          content: true,
          status: true,
          importance: true,
          expectedResolveChapter: true,
        },
      }),
      prisma.timelineEvent.findMany({
        where: {
          projectId,
          status: "active",
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          title: true,
          description: true,
          storyTime: true,
          location: true,
        },
      }),
    ]);

  if (!project) {
    return null;
  }

  return {
    project: {
      title: project.title,
      genre: project.genre,
      targetAudience: project.targetAudience,
      platform: project.platform,
      totalWordTarget: project.totalWordTarget,
      description: project.description,
    },
    setting: project.setting,
    blueprint: project.shortStoryBlueprint,
    characters,
    foreshadows,
    timelineEvents,
    units: units.filter((unit) => Boolean(unit.finalText?.trim())),
  };
}

export async function createShortStoryWholeReviewReportsFromTask({
  outputText,
  projectId,
  taskId,
  units,
}: {
  outputText?: string | null;
  projectId: string;
  taskId: string;
  units: readonly ShortStoryWholeReviewUnit[];
}) {
  const result = parseShortStoryWholeReviewOutput(outputText);
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const seen = new Set<string>();
  const reports = result.issues.flatMap((issue) => {
    const targetUnit = unitById.get(issue.targetUnitId);

    if (!targetUnit?.finalText?.trim()) {
      return [];
    }

    const dedupeKey = [
      issue.targetUnitId,
      issue.category,
      issue.title,
      issue.description,
    ].join("\n");

    if (seen.has(dedupeKey)) {
      return [];
    }

    seen.add(dedupeKey);
    const relatedUnits = issue.relatedUnitIds
      .map((unitId) => unitById.get(unitId))
      .filter((unit): unit is ShortStoryWholeReviewUnit => Boolean(unit))
      .map((unit) => `单元 ${unit.chapterNumber}《${unit.title}》`);
    const reviewBasis = [
      issue.reviewBasis,
      relatedUnits.length > 0 ? `关联单元：${relatedUnits.join("、")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    return [
      {
        projectId,
        chapterId: targetUnit.id,
        aiTaskId: taskId,
        severity: issue.severity,
        category: issue.category,
        title: issue.title,
        description: issue.description,
        evidence: issue.evidence,
        conflictingMemory: reviewBasis || undefined,
        suggestedFix: issue.suggestedFix,
        sourceTextHash: chapterFinalTextHash(targetUnit.finalText),
        status: "open",
      },
    ];
  });

  if (reports.length === 0) {
    return { count: 0 };
  }

  const sourceTextHashes = reports
    .map((report) => report.sourceTextHash)
    .filter((hash): hash is string => Boolean(hash));
  const existingReports = await prisma.continuityReport.findMany({
    where: {
      projectId,
      status: "open",
      chapterId: {
        in: [...new Set(reports.map((report) => report.chapterId))],
      },
      sourceTextHash: {
        in: [...new Set(sourceTextHashes)],
      },
      aiTask: {
        is: {
          taskType: shortStoryWholeReviewTaskType,
        },
      },
    },
    select: {
      chapterId: true,
      sourceTextHash: true,
      category: true,
      title: true,
    },
  });
  const existingKeys = new Set(existingReports.map(wholeReviewReportKey));
  const newReports = reports.filter(
    (report) => !existingKeys.has(wholeReviewReportKey(report)),
  );

  if (newReports.length === 0) {
    return { count: 0 };
  }

  return prisma.continuityReport.createMany({
    data: newReports,
  });
}

function wholeReviewReportKey(report: {
  chapterId: string | null;
  sourceTextHash: string | null;
  category: string;
  title: string;
}) {
  return [
    report.chapterId ?? "",
    report.sourceTextHash ?? "",
    report.category,
    report.title.trim().toLocaleLowerCase("zh-CN").replace(/\s+/g, ""),
  ].join("\n");
}

export async function findActiveShortStoryWholeReviewTask(projectId: string) {
  return prisma.aiTask.findFirst({
    where: {
      projectId,
      taskType: shortStoryWholeReviewTaskType,
      status: {
        in: [...activeAiTaskStatuses],
      },
    },
    select: {
      id: true,
    },
  });
}

export async function findShortStoryWholeReviewReport({
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
      aiTask: {
        is: {
          taskType: shortStoryWholeReviewTaskType,
        },
      },
    },
    select: {
      id: true,
      chapterId: true,
      status: true,
    },
  });
}

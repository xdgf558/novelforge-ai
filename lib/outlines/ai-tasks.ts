import {
  endingPlanningGenerationTaskType,
  outlineGenerationTaskType,
} from "@/lib/ai/outline-task-maintenance";
import {
  isUsableEndingPlanTask,
  readEndingPlanPlanningWindow,
  type EndingPlanReference,
} from "@/lib/ai/ending-plan-reference";
import { activeAiTaskStatuses } from "@/lib/ai/status";
import { prisma } from "@/lib/prisma";

export async function findActiveOutlineGenerationTask(projectId: string) {
  return prisma.aiTask.findFirst({
    where: {
      projectId,
      taskType: outlineGenerationTaskType,
      status: {
        in: [...activeAiTaskStatuses],
      },
    },
    select: {
      id: true,
    },
  });
}

export async function findActiveEndingPlanningTask(projectId: string) {
  return prisma.aiTask.findFirst({
    where: {
      projectId,
      taskType: endingPlanningGenerationTaskType,
      status: {
        in: [...activeAiTaskStatuses],
      },
    },
    select: {
      id: true,
    },
  });
}

export async function findLatestEndingPlanningReference(
  projectId: string,
): Promise<EndingPlanReference | null> {
  const task = await prisma.aiTask.findFirst({
    where: {
      projectId,
      taskType: endingPlanningGenerationTaskType,
      status: "completed",
    },
    orderBy: [
      {
        createdAt: "desc",
      },
      {
        id: "desc",
      },
    ],
    select: {
      id: true,
      taskType: true,
      status: true,
      adoptionState: true,
      completedAt: true,
      inputJson: true,
      outputText: true,
    },
  });

  if (!task || !isUsableEndingPlanTask(task)) {
    return null;
  }

  const planningWindow = readEndingPlanPlanningWindow(task.inputJson);

  return {
    taskId: task.id,
    adoptionState: task.adoptionState,
    completedAt: task.completedAt,
    outputText: task.outputText,
    generatedAtChapterNumber:
      planningWindow?.generatedAtChapterNumber ?? null,
    validThroughChapterNumber:
      planningWindow?.validThroughChapterNumber ?? null,
  };
}

export function buildPreviousChapterEndingContext(
  chapter: {
    chapterNumber: number;
    title: string;
    draftText?: string | null;
    polishedText?: string | null;
    finalText?: string | null;
  } | null,
) {
  if (!chapter) {
    return null;
  }

  const sourceText =
    chapter.finalText?.trim() ||
    chapter.polishedText?.trim() ||
    chapter.draftText?.trim() ||
    "";

  if (!sourceText) {
    return null;
  }

  return {
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    endingText: tailText(sourceText, 1800),
  };
}

export function inferNextTargetChapterNumber(
  chapters: readonly { chapterNumber: number }[],
  outlines: readonly { level?: string | null; chapterNumber?: number | null }[],
) {
  const maxKnownChapterNumber = Math.max(
    0,
    ...chapters.map((chapter) => chapter.chapterNumber),
    ...outlines
      .filter((outline) => outline.level === "chapter")
      .map((outline) => outline.chapterNumber ?? 0),
  );

  return maxKnownChapterNumber + 1;
}

function tailText(value: string, maxLength: number) {
  return value.length <= maxLength ? value : value.slice(-maxLength);
}

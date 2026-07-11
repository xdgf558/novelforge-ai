import { prisma } from "@/lib/prisma";
import { chapterFinalTextHash } from "@/lib/chapters/source-text";

type CompletedChapterSummaryTask = {
  id: string;
  chapterId?: string | null;
  model: string;
  inputContextSummary: string;
  outputText?: string | null;
};

export async function persistChapterSummaryFromTask({
  chapterId,
  projectId,
  sourceTextHash,
  task,
}: {
  chapterId: string;
  projectId: string;
  sourceTextHash: string;
  task: CompletedChapterSummaryTask;
}) {
  const outputText = task.outputText?.trim();

  if (!outputText) {
    return null;
  }

  return prisma.chapterSummary.upsert({
    where: {
      aiTaskId: task.id,
    },
    create: {
      projectId,
      chapterId,
      aiTaskId: task.id,
      model: task.model,
      inputContextSummary: task.inputContextSummary,
      outputText,
      sourceTextHash,
    },
    update: {
      model: task.model,
      inputContextSummary: task.inputContextSummary,
      outputText,
      sourceTextHash,
    },
  });
}

export async function findCurrentChapterSummary({
  chapterId,
  finalText,
  projectId,
}: {
  chapterId: string;
  finalText?: string | null;
  projectId: string;
}) {
  const sourceTextHash = chapterFinalTextHash(finalText);

  if (!sourceTextHash) {
    return null;
  }

  return prisma.chapterSummary.findFirst({
    where: {
      projectId,
      chapterId,
      sourceTextHash,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      chapterId: true,
      inputContextSummary: true,
      outputText: true,
      createdAt: true,
    },
  });
}

export async function findRecentCurrentChapterSummaries({
  projectId,
  limit = 3,
}: {
  projectId: string;
  limit?: number;
}) {
  const normalizedLimit = Math.max(0, limit);

  if (normalizedLimit === 0) {
    return [];
  }

  const recentChapters = await prisma.chapter.findMany({
    where: {
      projectId,
      finalText: {
        not: null,
      },
    },
    orderBy: [{ chapterNumber: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      finalText: true,
    },
  });
  const currentSources = recentChapters.flatMap((chapter) => {
    const sourceTextHash = chapterFinalTextHash(chapter.finalText);

    return sourceTextHash
      ? [
          {
            chapterId: chapter.id,
            sourceTextHash,
          },
        ]
      : [];
  });

  if (currentSources.length === 0) {
    return [];
  }

  const currentHashByChapterId = new Map(
    currentSources.map((source) => [source.chapterId, source.sourceTextHash]),
  );
  const summaries = await prisma.chapterSummary.findMany({
    where: {
      projectId,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      chapterId: true,
      inputContextSummary: true,
      outputText: true,
      sourceTextHash: true,
      createdAt: true,
    },
  });
  const latestSummaryByChapterId = new Map<
    string,
    (typeof summaries)[number]
  >();

  for (const summary of summaries) {
    if (
      currentHashByChapterId.get(summary.chapterId) === summary.sourceTextHash &&
      !latestSummaryByChapterId.has(summary.chapterId)
    ) {
      latestSummaryByChapterId.set(summary.chapterId, summary);
    }
  }

  return currentSources
    .flatMap((source) => {
      const summary = latestSummaryByChapterId.get(source.chapterId);

      return summary ? [summary] : [];
    })
    .slice(0, normalizedLimit);
}

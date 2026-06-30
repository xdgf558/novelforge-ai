import type { Prisma } from "@prisma/client";

type StorylineRange = {
  startChapter: number | null;
  endChapter: number | null;
};

type ChapterForRelation = {
  id: string;
  chapterNumber: number;
};

export function chapterBelongsToExplicitStorylineRange(
  chapterNumber: number,
  range: StorylineRange,
) {
  return (
    range.startChapter != null &&
    range.endChapter != null &&
    chapterNumber >= range.startChapter &&
    chapterNumber <= range.endChapter
  );
}

export async function chapterIdsInExplicitStorylineRange(
  tx: Prisma.TransactionClient,
  projectId: string,
  range: StorylineRange,
) {
  if (range.startChapter == null || range.endChapter == null) {
    return [];
  }

  const chapters = await tx.chapter.findMany({
    where: {
      projectId,
      chapterNumber: {
        gte: range.startChapter,
        lte: range.endChapter,
      },
    },
    orderBy: {
      chapterNumber: "asc",
    },
    select: {
      id: true,
    },
  });

  return chapters.map((chapter) => chapter.id);
}

export function mergeChapterRelationIds(
  explicitChapterIds: readonly string[],
  autoChapterIds: readonly string[],
) {
  return Array.from(new Set([...explicitChapterIds, ...autoChapterIds]));
}

export async function createMissingStorylineChapterRelationsForChapter(
  tx: Prisma.TransactionClient,
  projectId: string,
  chapter: ChapterForRelation,
) {
  const matchingStorylines = await tx.storyline.findMany({
    where: {
      projectId,
      status: {
        not: "archived",
      },
      startChapter: {
        lte: chapter.chapterNumber,
      },
      endChapter: {
        gte: chapter.chapterNumber,
      },
    },
    select: {
      id: true,
    },
  });

  if (matchingStorylines.length === 0) {
    return 0;
  }

  const storylineIds = matchingStorylines.map((storyline) => storyline.id);
  const existingRelations = await tx.storylineChapter.findMany({
    where: {
      projectId,
      chapterId: chapter.id,
      storylineId: {
        in: storylineIds,
      },
    },
    select: {
      storylineId: true,
    },
  });
  const existingStorylineIds = new Set(
    existingRelations.map((relation) => relation.storylineId),
  );
  const missingRelations = storylineIds
    .filter((storylineId) => !existingStorylineIds.has(storylineId))
    .map((storylineId) => ({
      projectId,
      storylineId,
      chapterId: chapter.id,
    }));

  if (missingRelations.length === 0) {
    return 0;
  }

  await tx.storylineChapter.createMany({
    data: missingRelations,
  });

  return missingRelations.length;
}

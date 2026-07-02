import type { Prisma } from "@prisma/client";

import { activeAiTaskStatuses } from "@/lib/ai/status";
import { storylineGenerationTaskType } from "@/lib/ai/storylines";
import { prisma } from "@/lib/prisma";
import {
  chapterIdsInExplicitStorylineRange,
  mergeChapterRelationIds,
} from "@/lib/storyline-auto-relations";
import {
  normalizeStorylineStatus,
  normalizeStorylineType,
  type StorylineValidationErrorCode,
} from "@/lib/storyline-fields";

export type StorylineRecordValues = {
  name: string;
  type: string;
  status: string;
  startChapter: number | null;
  endChapter: number | null;
  coreGoal: string;
  currentProgress: string;
  notes: string;
};

export type StorylineRelationIds = {
  characterIds: string[];
  foreshadowIds: string[];
  chapterIds: string[];
  outlineIds: string[];
};

export async function createStorylineRecord({
  projectId,
  relationIds,
  values,
}: {
  projectId: string;
  relationIds: StorylineRelationIds;
  values: StorylineRecordValues;
}) {
  return prisma.$transaction(async (tx) => {
    const storyline = await tx.storyline.create({
      data: {
        projectId,
        ...storylineData(values),
      },
      select: {
        id: true,
      },
    });

    const autoChapterIds = await chapterIdsInExplicitStorylineRange(
      tx,
      projectId,
      values,
    );

    await replaceStorylineRelations(
      tx,
      projectId,
      storyline.id,
      relationIdsWithAutoRange(relationIds, autoChapterIds),
    );

    return storyline;
  });
}

export async function updateStorylineRecord({
  projectId,
  relationIds,
  storylineId,
  values,
}: {
  projectId: string;
  relationIds: StorylineRelationIds;
  storylineId: string;
  values: StorylineRecordValues;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.storyline.update({
      where: {
        id: storylineId,
      },
      data: storylineData(values),
    });

    const autoChapterIds = await chapterIdsInExplicitStorylineRange(
      tx,
      projectId,
      values,
    );

    await replaceStorylineRelations(
      tx,
      projectId,
      storylineId,
      relationIdsWithAutoRange(relationIds, autoChapterIds),
    );
  });
}

export async function archiveStorylineRecord(storylineId: string) {
  return prisma.storyline.update({
    where: {
      id: storylineId,
    },
    data: {
      status: "archived",
    },
  });
}

export async function completeStorylineRecord({
  projectId,
  storylineId,
}: {
  projectId: string;
  storylineId: string;
}) {
  const result = await prisma.storyline.updateMany({
    where: {
      id: storylineId,
      projectId,
      status: {
        notIn: ["archived", "completed"],
      },
    },
    data: {
      status: "completed",
    },
  });

  return result.count === 1 ? "completed" : "already-updated";
}

export async function findStorylineForProject({
  projectId,
  storylineId,
}: {
  projectId: string;
  storylineId: string;
}) {
  return prisma.storyline.findFirst({
    where: {
      id: storylineId,
      projectId,
    },
    select: {
      id: true,
    },
  });
}

export async function findDuplicateStorylineCandidate(
  projectId: string,
  values: StorylineRecordValues,
) {
  return prisma.storyline.findFirst({
    where: {
      projectId,
      name: values.name,
      type: normalizeStorylineType(values.type),
      startChapter: values.startChapter,
      endChapter: values.endChapter,
      status: {
        not: "archived",
      },
    },
    select: {
      id: true,
    },
  });
}

export async function validateStorylineRelationIds(
  projectId: string,
  relationIds: StorylineRelationIds,
): Promise<StorylineValidationErrorCode | null> {
  const [
    characterCount,
    foreshadowCount,
    chapterCount,
    outlineCount,
  ] = await Promise.all([
    countProjectRecords("character", projectId, relationIds.characterIds),
    countProjectRecords("foreshadow", projectId, relationIds.foreshadowIds),
    countProjectRecords("chapter", projectId, relationIds.chapterIds),
    countProjectRecords("outline", projectId, relationIds.outlineIds),
  ]);

  if (
    characterCount !== relationIds.characterIds.length ||
    foreshadowCount !== relationIds.foreshadowIds.length ||
    chapterCount !== relationIds.chapterIds.length ||
    outlineCount !== relationIds.outlineIds.length
  ) {
    return "invalidRelation";
  }

  return null;
}

export async function findActiveStorylineGenerationTask(projectId: string) {
  return prisma.aiTask.findFirst({
    where: {
      projectId,
      taskType: storylineGenerationTaskType,
      status: {
        in: [...activeAiTaskStatuses],
      },
    },
    select: {
      id: true,
    },
  });
}

function storylineData(values: StorylineRecordValues) {
  return {
    name: values.name,
    type: normalizeStorylineType(values.type),
    status: normalizeStorylineStatus(values.status),
    startChapter: values.startChapter,
    endChapter: values.endChapter,
    coreGoal: values.coreGoal,
    currentProgress: values.currentProgress,
    notes: values.notes,
  };
}

function relationIdsWithAutoRange(
  relationIds: StorylineRelationIds,
  autoChapterIds: string[],
): StorylineRelationIds {
  return {
    ...relationIds,
    chapterIds: mergeChapterRelationIds(relationIds.chapterIds, autoChapterIds),
  };
}

async function countProjectRecords(
  kind: "character" | "foreshadow" | "chapter" | "outline",
  projectId: string,
  ids: string[],
) {
  if (ids.length === 0) {
    return 0;
  }

  const where = {
    projectId,
    id: {
      in: ids,
    },
  };

  switch (kind) {
    case "character":
      return prisma.character.count({ where });
    case "foreshadow":
      return prisma.foreshadow.count({ where });
    case "chapter":
      return prisma.chapter.count({ where });
    case "outline":
      return prisma.outline.count({ where });
  }
}

async function replaceStorylineRelations(
  tx: Prisma.TransactionClient,
  projectId: string,
  storylineId: string,
  relationIds: StorylineRelationIds,
) {
  await Promise.all([
    tx.storylineCharacter.deleteMany({
      where: {
        storylineId,
      },
    }),
    tx.storylineForeshadow.deleteMany({
      where: {
        storylineId,
      },
    }),
    tx.storylineChapter.deleteMany({
      where: {
        storylineId,
      },
    }),
    tx.storylineOutline.deleteMany({
      where: {
        storylineId,
      },
    }),
  ]);

  await Promise.all([
    relationIds.characterIds.length > 0
      ? tx.storylineCharacter.createMany({
          data: relationIds.characterIds.map((characterId) => ({
            projectId,
            storylineId,
            characterId,
          })),
        })
      : null,
    relationIds.foreshadowIds.length > 0
      ? tx.storylineForeshadow.createMany({
          data: relationIds.foreshadowIds.map((foreshadowId) => ({
            projectId,
            storylineId,
            foreshadowId,
          })),
        })
      : null,
    relationIds.chapterIds.length > 0
      ? tx.storylineChapter.createMany({
          data: relationIds.chapterIds.map((chapterId) => ({
            projectId,
            storylineId,
            chapterId,
          })),
        })
      : null,
    relationIds.outlineIds.length > 0
      ? tx.storylineOutline.createMany({
          data: relationIds.outlineIds.map((outlineId) => ({
            projectId,
            storylineId,
            outlineId,
          })),
        })
      : null,
  ]);
}

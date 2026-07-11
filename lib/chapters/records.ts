import { Prisma } from "@prisma/client";
import {
  chapterSnapshot,
  type ChapterValues,
} from "@/lib/chapter-fields";
import { prisma } from "@/lib/prisma";
import { createMissingStorylineChapterRelationsForChapter } from "@/lib/storyline-auto-relations";

type ExistingChapterForUpdate = {
  id: string;
  chapterNumber: number;
};

export class DuplicateChapterNumberError extends Error {
  constructor() {
    super("同一项目中不能存在两个相同章节号。");
    this.name = "DuplicateChapterNumberError";
  }
}

export async function findChapterForUpdate({
  chapterId,
  projectId,
}: {
  chapterId: string;
  projectId: string;
}): Promise<ExistingChapterForUpdate | null> {
  return prisma.chapter.findFirst({
    where: {
      id: chapterId,
      projectId,
    },
    select: {
      id: true,
      chapterNumber: true,
    },
  });
}

export async function createChapterRecord({
  changeReason,
  linkStorylines = true,
  projectId,
  values,
}: {
  changeReason?: string;
  linkStorylines?: boolean;
  projectId: string;
  values: ChapterValues;
}) {
  const snapshot = chapterSnapshot(values);

  try {
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

      if (linkStorylines) {
        await createMissingStorylineChapterRelationsForChapter(
          tx,
          projectId,
          createdChapter,
        );
      }

      return createdChapter;
    });

    return {
      chapter,
      chapterNumber: snapshot.chapterNumber,
    };
  } catch (error) {
    throwChapterNumberError(error);
  }
}

export async function updateChapterRecord({
  changeReason,
  chapter,
  linkStorylines = true,
  projectId,
  values,
}: {
  changeReason?: string;
  chapter: ExistingChapterForUpdate;
  linkStorylines?: boolean;
  projectId: string;
  values: ChapterValues;
}) {
  const snapshot = chapterSnapshot(values);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.chapter.update({
        where: {
          id: chapter.id,
        },
        data: snapshot,
      });

      const versionCount = await tx.chapterVersion.count({
        where: {
          chapterId: chapter.id,
        },
      });

      await tx.chapterVersion.create({
        data: {
          projectId,
          chapterId: chapter.id,
          versionNumber: versionCount + 1,
          snapshotJson: JSON.stringify(snapshot),
          changeReason,
          sourceType: "manual",
        },
      });

      if (linkStorylines) {
        await createMissingStorylineChapterRelationsForChapter(tx, projectId, {
          id: chapter.id,
          chapterNumber: snapshot.chapterNumber,
        });
      }
    });
  } catch (error) {
    throwChapterNumberError(error);
  }

  return {
    chapterId: chapter.id,
    previousChapterNumber: chapter.chapterNumber,
    chapterNumber: snapshot.chapterNumber,
  };
}

function throwChapterNumberError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    chapterNumberIsUniqueTarget(error.meta?.target)
  ) {
    throw new DuplicateChapterNumberError();
  }

  throw error;
}

function chapterNumberIsUniqueTarget(target: unknown) {
  const targetText = Array.isArray(target)
    ? target.map(String).join(",")
    : typeof target === "string"
      ? target
      : "";

  return (
    targetText.includes("projectId") && targetText.includes("chapterNumber")
  );
}

export async function deleteChapterRecord({
  chapterId,
  projectId,
}: {
  chapterId: string;
  projectId: string;
}) {
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
    return null;
  }

  await prisma.chapter.delete({
    where: {
      id: chapterId,
    },
  });

  return {
    chapterNumber: chapter.chapterNumber,
  };
}

export async function updateChapterReaderRemoteIdRecord({
  chapter,
  projectId,
  readerRemoteId,
}: {
  chapter: Pick<ExistingChapterForUpdate, "id">;
  projectId: string;
  readerRemoteId: string | null;
}) {
  await prisma.chapter.update({
    where: {
      id: chapter.id,
    },
    data: {
      readerRemoteId,
    },
  });
}

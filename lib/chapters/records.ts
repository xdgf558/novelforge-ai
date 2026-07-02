import {
  chapterSnapshot,
  type ChapterValues,
} from "@/lib/chapter-fields";
import { prisma } from "@/lib/prisma";
import { createMissingStorylineChapterRelationsForChapter } from "@/lib/storyline-auto-relations";

export async function createChapterRecord({
  changeReason,
  projectId,
  values,
}: {
  changeReason?: string;
  projectId: string;
  values: ChapterValues;
}) {
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

  return {
    chapter,
    chapterNumber: snapshot.chapterNumber,
  };
}

export async function updateChapterRecord({
  changeReason,
  chapterId,
  projectId,
  values,
}: {
  changeReason?: string;
  chapterId: string;
  projectId: string;
  values: ChapterValues;
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

  return {
    chapterId,
    previousChapterNumber: chapter.chapterNumber,
    chapterNumber: snapshot.chapterNumber,
  };
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
  chapterId,
  projectId,
  readerRemoteId,
}: {
  chapterId: string;
  projectId: string;
  readerRemoteId: string | null;
}) {
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
    return false;
  }

  await prisma.chapter.update({
    where: {
      id: chapterId,
    },
    data: {
      readerRemoteId,
    },
  });

  return true;
}

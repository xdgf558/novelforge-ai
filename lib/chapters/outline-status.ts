import {
  calculateOutlineProgress,
  chapterBelongsToOutline,
} from "@/lib/outline-progress";
import { prisma } from "@/lib/prisma";

export async function syncOutlineStatusesForChapterNumbers(
  projectId: string,
  chapterNumbers: Iterable<number>,
) {
  const numbersToSync = [...new Set(chapterNumbers)];

  if (numbersToSync.length === 0) {
    return;
  }

  const [outlines, chapters] = await Promise.all([
    prisma.outline.findMany({
      where: {
        projectId,
        status: {
          not: "archived",
        },
      },
    }),
    prisma.chapter.findMany({
      where: {
        projectId,
      },
      select: {
        chapterNumber: true,
        status: true,
      },
    }),
  ]);
  const matchingOutlines = outlines.filter((outline) =>
    numbersToSync.some((chapterNumber) =>
      chapterBelongsToOutline(chapterNumber, outline),
    ),
  );

  await Promise.all(
    matchingOutlines.map((outline) => {
      const progress = calculateOutlineProgress(outline, chapters);

      if (outline.status === progress.statusSuggestion) {
        return null;
      }

      return prisma.outline.update({
        where: {
          id: outline.id,
        },
        data: {
          status: progress.statusSuggestion,
        },
      });
    }),
  );
}

import { prisma } from "@/lib/prisma";

const unresolvedForeshadowStatuses = [
  "planted",
  "advancing",
  "needs_attention",
] as const;

export async function findEndingPlanningForeshadows(projectId: string) {
  const includeChapters = {
    plantedChapter: {
      select: {
        chapterNumber: true,
        title: true,
      },
    },
    resolvedChapter: {
      select: {
        chapterNumber: true,
        title: true,
      },
    },
  } as const;

  const [highUnresolved, otherUnresolved, recentResolved] = await Promise.all([
    prisma.foreshadow.findMany({
      where: {
        projectId,
        status: {
          in: [...unresolvedForeshadowStatuses],
        },
        importance: "high",
      },
      include: includeChapters,
      orderBy: {
        updatedAt: "desc",
      },
      take: 30,
    }),
    prisma.foreshadow.findMany({
      where: {
        projectId,
        status: {
          in: [...unresolvedForeshadowStatuses],
        },
        importance: {
          not: "high",
        },
      },
      include: includeChapters,
      orderBy: {
        updatedAt: "desc",
      },
      take: 30,
    }),
    prisma.foreshadow.findMany({
      where: {
        projectId,
        status: "resolved",
      },
      include: includeChapters,
      orderBy: {
        updatedAt: "desc",
      },
      take: 10,
    }),
  ]);

  return dedupeForeshadows([
    ...highUnresolved,
    ...sortForeshadowsByPlanningPriority(otherUnresolved).slice(0, 20),
    ...recentResolved,
  ]);
}

function dedupeForeshadows<
  T extends { id?: string; content: string; status: string; importance: string },
>(foreshadows: readonly T[]) {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const foreshadow of foreshadows) {
    const key =
      foreshadow.id ??
      `${foreshadow.importance}:${foreshadow.status}:${foreshadow.content}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(foreshadow);
  }

  return result;
}

function sortForeshadowsByPlanningPriority<
  T extends { importance: string; updatedAt?: Date | string },
>(foreshadows: readonly T[]) {
  return [...foreshadows].sort((left, right) => {
    const importanceDiff =
      foreshadowImportanceRank(left.importance) -
      foreshadowImportanceRank(right.importance);

    if (importanceDiff !== 0) {
      return importanceDiff;
    }

    return timestampValue(right.updatedAt) - timestampValue(left.updatedAt);
  });
}

function foreshadowImportanceRank(importance: string) {
  switch (importance) {
    case "high":
      return 0;
    case "medium":
      return 1;
    case "low":
      return 2;
    default:
      return 99;
  }
}

function timestampValue(value?: Date | string) {
  if (!value) {
    return 0;
  }

  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : 0;
}

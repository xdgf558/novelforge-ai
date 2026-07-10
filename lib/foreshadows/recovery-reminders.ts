import { prisma } from "@/lib/prisma";

export { foreshadowRecoveryReason } from "./recovery-reason";

export const recoverableForeshadowStatuses = [
  "planted",
  "advancing",
  "needs_attention",
] as const;

export type ForeshadowRecoveryReminder = {
  id: string;
  content: string;
  status: string;
  importance: string;
  expectedResolveChapter?: number | null;
  relatedCharacters?: string | null;
  relatedLocations?: string | null;
  relatedFactions?: string | null;
  plantedChapter?: {
    chapterNumber: number;
    title: string;
  } | null;
};

const defaultReminderLimit = 8;

export async function findForeshadowRecoveryReminders({
  currentChapterNumber,
  limit = defaultReminderLimit,
  projectId,
}: {
  currentChapterNumber: number;
  limit?: number;
  projectId: string;
}) {
  const candidates = await prisma.foreshadow.findMany({
    where: {
      projectId,
      status: {
        in: [...recoverableForeshadowStatuses],
      },
      OR: [
        {
          expectedResolveChapter: {
            lte: currentChapterNumber,
          },
        },
        {
          status: "needs_attention",
        },
      ],
    },
    select: {
      id: true,
      content: true,
      status: true,
      importance: true,
      expectedResolveChapter: true,
      relatedCharacters: true,
      relatedLocations: true,
      relatedFactions: true,
      plantedChapter: {
        select: {
          chapterNumber: true,
          title: true,
        },
      },
    },
    orderBy: [
      {
        expectedResolveChapter: "asc",
      },
      {
        updatedAt: "desc",
      },
    ],
  });

  return selectForeshadowRecoveryReminders({
    currentChapterNumber,
    foreshadows: candidates,
    limit,
  });
}

export function selectForeshadowRecoveryReminders({
  currentChapterNumber,
  foreshadows,
  limit = defaultReminderLimit,
}: {
  currentChapterNumber: number;
  foreshadows: readonly ForeshadowRecoveryReminder[];
  limit?: number;
}) {
  return foreshadows
    .filter((foreshadow) =>
      shouldSuggestForeshadowRecovery(foreshadow, currentChapterNumber),
    )
    .sort((left, right) =>
      compareForeshadowRecoveryPriority(left, right, currentChapterNumber),
    )
    .slice(0, limit);
}

function shouldSuggestForeshadowRecovery(
  foreshadow: ForeshadowRecoveryReminder,
  currentChapterNumber: number,
) {
  if (
    !recoverableForeshadowStatuses.some((status) => status === foreshadow.status)
  ) {
    return false;
  }

  if (foreshadow.status === "needs_attention") {
    return true;
  }

  return (
    foreshadow.expectedResolveChapter != null &&
    foreshadow.expectedResolveChapter <= currentChapterNumber
  );
}

function compareForeshadowRecoveryPriority(
  left: ForeshadowRecoveryReminder,
  right: ForeshadowRecoveryReminder,
  currentChapterNumber: number,
) {
  return (
    statusRank(left.status) - statusRank(right.status) ||
    expectedChapterRank(left, currentChapterNumber) -
      expectedChapterRank(right, currentChapterNumber) ||
    importanceRank(left.importance) - importanceRank(right.importance) ||
    left.content.localeCompare(right.content, "zh-Hans-CN")
  );
}

function expectedChapterRank(
  foreshadow: ForeshadowRecoveryReminder,
  currentChapterNumber: number,
) {
  if (foreshadow.expectedResolveChapter == null) {
    return currentChapterNumber + 1000;
  }

  return foreshadow.expectedResolveChapter;
}

function statusRank(status: string) {
  if (status === "needs_attention") {
    return 0;
  }

  if (status === "advancing") {
    return 1;
  }

  return 2;
}

function importanceRank(importance: string) {
  if (importance === "high") {
    return 0;
  }

  if (importance === "medium") {
    return 1;
  }

  return 2;
}

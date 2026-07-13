import { prisma } from "@/lib/prisma";

type SeriesContextEntry = {
  id: string;
  continuityNote?: string | null;
  project: {
    title: string;
  };
};

type SeriesContextCharacter = {
  name: string;
  roleInSeries?: string | null;
  identity?: string | null;
  accumulatedState?: string | null;
  relationshipState?: string | null;
  knownInformation?: string | null;
  recurringRules?: string | null;
};

export type ShortStorySeriesContextRecord = {
  id: string;
  sequenceNumber?: number | null;
  project: {
    title: string;
  };
  continuityNote?: string | null;
  series: {
    title: string;
    premise?: string | null;
    sharedWorldview?: string | null;
    continuityRules?: string | null;
    recurringElements?: string | null;
    longTermMysteries?: string | null;
    futureDirection?: string | null;
    entries: readonly SeriesContextEntry[];
    characters: readonly SeriesContextCharacter[];
  };
};

export async function loadShortStorySeriesContext(projectId: string) {
  const membership = await prisma.shortStorySeriesEntry.findUnique({
    where: {
      projectId,
    },
    include: {
      project: {
        select: {
          title: true,
        },
      },
      series: {
        include: {
          characters: {
            where: {
              status: "active",
            },
            orderBy: [
              {
                sortOrder: "asc",
              },
              {
                createdAt: "asc",
              },
            ],
            take: 12,
          },
        },
      },
    },
  });

  if (!membership) {
    return null;
  }

  const earlierEntryWhere = {
    seriesId: membership.seriesId,
    OR: [
      {
        sortOrder: {
          lt: membership.sortOrder,
        },
      },
      {
        sortOrder: membership.sortOrder,
        createdAt: {
          lt: membership.createdAt,
        },
      },
      {
        sortOrder: membership.sortOrder,
        createdAt: membership.createdAt,
        id: {
          lt: membership.id,
        },
      },
    ],
  };
  const [previousEntriesDescending, previousEntryCount] = await Promise.all([
    prisma.shortStorySeriesEntry.findMany({
      where: earlierEntryWhere,
      orderBy: [
        {
          sortOrder: "desc",
        },
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],
      take: 12,
      select: {
        id: true,
        continuityNote: true,
        project: {
          select: {
            title: true,
          },
        },
      },
    }),
    prisma.shortStorySeriesEntry.count({
      where: earlierEntryWhere,
    }),
  ]);
  const previousEntries = previousEntriesDescending.reverse();

  return formatShortStorySeriesContext({
    id: membership.id,
    sequenceNumber: previousEntryCount + 1,
    project: membership.project,
    continuityNote: membership.continuityNote,
    series: {
      ...membership.series,
      entries: [
        ...previousEntries,
        {
          id: membership.id,
          continuityNote: membership.continuityNote,
          project: membership.project,
        },
      ],
    },
  });
}

export function formatShortStorySeriesContext(
  membership: ShortStorySeriesContextRecord,
) {
  const currentIndex = membership.series.entries.findIndex(
    (entry) => entry.id === membership.id,
  );
  const sequenceNumber =
    membership.sequenceNumber ?? (currentIndex >= 0 ? currentIndex + 1 : null);
  const previousEntries =
    currentIndex > 0
      ? membership.series.entries.slice(Math.max(0, currentIndex - 12), currentIndex)
      : [];
  const previousProgress = previousEntries
    .map((entry, index) => {
      const note = clip(entry.continuityNote, 900);
      return note
        ? `- 第 ${Math.max(1, (sequenceNumber ?? 1) - previousEntries.length + index)} 篇《${clip(entry.project.title, 120)}》：${note}`
        : "";
    })
    .filter(Boolean);
  const characters = membership.series.characters
    .map((character) => formatCharacter(character))
    .filter(Boolean);

  return [
    `系列：${clip(membership.series.title, 160)}`,
    `当前篇目：${sequenceNumber ? `第 ${sequenceNumber} 篇` : "顺序未确定"}《${clip(membership.project.title, 160)}》`,
    `系列定位：${clip(membership.series.premise, 1800) || "未设置"}`,
    `共享世界观：${clip(membership.series.sharedWorldview, 2200) || "未设置"}`,
    `跨篇连续性规则：${clip(membership.series.continuityRules, 2200) || "未设置"}`,
    `可复现人物 / 组织 / 技术：${clip(membership.series.recurringElements, 1800) || "未设置"}`,
    `长期谜团：${clip(membership.series.longTermMysteries, 2200) || "未设置"}`,
    `系列后续方向：${clip(membership.series.futureDirection, 1400) || "未设置"}`,
    `本篇系列推进目标：${clip(membership.continuityNote, 1200) || "未单独指定；优先保持共享连续性并完成本篇独立闭环"}`,
    "",
    "前篇已确认推进：",
    previousProgress.length > 0
      ? previousProgress.join("\n")
      : "暂无带推进备注的前篇。",
    "",
    "系列核心人物当前状态：",
    characters.length > 0 ? characters.join("\n") : "暂无系列核心人物记录。",
  ].join("\n");
}

function formatCharacter(character: SeriesContextCharacter) {
  const details = [
    character.roleInSeries ? `职责：${clip(character.roleInSeries, 220)}` : "",
    character.identity ? `身份：${clip(character.identity, 320)}` : "",
    character.accumulatedState
      ? `累计状态：${clip(character.accumulatedState, 700)}`
      : "",
    character.relationshipState
      ? `关系：${clip(character.relationshipState, 700)}`
      : "",
    character.knownInformation
      ? `已知边界：${clip(character.knownInformation, 700)}`
      : "",
    character.recurringRules
      ? `复现规则：${clip(character.recurringRules, 700)}`
      : "",
  ].filter(Boolean);

  return details.length > 0
    ? `- ${clip(character.name, 120)}；${details.join("；")}`
    : "";
}

function clip(value?: string | null, limit = 1200) {
  const normalized = value?.trim() ?? "";
  return normalized.length <= limit
    ? normalized
    : `${normalized.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

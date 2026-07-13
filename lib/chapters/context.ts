import {
  type ChapterBeatChapterContext,
  type ChapterBeatContextInput,
} from "@/lib/ai/chapter-beats";
import {
  type ChapterDraftChapterContext,
  type ChapterDraftContextInput,
} from "@/lib/ai/chapter-drafts";
import {
  type ChapterPolishChapterContext,
  type ChapterPolishContextInput,
} from "@/lib/ai/chapter-polishes";
import {
  type ChapterSummaryChapterContext,
  type ChapterSummaryContextInput,
} from "@/lib/ai/chapter-summaries";
import { selectRelevantCharacters } from "@/lib/ai/context-priority";
import { findForeshadowRecoveryReminders } from "@/lib/foreshadows/recovery-reminders";
import { selectForeshadowsForChapterRecoveryAudit } from "@/lib/foreshadows/recovery-audit";
import { selectRelevantOutlinesForChapter } from "@/lib/outline-fields";
import { prisma } from "@/lib/prisma";
import { loadShortStorySeriesContext } from "@/lib/short-story-series/context";

export class ChapterContextNotFoundError extends Error {
  constructor(message = "章节不存在。") {
    super(message);
    this.name = "ChapterContextNotFoundError";
  }
}

export async function loadChapterBeatContext(
  projectId: string,
  chapterId: string,
): Promise<ChapterBeatContextInput> {
  const chapter = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
      projectId,
    },
    include: {
      project: {
        select: {
          title: true,
          workType: true,
          genre: true,
          targetAudience: true,
          platform: true,
          totalWordTarget: true,
          chapterWordMin: true,
          chapterWordMax: true,
          description: true,
          wechatPositioning: true,
          shortStoryBlueprint: true,
        },
      },
    },
  });

  if (!chapter) {
    throw new ChapterContextNotFoundError();
  }
  const shortStoryProject = chapter.project.workType === "short_story";

  const [
    setting,
    outlines,
    characters,
    recentChapters,
    previousChapter,
    dueForeshadows,
    seriesContext,
  ] = await Promise.all([
    prisma.projectSetting.findUnique({
      where: {
        projectId,
      },
    }),
    shortStoryProject
      ? Promise.resolve([])
      : prisma.outline.findMany({
          where: {
            projectId,
            status: {
              not: "archived",
            },
          },
          orderBy: [
            {
              level: "asc",
            },
            {
              sortOrder: "asc",
            },
            {
              createdAt: "asc",
            },
          ],
        }),
    prisma.character.findMany({
      where: {
        projectId,
        status: "active",
      },
    }),
    prisma.chapter.findMany({
      where: {
        projectId,
        chapterNumber: {
          lt: chapter.chapterNumber,
        },
      },
      orderBy: {
        chapterNumber: "desc",
      },
      take: 3,
    }),
    prisma.chapter.findFirst({
      where: {
        projectId,
        chapterNumber: {
          lt: chapter.chapterNumber,
        },
      },
      orderBy: {
        chapterNumber: "desc",
      },
    }),
    findForeshadowRecoveryReminders({
      projectId,
      currentChapterNumber: chapter.chapterNumber,
    }),
    shortStoryProject
      ? loadShortStorySeriesContext(projectId)
      : Promise.resolve(null),
  ]);

  return {
    project: chapter.project,
    blueprint: chapter.project.shortStoryBlueprint,
    setting,
    chapter: pickChapterContext(chapter),
    outlines: selectRelevantOutlinesForChapter(outlines, chapter.chapterNumber),
    characters: selectRelevantCharacters(
      characters,
      chapterRelevanceText(chapter),
      8,
    ),
    recentChapters: recentChapters.map(pickChapterContext).reverse(),
    previousChapter: previousChapter ? pickChapterContext(previousChapter) : null,
    dueForeshadows,
    seriesContext,
  };
}

export async function loadChapterDraftContext(
  projectId: string,
  chapterId: string,
): Promise<ChapterDraftContextInput> {
  const chapter = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
      projectId,
    },
    include: {
      project: {
        select: {
          title: true,
          workType: true,
          genre: true,
          targetAudience: true,
          platform: true,
          totalWordTarget: true,
          chapterWordMin: true,
          chapterWordMax: true,
          description: true,
          wechatPositioning: true,
          shortStoryBlueprint: true,
        },
      },
    },
  });

  if (!chapter) {
    throw new ChapterContextNotFoundError();
  }
  const shortStoryProject = chapter.project.workType === "short_story";

  const [setting, outlines, characters, previousChapter, seriesContext] =
    await Promise.all([
      prisma.projectSetting.findUnique({
        where: {
          projectId,
        },
      }),
      shortStoryProject
        ? Promise.resolve([])
        : prisma.outline.findMany({
            where: {
              projectId,
              status: {
                not: "archived",
              },
            },
            orderBy: [
              {
                level: "asc",
              },
              {
                sortOrder: "asc",
              },
              {
                createdAt: "asc",
              },
            ],
          }),
      prisma.character.findMany({
        where: {
          projectId,
          status: "active",
        },
      }),
      prisma.chapter.findFirst({
        where: {
          projectId,
          chapterNumber: {
            lt: chapter.chapterNumber,
          },
        },
        orderBy: {
          chapterNumber: "desc",
        },
      }),
      shortStoryProject
        ? loadShortStorySeriesContext(projectId)
        : Promise.resolve(null),
    ]);

  return {
    project: chapter.project,
    blueprint: chapter.project.shortStoryBlueprint,
    setting,
    chapter: pickChapterDraftContext(chapter),
    outlines: selectRelevantOutlinesForChapter(outlines, chapter.chapterNumber),
    characters: selectRelevantCharacters(
      characters,
      chapterRelevanceText(chapter),
      8,
    ),
    previousChapter: previousChapter
      ? pickChapterDraftContext(previousChapter)
      : null,
    seriesContext,
  };
}

export async function loadChapterPolishContext(
  projectId: string,
  chapterId: string,
): Promise<ChapterPolishContextInput> {
  const chapter = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
      projectId,
    },
    include: {
      project: {
        select: {
          title: true,
          workType: true,
          genre: true,
          targetAudience: true,
          platform: true,
          chapterWordMin: true,
          chapterWordMax: true,
          description: true,
          wechatPositioning: true,
          shortStoryBlueprint: true,
        },
      },
    },
  });

  if (!chapter) {
    throw new ChapterContextNotFoundError();
  }

  const [setting, characters, seriesContext] = await Promise.all([
    prisma.projectSetting.findUnique({
      where: {
        projectId,
      },
    }),
    prisma.character.findMany({
      where: {
        projectId,
        status: "active",
      },
    }),
    chapter.project.workType === "short_story"
      ? loadShortStorySeriesContext(projectId)
      : Promise.resolve(null),
  ]);

  return {
    project: chapter.project,
    blueprint: chapter.project.shortStoryBlueprint,
    setting,
    chapter: pickChapterPolishContext(chapter),
    characters: selectRelevantCharacters(
      characters,
      chapterRelevanceText(chapter),
      12,
    ),
    seriesContext,
  };
}

export async function loadChapterSummaryContext(
  projectId: string,
  chapterId: string,
): Promise<ChapterSummaryContextInput> {
  const chapter = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
      projectId,
    },
    include: {
      project: {
        select: {
          title: true,
          genre: true,
          targetAudience: true,
          platform: true,
          description: true,
          wechatPositioning: true,
        },
      },
    },
  });

  if (!chapter) {
    throw new ChapterContextNotFoundError();
  }

  const [setting, characters, foreshadows] = await Promise.all([
    prisma.projectSetting.findUnique({
      where: {
        projectId,
      },
    }),
    prisma.character.findMany({
      where: {
        projectId,
        status: "active",
      },
    }),
    prisma.foreshadow.findMany({
      where: {
        projectId,
        status: {
          in: ["planted", "advancing", "needs_attention"],
        },
      },
      select: {
        id: true,
        content: true,
        status: true,
        importance: true,
        expectedResolveChapter: true,
        plantedChapterId: true,
        plantedChapter: {
          select: {
            chapterNumber: true,
          },
        },
      },
    }),
  ]);

  const summaryChapter = pickChapterSummaryContext(chapter);
  const recoveryCandidates = selectForeshadowsForChapterRecoveryAudit({
    chapterNumber: chapter.chapterNumber,
    finalText: chapter.finalText?.trim() ?? "",
    foreshadows: foreshadows.map((foreshadow) => ({
      id: foreshadow.id,
      content: foreshadow.content,
      status: foreshadow.status,
      importance: foreshadow.importance,
      expectedResolveChapter: foreshadow.expectedResolveChapter,
      plantedChapterId: foreshadow.plantedChapterId,
      plantedChapterNumber: foreshadow.plantedChapter?.chapterNumber ?? null,
    })),
  });

  return {
    project: chapter.project,
    setting,
    chapter: summaryChapter,
    characters: selectRelevantCharacters(
      characters,
      chapterRelevanceText(chapter),
      12,
    ),
    foreshadows: recoveryCandidates,
  };
}

function pickChapterSummaryContext(chapter: ChapterSummaryChapterContext) {
  return {
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    goal: chapter.goal,
    beats: chapter.beats,
    draftText: chapter.draftText,
    polishedText: chapter.polishedText,
    finalText: chapter.finalText,
    notes: chapter.notes,
  };
}

function pickChapterPolishContext(chapter: ChapterPolishChapterContext) {
  return {
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    goal: chapter.goal,
    beats: chapter.beats,
    unitSceneMovement: chapter.unitSceneMovement,
    unitConflict: chapter.unitConflict,
    unitTurn: chapter.unitTurn,
    unitPayoffMovement: chapter.unitPayoffMovement,
    unitWordTarget: chapter.unitWordTarget,
    draftText: chapter.draftText,
    polishedText: chapter.polishedText,
    finalText: chapter.finalText,
    notes: chapter.notes,
  };
}

function pickChapterDraftContext(chapter: ChapterDraftChapterContext) {
  return {
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    goal: chapter.goal,
    beats: chapter.beats,
    unitSceneMovement: chapter.unitSceneMovement,
    unitConflict: chapter.unitConflict,
    unitTurn: chapter.unitTurn,
    unitPayoffMovement: chapter.unitPayoffMovement,
    unitWordTarget: chapter.unitWordTarget,
    draftText: chapter.draftText,
    polishedText: chapter.polishedText,
    finalText: chapter.finalText,
    notes: chapter.notes,
  };
}

function pickChapterContext(chapter: ChapterBeatChapterContext) {
  return {
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    goal: chapter.goal,
    beats: chapter.beats,
    unitSceneMovement: chapter.unitSceneMovement,
    unitConflict: chapter.unitConflict,
    unitTurn: chapter.unitTurn,
    unitPayoffMovement: chapter.unitPayoffMovement,
    unitWordTarget: chapter.unitWordTarget,
    draftText: chapter.draftText,
    polishedText: chapter.polishedText,
    finalText: chapter.finalText,
    notes: chapter.notes,
  };
}

function chapterRelevanceText(chapter: {
  title?: string | null;
  goal?: string | null;
  beats?: string | null;
  unitSceneMovement?: string | null;
  unitConflict?: string | null;
  unitTurn?: string | null;
  unitPayoffMovement?: string | null;
  draftText?: string | null;
  polishedText?: string | null;
  finalText?: string | null;
  notes?: string | null;
}) {
  return [
    chapter.title,
    chapter.goal,
    chapter.beats,
    chapter.unitSceneMovement,
    chapter.unitConflict,
    chapter.unitTurn,
    chapter.unitPayoffMovement,
    chapter.finalText,
    chapter.polishedText,
    chapter.draftText,
    chapter.notes,
  ]
    .filter(Boolean)
    .join("\n");
}

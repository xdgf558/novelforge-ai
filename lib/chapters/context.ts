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
import { loadReaderFeedbackSignalsForChapterGeneration } from "@/lib/ai/reader-feedback-signal-store";
import { selectRelevantCharacters } from "@/lib/ai/context-priority";
import { findForeshadowRecoveryReminders } from "@/lib/foreshadows/recovery-reminders";
import { selectRelevantOutlinesForChapter } from "@/lib/outline-fields";
import { prisma } from "@/lib/prisma";

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
          genre: true,
          targetAudience: true,
          platform: true,
          totalWordTarget: true,
          chapterWordMin: true,
          chapterWordMax: true,
          description: true,
          wechatPositioning: true,
        },
      },
    },
  });

  if (!chapter) {
    throw new ChapterContextNotFoundError();
  }

  const [
    setting,
    outlines,
    characters,
    recentChapters,
    previousChapter,
    readerFeedbackSignals,
    dueForeshadows,
  ] = await Promise.all([
    prisma.projectSetting.findUnique({
      where: {
        projectId,
      },
    }),
    prisma.outline.findMany({
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
    loadReaderFeedbackSignalsForChapterGeneration({
      projectId,
      beforeChapterNumber: chapter.chapterNumber,
    }),
    findForeshadowRecoveryReminders({
      projectId,
      currentChapterNumber: chapter.chapterNumber,
    }),
  ]);

  return {
    project: chapter.project,
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
    readerFeedback: readerFeedbackSignals,
    dueForeshadows,
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
          genre: true,
          targetAudience: true,
          platform: true,
          totalWordTarget: true,
          chapterWordMin: true,
          chapterWordMax: true,
          description: true,
          wechatPositioning: true,
        },
      },
    },
  });

  if (!chapter) {
    throw new ChapterContextNotFoundError();
  }

  const [
    setting,
    outlines,
    characters,
    previousChapter,
    readerFeedbackSignals,
  ] = await Promise.all([
    prisma.projectSetting.findUnique({
      where: {
        projectId,
      },
    }),
    prisma.outline.findMany({
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
    loadReaderFeedbackSignalsForChapterGeneration({
      projectId,
      beforeChapterNumber: chapter.chapterNumber,
    }),
  ]);

  return {
    project: chapter.project,
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
    readerFeedback: readerFeedbackSignals,
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
          genre: true,
          targetAudience: true,
          platform: true,
          chapterWordMin: true,
          chapterWordMax: true,
          description: true,
          wechatPositioning: true,
        },
      },
    },
  });

  if (!chapter) {
    throw new ChapterContextNotFoundError();
  }

  const [setting, characters] = await Promise.all([
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
  ]);

  return {
    project: chapter.project,
    setting,
    chapter: pickChapterPolishContext(chapter),
    characters: selectRelevantCharacters(
      characters,
      chapterRelevanceText(chapter),
      12,
    ),
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

  const [setting, characters] = await Promise.all([
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
  ]);

  return {
    project: chapter.project,
    setting,
    chapter: pickChapterSummaryContext(chapter),
    characters: selectRelevantCharacters(
      characters,
      chapterRelevanceText(chapter),
      12,
    ),
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
  draftText?: string | null;
  polishedText?: string | null;
  finalText?: string | null;
  notes?: string | null;
}) {
  return [
    chapter.title,
    chapter.goal,
    chapter.beats,
    chapter.finalText,
    chapter.polishedText,
    chapter.draftText,
    chapter.notes,
  ]
    .filter(Boolean)
    .join("\n");
}

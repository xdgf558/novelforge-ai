import { sumManuscriptWords } from "@/lib/ai/manuscript-word-budget";
import { countChapterWords } from "@/lib/chapter-fields";
import { isCompletedChapterStatus } from "@/lib/outline-progress";

export type ProjectCompletionChapter = {
  finalText?: string | null;
  status?: string | null;
  wordCount?: number | null;
};

export type ProjectCompletionReadiness = {
  canCompleteAndArchive: boolean;
  confirmedChapterCount: number;
  confirmedWords: number;
  missingFinalTextCount: number;
  targetReached: boolean;
  targetWords: number | null;
  totalChapterCount: number;
  unsettledChapterCount: number;
};

export function calculateProjectCompletionReadiness(input: {
  chapters: readonly ProjectCompletionChapter[];
  totalWordTarget?: number | null;
}): ProjectCompletionReadiness {
  const targetWords = positiveInteger(input.totalWordTarget);
  const completedChapters = input.chapters.filter((chapter) =>
    isCompletedChapterStatus(chapter.status),
  );
  const confirmedChapters = completedChapters.filter((chapter) =>
    hasFinalText(chapter.finalText),
  );
  const unsettledChapterCount = input.chapters.filter(
    (chapter) => !isCompletedChapterStatus(chapter.status),
  ).length;
  const missingFinalTextCount = completedChapters.length - confirmedChapters.length;
  const confirmedWords = sumManuscriptWords(
    confirmedChapters.map((chapter) =>
      positiveInteger(chapter.wordCount) ?? countChapterWords(chapter.finalText),
    ),
  );
  const targetReached = targetWords != null && confirmedWords >= targetWords;
  const allChaptersConfirmed =
    input.chapters.length > 0 &&
    unsettledChapterCount === 0 &&
    missingFinalTextCount === 0;

  return {
    canCompleteAndArchive: targetReached && allChaptersConfirmed,
    confirmedChapterCount: confirmedChapters.length,
    confirmedWords,
    missingFinalTextCount,
    targetReached,
    targetWords,
    totalChapterCount: input.chapters.length,
    unsettledChapterCount,
  };
}

function hasFinalText(value?: string | null) {
  return typeof value === "string" && value.trim().length > 0;
}

function positiveInteger(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : null;
}

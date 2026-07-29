export type ManuscriptWordBudget = {
  currentWords: number;
  targetWords: number | null;
  remainingWords: number | null;
  overTargetWords: number;
  progressPercent: number | null;
  estimatedChapterWords: number;
  estimatedChaptersToTarget: number | null;
  targetReached: boolean;
  shouldFinishNextChapter: boolean;
};

const DEFAULT_ESTIMATED_CHAPTER_WORDS = 5000;

export function calculateManuscriptWordBudget(input: {
  currentWords: number;
  targetWords?: number | null;
  chapterCount: number;
  chapterWordMin?: number | null;
  chapterWordMax?: number | null;
}): ManuscriptWordBudget {
  const currentWords = nonNegativeNumber(input.currentWords);
  const targetWords = positiveNumber(input.targetWords);
  const chapterCount = Math.max(0, Math.floor(input.chapterCount));
  const observedChapterWords =
    chapterCount > 0 && currentWords > 0
      ? currentWords / chapterCount
      : null;
  const estimatedChapterWords = Math.max(
    1,
    Math.round(
      positiveNumber(input.chapterWordMax) ??
        observedChapterWords ??
        positiveNumber(input.chapterWordMin) ??
        DEFAULT_ESTIMATED_CHAPTER_WORDS,
    ),
  );
  const remainingWords =
    targetWords == null ? null : Math.max(0, targetWords - currentWords);
  const targetReached =
    targetWords != null && currentWords >= targetWords;

  return {
    currentWords,
    targetWords,
    remainingWords,
    overTargetWords:
      targetWords == null ? 0 : Math.max(0, currentWords - targetWords),
    progressPercent:
      targetWords == null
        ? null
        : Math.round((currentWords / targetWords) * 100),
    estimatedChapterWords,
    estimatedChaptersToTarget:
      remainingWords == null
        ? null
        : remainingWords === 0
          ? 0
          : Math.ceil(remainingWords / estimatedChapterWords),
    targetReached,
    shouldFinishNextChapter:
      remainingWords != null && remainingWords <= estimatedChapterWords,
  };
}

function positiveNumber(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function nonNegativeNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

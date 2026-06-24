import type { OutlineLike } from "./outline-fields";

export type OutlineProgressChapter = {
  chapterNumber: number;
  status: string;
};

export type OutlineProgress = {
  completedChapters: number;
  createdChapters: number;
  expectedChapters: number | null;
  publishedChapters: number;
  statusSuggestion: "planned" | "active" | "completed";
};

export function calculateOutlineProgress(
  outline: OutlineLike,
  chapters: readonly OutlineProgressChapter[],
): OutlineProgress {
  const relevantChapters = chapters.filter((chapter) =>
    chapterBelongsToOutline(chapter.chapterNumber, outline),
  );
  const expectedChapters = outlineExpectedChapterCount(outline);
  const createdChapters = relevantChapters.length;
  const completedChapters = relevantChapters.filter((chapter) =>
    isCompletedChapterStatus(chapter.status),
  ).length;
  const publishedChapters = relevantChapters.filter(
    (chapter) => chapter.status === "published",
  ).length;
  const statusSuggestion =
    expectedChapters && expectedChapters > 0 && completedChapters >= expectedChapters
      ? "completed"
      : createdChapters > 0 || completedChapters > 0
        ? "active"
        : "planned";

  return {
    completedChapters,
    createdChapters,
    expectedChapters,
    publishedChapters,
    statusSuggestion,
  };
}

export function chapterBelongsToOutline(
  chapterNumber: number,
  outline: OutlineLike,
) {
  if (outline.level === "chapter") {
    return outline.chapterNumber === chapterNumber;
  }

  const start = outline.startChapter ?? null;
  const end = outline.endChapter ?? null;

  if (start != null && chapterNumber < start) {
    return false;
  }

  if (end != null && chapterNumber > end) {
    return false;
  }

  return start != null || end != null;
}

export function outlineExpectedChapterCount(outline: OutlineLike) {
  if (outline.level === "chapter") {
    return outline.chapterNumber ? 1 : null;
  }

  if (outline.startChapter && outline.endChapter) {
    return Math.max(0, outline.endChapter - outline.startChapter + 1);
  }

  return outline.expectedChapters ?? null;
}

export function isCompletedChapterStatus(status?: string | null) {
  return status === "final" || status === "published";
}

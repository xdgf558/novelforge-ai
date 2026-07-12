import type { OutlineLike } from "@/lib/outline-fields";
import {
  calculateOutlineProgress,
  resolveOutlineLifecycleStatus,
  type OutlineProgressChapter,
} from "@/lib/outline-progress";

export type NextUnitPlanningReminder = {
  completedUnitCount: number;
  nextChapterNumber: number;
};

export function findNextUnitPlanningReminder({
  chapters,
  outlines,
  readyToFinish,
}: {
  chapters: readonly OutlineProgressChapter[];
  outlines: readonly OutlineLike[];
  readyToFinish: boolean;
}): NextUnitPlanningReminder | null {
  if (readyToFinish) {
    return null;
  }

  const units = outlines.filter(
    (outline) => outline.level === "unit" && outline.status !== "archived",
  );

  if (units.length === 0) {
    return null;
  }

  const allUnitsCompleted = units.every((outline) => {
    const progress = calculateOutlineProgress(outline, chapters);

    return resolveOutlineLifecycleStatus(outline, progress) === "completed";
  });

  if (!allUnitsCompleted) {
    return null;
  }

  const latestCoveredChapter = Math.max(
    0,
    ...chapters.map((chapter) => chapter.chapterNumber),
    ...units.map(
      (outline) => outline.endChapter ?? outline.startChapter ?? 0,
    ),
  );

  return {
    completedUnitCount: units.length,
    nextChapterNumber: latestCoveredChapter + 1,
  };
}

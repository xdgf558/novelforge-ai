import { describe, expect, it } from "vitest";
import { calculateManuscriptWordBudget } from "./manuscript-word-budget";

describe("manuscript word budget", () => {
  it("requires the next chapter to finish when only one configured chapter fits", () => {
    expect(
      calculateManuscriptWordBudget({
        currentWords: 144696,
        targetWords: 150000,
        chapterCount: 34,
        chapterWordMin: 4000,
        chapterWordMax: 5999,
      }),
    ).toMatchObject({
      remainingWords: 5304,
      estimatedChapterWords: 5999,
      estimatedChaptersToTarget: 1,
      targetReached: false,
      shouldFinishNextChapter: true,
    });
  });

  it("reports an exceeded target as an immediate finish condition", () => {
    expect(
      calculateManuscriptWordBudget({
        currentWords: 151430,
        targetWords: 150000,
        chapterCount: 35,
        chapterWordMax: 5999,
      }),
    ).toMatchObject({
      remainingWords: 0,
      overTargetWords: 1430,
      progressPercent: 101,
      estimatedChaptersToTarget: 0,
      targetReached: true,
      shouldFinishNextChapter: true,
    });
  });

  it("uses observed chapter length when no chapter target is configured", () => {
    expect(
      calculateManuscriptWordBudget({
        currentWords: 90000,
        targetWords: 120000,
        chapterCount: 20,
      }),
    ).toMatchObject({
      estimatedChapterWords: 4500,
      estimatedChaptersToTarget: 7,
      shouldFinishNextChapter: false,
    });
  });
});

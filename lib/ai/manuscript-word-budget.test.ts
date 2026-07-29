import { describe, expect, it } from "vitest";
import {
  calculateManuscriptWordBudget,
  estimateChapterWords,
  sumManuscriptWords,
} from "./manuscript-word-budget";

describe("manuscript word budget", () => {
  it("uses observed pace before the configured range when estimating chapters left", () => {
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
      estimatedChapterWords: 4256,
      estimatedChaptersToTarget: 2,
      targetReached: false,
      shouldFinishNextChapter: false,
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

  it("uses the configured range average when no observed pace exists", () => {
    expect(
      estimateChapterWords({
        currentWords: 0,
        chapterCount: 0,
        chapterWordMin: 2000,
        chapterWordMax: 20000,
      }),
    ).toBe(11000);
  });

  it("does not let a wide configured maximum trigger premature closure", () => {
    expect(
      calculateManuscriptWordBudget({
        currentWords: 90000,
        targetWords: 109000,
        chapterCount: 30,
        chapterWordMin: 2000,
        chapterWordMax: 20000,
      }),
    ).toMatchObject({
      estimatedChapterWords: 3000,
      estimatedChaptersToTarget: 7,
      shouldFinishNextChapter: false,
    });
  });

  it("sums chapter words with the same non-negative rule used by the page", () => {
    expect(sumManuscriptWords([4000, -500, null, 3500])).toBe(7500);
  });
});

import { describe, expect, it } from "vitest";
import {
  recommendShortStoryWritingUnits,
  shortStoryUnitProgress,
} from "./writing-units";

describe("short-story writing-unit recommendations", () => {
  it("uses the configured unit range for a bounded recommendation", () => {
    expect(
      recommendShortStoryWritingUnits({
        totalWordTarget: 30000,
        unitWordMin: 5000,
        unitWordMax: 7000,
      }),
    ).toEqual({
      unitCount: 5,
      unitWordTarget: 6000,
      totalWordTarget: 30000,
      hasConfiguredTotal: true,
    });
  });

  it("never recommends one-shot output or more than twelve units", () => {
    expect(
      recommendShortStoryWritingUnits({ totalWordTarget: 6000 }).unitCount,
    ).toBe(3);
    expect(
      recommendShortStoryWritingUnits({ totalWordTarget: 80000 }).unitCount,
    ).toBe(12);
  });

  it("provides a useful default when the total target is missing", () => {
    expect(recommendShortStoryWritingUnits({})).toEqual({
      unitCount: 5,
      unitWordTarget: 5000,
      totalWordTarget: null,
      hasConfiguredTotal: false,
    });
  });

  it("keeps unusually small configured ranges above a useful floor", () => {
    expect(
      recommendShortStoryWritingUnits({
        totalWordTarget: 6000,
        unitWordMin: 1,
        unitWordMax: 49,
      }),
    ).toMatchObject({
      unitCount: 6,
      unitWordTarget: 1000,
    });
  });

  it("derives progress without allowing negative remaining counts", () => {
    const recommendation = recommendShortStoryWritingUnits({
      totalWordTarget: 30000,
    });

    expect(
      shortStoryUnitProgress({
        completedUnits: 2,
        currentWords: 11000,
        recommendation,
        totalUnits: 8,
      }),
    ).toEqual({
      completedUnits: 2,
      currentWords: 11000,
      recommendedUnitCount: 6,
      remainingRecommendedUnits: 0,
      totalUnits: 8,
      targetWords: 30000,
    });
  });
});

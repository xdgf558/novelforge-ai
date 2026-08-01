import { describe, expect, it } from "vitest";
import { calculateProjectCompletionReadiness } from "./completion";

describe("project completion readiness", () => {
  it("allows a serial project to complete only after its confirmed final text reaches the target", () => {
    const readiness = calculateProjectCompletionReadiness({
      totalWordTarget: 10_000,
      chapters: [
        {
          finalText: "甲".repeat(5_000),
          status: "final",
          wordCount: 5_000,
        },
        {
          finalText: "乙".repeat(5_000),
          status: "published",
          wordCount: 5_000,
        },
      ],
    });

    expect(readiness).toMatchObject({
      canCompleteAndArchive: true,
      confirmedChapterCount: 2,
      confirmedWords: 10_000,
      missingFinalTextCount: 0,
      targetReached: true,
      unsettledChapterCount: 0,
    });
  });

  it("does not count draft text toward the completion target and blocks unsettled chapters", () => {
    const readiness = calculateProjectCompletionReadiness({
      totalWordTarget: 10_000,
      chapters: [
        {
          finalText: "甲".repeat(5_000),
          status: "final",
          wordCount: 5_000,
        },
        {
          finalText: "乙".repeat(5_000),
          status: "draft",
          wordCount: 5_000,
        },
      ],
    });

    expect(readiness).toMatchObject({
      canCompleteAndArchive: false,
      confirmedWords: 5_000,
      targetReached: false,
      unsettledChapterCount: 1,
    });
  });

  it("blocks completion when a completed chapter has no formal final text", () => {
    const readiness = calculateProjectCompletionReadiness({
      totalWordTarget: 10_000,
      chapters: [
        {
          finalText: "甲".repeat(10_000),
          status: "published",
          wordCount: 10_000,
        },
        {
          finalText: " ",
          status: "final",
          wordCount: 2_000,
        },
      ],
    });

    expect(readiness).toMatchObject({
      canCompleteAndArchive: false,
      confirmedWords: 10_000,
      missingFinalTextCount: 1,
      targetReached: true,
    });
  });

  it("falls back to the stored final text when legacy word counts are missing", () => {
    const readiness = calculateProjectCompletionReadiness({
      totalWordTarget: 4,
      chapters: [
        {
          finalText: "甲 乙\n丙丁",
          status: "final",
          wordCount: 0,
        },
      ],
    });

    expect(readiness).toMatchObject({
      canCompleteAndArchive: true,
      confirmedWords: 4,
    });
  });
});

import { describe, expect, it } from "vitest";
import {
  calculateOutlineProgress,
  chapterBelongsToOutline,
  outlineExpectedChapterCount,
  resolveOutlineLifecycleStatus,
} from "./outline-progress";

describe("outline progress", () => {
  it("calculates range outline progress from chapter statuses", () => {
    const progress = calculateOutlineProgress(
      {
        level: "unit",
        startChapter: 3,
        endChapter: 6,
      },
      [
        {
          chapterNumber: 2,
          status: "published",
        },
        {
          chapterNumber: 3,
          status: "published",
        },
        {
          chapterNumber: 4,
          status: "final",
        },
        {
          chapterNumber: 5,
          status: "draft",
        },
      ],
    );

    expect(progress).toEqual({
      completedChapters: 2,
      createdChapters: 3,
      expectedChapters: 4,
      publishedChapters: 1,
      statusSuggestion: "active",
    });
  });

  it("marks an outline completed when every expected chapter is final or published", () => {
    const progress = calculateOutlineProgress(
      {
        level: "volume",
        startChapter: 1,
        endChapter: 2,
      },
      [
        {
          chapterNumber: 1,
          status: "final",
        },
        {
          chapterNumber: 2,
          status: "published",
        },
      ],
    );

    expect(progress.statusSuggestion).toBe("completed");
    expect(progress.completedChapters).toBe(2);
    expect(progress.publishedChapters).toBe(1);
  });

  it("resolves stale stored labels from deterministic chapter progress", () => {
    const outline = {
      level: "unit",
      status: "active",
      startChapter: 1,
      endChapter: 2,
    };
    const progress = calculateOutlineProgress(outline, [
      { chapterNumber: 1, status: "final" },
      { chapterNumber: 2, status: "published" },
    ]);

    expect(resolveOutlineLifecycleStatus(outline, progress)).toBe("completed");
  });

  it("preserves archived and manually completed open-ended outlines", () => {
    expect(
      resolveOutlineLifecycleStatus(
        { level: "unit", status: "archived", startChapter: 1, endChapter: 2 },
        {
          completedChapters: 2,
          createdChapters: 2,
          expectedChapters: 2,
          publishedChapters: 2,
          statusSuggestion: "completed",
        },
      ),
    ).toBe("archived");
    expect(
      resolveOutlineLifecycleStatus(
        { level: "unit", status: "completed", startChapter: 1 },
        {
          completedChapters: 1,
          createdChapters: 1,
          expectedChapters: null,
          publishedChapters: 0,
          statusSuggestion: "active",
        },
      ),
    ).toBe("completed");
  });

  it("supports chapter outlines and open-ended ranges", () => {
    expect(
      chapterBelongsToOutline(8, {
        level: "chapter",
        chapterNumber: 8,
      }),
    ).toBe(true);
    expect(
      chapterBelongsToOutline(9, {
        level: "chapter",
        chapterNumber: 8,
      }),
    ).toBe(false);
    expect(
      chapterBelongsToOutline(12, {
        level: "unit",
        startChapter: 10,
      }),
    ).toBe(true);
    expect(
      chapterBelongsToOutline(9, {
        level: "unit",
        startChapter: 10,
      }),
    ).toBe(false);
  });

  it("infers expected chapter counts from range or explicit expectedChapters", () => {
    expect(
      outlineExpectedChapterCount({
        level: "chapter",
        chapterNumber: 5,
      }),
    ).toBe(1);
    expect(
      outlineExpectedChapterCount({
        level: "unit",
        startChapter: 3,
        endChapter: 10,
      }),
    ).toBe(8);
    expect(
      outlineExpectedChapterCount({
        level: "volume",
        expectedChapters: 30,
      }),
    ).toBe(30);
  });
});

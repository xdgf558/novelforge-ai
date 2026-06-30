import type { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  chapterBelongsToExplicitStorylineRange,
  chapterIdsInExplicitStorylineRange,
  mergeChapterRelationIds,
} from "@/lib/storyline-auto-relations";

describe("storyline auto relations", () => {
  it("matches chapters only when a storyline has an explicit start and end range", () => {
    expect(
      chapterBelongsToExplicitStorylineRange(7, {
        startChapter: 3,
        endChapter: 10,
      }),
    ).toBe(true);
    expect(
      chapterBelongsToExplicitStorylineRange(2, {
        startChapter: 3,
        endChapter: 10,
      }),
    ).toBe(false);
    expect(
      chapterBelongsToExplicitStorylineRange(7, {
        startChapter: 3,
        endChapter: null,
      }),
    ).toBe(false);
    expect(
      chapterBelongsToExplicitStorylineRange(7, {
        startChapter: null,
        endChapter: 10,
      }),
    ).toBe(false);
  });

  it("merges manual and auto-linked chapter ids without duplicates", () => {
    expect(
      mergeChapterRelationIds(
        ["chapter_1", "chapter_3"],
        ["chapter_2", "chapter_3"],
      ),
    ).toEqual(["chapter_1", "chapter_3", "chapter_2"]);
  });

  it("does not query chapters when the storyline range is incomplete", async () => {
    const tx = {
      chapter: {
        findMany: vi.fn(),
      },
    } as unknown as Prisma.TransactionClient;

    await expect(
      chapterIdsInExplicitStorylineRange(tx, "project_1", {
        startChapter: 3,
        endChapter: null,
      }),
    ).resolves.toEqual([]);
    await expect(
      chapterIdsInExplicitStorylineRange(tx, "project_1", {
        startChapter: null,
        endChapter: 10,
      }),
    ).resolves.toEqual([]);

    expect(tx.chapter.findMany).not.toHaveBeenCalled();
  });
});

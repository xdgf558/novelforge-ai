import { describe, expect, it } from "vitest";
import {
  chapterBelongsToExplicitStorylineRange,
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
});

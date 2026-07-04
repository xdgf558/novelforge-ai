import { describe, expect, it } from "vitest";
import { latestStationCatChapterOptions } from "./chapter-options";

describe("latestStationCatChapterOptions", () => {
  it("keeps only the latest five chapter-number options in reading order", () => {
    const options = Array.from({ length: 7 }, (_, index) => {
      const chapterNumber = index + 1;

      return {
        id: `chapter-${chapterNumber}`,
        chapterNumber,
        title: `第 ${chapterNumber} 章`,
      };
    });

    expect(latestStationCatChapterOptions(options).map((option) => option.id)).toEqual([
      "chapter-3",
      "chapter-4",
      "chapter-5",
      "chapter-6",
      "chapter-7",
    ]);
  });

  it("does not mutate the original chapter option order", () => {
    const options = [
      { id: "chapter-3", chapterNumber: 3, title: "三" },
      { id: "chapter-1", chapterNumber: 1, title: "一" },
      { id: "chapter-2", chapterNumber: 2, title: "二" },
    ];

    latestStationCatChapterOptions(options, 2);

    expect(options.map((option) => option.id)).toEqual([
      "chapter-3",
      "chapter-1",
      "chapter-2",
    ]);
  });
});

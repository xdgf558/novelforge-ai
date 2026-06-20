import { describe, expect, it } from "vitest";
import {
  outlineRangeLabel,
  outlineSnapshot,
  outlineValuesFromRecord,
  selectRelevantOutlinesForChapter,
} from "./outline-fields";

describe("outline fields", () => {
  it("normalizes outline records and infers sort order", () => {
    const values = outlineValuesFromRecord({
      level: "chapter",
      title: " 第三章 ",
      chapterNumber: 3,
      goal: " 推进培训班冲突 ",
    });

    expect(outlineSnapshot(values)).toMatchObject({
      level: "chapter",
      title: "第三章",
      chapterNumber: 3,
      sortOrder: 3,
      goal: "推进培训班冲突",
    });
  });

  it("selects volume, unit, and chapter outlines relevant to a chapter", () => {
    const outlines = [
      {
        level: "volume",
        title: "第一卷",
        startChapter: 1,
        endChapter: 20,
      },
      {
        level: "unit",
        title: "培训班破局",
        startChapter: 2,
        endChapter: 5,
      },
      {
        level: "chapter",
        title: "第二章",
        chapterNumber: 2,
      },
      {
        level: "chapter",
        title: "第七章",
        chapterNumber: 7,
      },
    ];

    expect(selectRelevantOutlinesForChapter(outlines, 2).map((item) => item.title))
      .toEqual(["第一卷", "培训班破局", "第二章"]);
    expect(outlineRangeLabel(outlines[1])).toBe("第 2-5 章");
  });
});

import { describe, expect, it } from "vitest";
import {
  outlineRangeLabel,
  outlineSnapshot,
  outlineValuesFromRecord,
  selectRelevantOutlinesForChapter,
  validateOutlineValues,
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

  it("prefers the most specific overlapping outline for the same level", () => {
    const outlines = [
      {
        level: "unit",
        title: "长期县城起势",
        startChapter: 1,
        sortOrder: 1,
      },
      {
        level: "unit",
        title: "电脑城正面对抗",
        startChapter: 20,
        endChapter: 30,
        sortOrder: 20,
      },
      {
        level: "unit",
        title: "更宽泛的中段",
        startChapter: 15,
        endChapter: 45,
        status: "active",
        sortOrder: 15,
      },
    ];

    expect(selectRelevantOutlinesForChapter(outlines, 25).map((item) => item.title))
      .toEqual(["电脑城正面对抗", "更宽泛的中段"]);
  });

  it("validates outline ranges and chapter outline numbers", () => {
    const base = outlineValuesFromRecord({
      title: "大纲",
      level: "unit",
    });

    expect(
      validateOutlineValues({
        ...base,
        startChapter: 10,
        endChapter: 5,
      }),
    ).toBe("invalidChapterRange");
    expect(
      validateOutlineValues({
        ...base,
        level: "chapter",
        chapterNumber: null,
      }),
    ).toBe("missingChapterNumber");
    expect(
      validateOutlineValues({
        ...base,
        startChapter: 5,
        endChapter: 10,
      }),
    ).toBeNull();
  });
});

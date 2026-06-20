import { describe, expect, it } from "vitest";
import {
  chapterFieldNames,
  chapterSnapshot,
  chapterStatusLabel,
  chapterTextFields,
  chapterValuesFromRecord,
  countChapterWords,
  emptyChapterValues,
  formatChapterWordCount,
} from "./chapter-fields";

describe("chapter fields", () => {
  it("keeps text fields inside the full chapter field list", () => {
    const fullFieldNameSet = new Set(chapterFieldNames);

    expect(chapterTextFields.every((field) => fullFieldNameSet.has(field.name))).toBe(
      true,
    );
  });

  it("creates an empty value object for every chapter field", () => {
    const values = emptyChapterValues();

    expect(Object.keys(values).sort()).toEqual([...chapterFieldNames].sort());
    expect(values.chapterNumber).toBe(1);
    expect(values.status).toBe("draft");
    expect(values.wordCount).toBe(0);
  });

  it("creates form values from a data-driven chapter record", () => {
    const values = chapterValuesFromRecord({
      chapterNumber: 3,
      title: "雨夜借命",
      status: "revising",
      goal: "揭开契约线索",
      notes: null,
      wordCount: 1888,
    });

    expect(values.chapterNumber).toBe(3);
    expect(values.title).toBe("雨夜借命");
    expect(values.status).toBe("revising");
    expect(values.goal).toBe("揭开契约线索");
    expect(values.notes).toBe("");
    expect(values.wordCount).toBe(1888);
    expect(Object.keys(values).sort()).toEqual([...chapterFieldNames].sort());
  });

  it("keeps defaults for missing or null chapter record fields", () => {
    const values = chapterValuesFromRecord({
      chapterNumber: null,
      title: "雨夜借命",
      wordCount: null,
    });

    expect(values.chapterNumber).toBe(1);
    expect(values.title).toBe("雨夜借命");
    expect(values.wordCount).toBe(0);
    expect(Object.keys(values).sort()).toEqual([...chapterFieldNames].sort());
  });

  it("labels known and unknown chapter statuses explicitly", () => {
    expect(chapterStatusLabel("draft")).toBe("草稿");
    expect(chapterStatusLabel("revising")).toBe("修订中");
    expect(chapterStatusLabel("final")).toBe("已定稿");
    expect(chapterStatusLabel("published")).toBe("已发布");
    expect(chapterStatusLabel("invalid-status")).toBe("未知");
    expect(chapterStatusLabel("")).toBe("未知");
  });

  it("counts words from final, polished, then draft text and ignores whitespace", () => {
    expect(countChapterWords(" 定 稿\n正文 ", " 精修正文 ", " 草稿正文很长 ")).toBe(4);
    expect(countChapterWords("", " 精 修\n正文 ", " 草稿正文很长 ")).toBe(4);
    expect(countChapterWords("", "", " 草稿\n正文 ")).toBe(4);
  });

  it("formats missing chapter word counts as uncounted", () => {
    expect(formatChapterWordCount(0)).toBe("未统计");
    expect(formatChapterWordCount(null)).toBe("未统计");
    expect(formatChapterWordCount(12000)).toBe("12,000 字");
  });

  it("trims snapshots and recomputes word count while preserving every field", () => {
    const values = emptyChapterValues();
    values.chapterNumber = 2;
    values.title = " 雨夜借命 ";
    values.status = " final ";
    values.draftText = " 草稿正文 ";
    values.polishedText = " 精修正文 ";
    values.finalText = " 定 稿\n正文 ";
    values.notes = " 伏笔：短信来源 ";
    values.wordCount = 9999;

    const snapshot = chapterSnapshot(values);

    expect(snapshot).toMatchObject({
      chapterNumber: 2,
      title: "雨夜借命",
      status: "final",
      draftText: "草稿正文",
      polishedText: "精修正文",
      finalText: "定 稿\n正文",
      notes: "伏笔：短信来源",
      wordCount: 4,
    });
    expect(Object.keys(snapshot).sort()).toEqual([...chapterFieldNames].sort());
  });
});

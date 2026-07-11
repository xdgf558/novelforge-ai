import { describe, expect, it } from "vitest";
import {
  buildShortStoryManuscriptExport,
  normalizeShortStoryManuscriptUnit,
  shortStorySigningWordMaximum,
  shortStorySigningWordMinimum,
} from "./manuscript-export";

const units = [
  {
    id: "unit_2",
    chapterNumber: 2,
    title: "停电之后",
    status: "published",
    finalText: [
      "停电之后",
      "",
      "场景推进：进入档案室。",
      "",
      "林晚在档案柜后找到了录音带。",
      "",
      "她终于听见姐姐当年的声音。",
      "",
      "下章预告：母亲将坦白。",
    ].join("\n"),
  },
  {
    id: "unit_1",
    chapterNumber: 1,
    title: "死者来信",
    status: "final",
    finalText: [
      "# 写作单元 1《死者来信》",
      "",
      "单元目标：建立七封来信的异常。",
      "",
      "林晚拆开第七封信，纸上只写着今晚会停电。",
      "",
      "窗外的灯在她读完最后一个字时熄灭。",
      "",
      "未完待续",
    ].join("\n"),
  },
  {
    id: "unit_3",
    chapterNumber: 3,
    title: "尚未定稿",
    status: "revising",
    finalText: "这段不应进入成稿。",
  },
];

describe("short-story manuscript export", () => {
  it("merges only confirmed units in story order and removes work traces", () => {
    const original = structuredClone(units);
    const result = buildShortStoryManuscriptExport({
      projectTitle: "死者寄来的第七封信",
      units,
    });

    expect(result.includedUnits.map((unit) => unit.id)).toEqual([
      "unit_1",
      "unit_2",
    ]);
    expect(result.omittedUnits).toEqual([
      expect.objectContaining({ id: "unit_3", reason: "not_confirmed" }),
    ]);
    expect(result.plainText).not.toContain("写作单元 1");
    expect(result.plainText).not.toContain("单元目标");
    expect(result.plainText).not.toContain("场景推进");
    expect(result.plainText).not.toContain("未完待续");
    expect(result.plainText).not.toContain("下章预告");
    expect(result.plainText.indexOf("林晚拆开")).toBeLessThan(
      result.plainText.indexOf("林晚在档案柜后"),
    );
    expect(units).toEqual(original);
  });

  it("supports separator and retained-short-heading modes", () => {
    const separatorExport = buildShortStoryManuscriptExport({
      headingMode: "separators",
      projectTitle: "第七封信",
      units: units.slice(0, 2),
    });
    const headingExport = buildShortStoryManuscriptExport({
      headingMode: "short_headings",
      projectTitle: "第七封信",
      units: units.slice(0, 2),
    });

    expect(separatorExport.plainText.match(/\* \* \*/g)).toHaveLength(1);
    expect(headingExport.plainText).toContain("死者来信\n\n林晚拆开");
    expect(headingExport.plainText).toContain("停电之后\n\n林晚在");
    expect(headingExport.markdown).toContain("# 第七封信");
    expect(headingExport.markdown).toContain("## 死者来信");
    expect(headingExport.markdown).toContain("## 停电之后");
  });

  it("strips duplicate numeric unit titles without changing prose order", () => {
    const body = normalizeShortStoryManuscriptUnit(
      [
        "状态：待作者审核",
        "",
        "**第二单元《案卷》**",
        "",
        "第一段。",
        "",
        "第二段。",
      ].join("\n"),
      { chapterNumber: 2, title: "案卷" },
    );

    expect(body).toBe("第一段。\n\n第二段。");
  });

  it("reports the visible 6,000 to 80,000 word signing range", () => {
    const below = buildShortStoryManuscriptExport({
      projectTitle: "短篇",
      units: [confirmedUnit("字".repeat(shortStorySigningWordMinimum - 1))],
    });
    const within = buildShortStoryManuscriptExport({
      projectTitle: "范围内",
      units: [confirmedUnit("字".repeat(shortStorySigningWordMinimum))],
    });
    const above = buildShortStoryManuscriptExport({
      projectTitle: "超长",
      units: [confirmedUnit("字".repeat(shortStorySigningWordMaximum + 1))],
    });

    expect(below.validation.isBelowSigningRange).toBe(true);
    expect(within.validation.isWithinSigningRange).toBe(true);
    expect(above.validation.isAboveSigningRange).toBe(true);
  });
});

function confirmedUnit(finalText: string) {
  return {
    id: "unit_1",
    chapterNumber: 1,
    title: "正文",
    status: "final",
    finalText,
  };
}

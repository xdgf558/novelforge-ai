import { describe, expect, it } from "vitest";
import {
  buildFanqieLayoutExport,
  buildFanqieSplitManifest,
  countCjkAwareWords,
  normalizeFanqieChapterBody,
  selectFanqieLayoutSource,
  splitFanqieChapterText,
  validateFanqieExport,
} from "./fanqie-layout-export";

const chapter = {
  id: "chapter_7",
  chapterNumber: 7,
  title: "断供",
  draftText: "草稿正文",
  finalText: "定稿正文",
  polishedText: "精修正文",
};

describe("fanqie layout export", () => {
  it("selects polished text before final and draft text", () => {
    expect(selectFanqieLayoutSource(chapter)).toMatchObject({
      kind: "polished",
      label: "精修正文",
      text: "精修正文",
    });

    expect(
      selectFanqieLayoutSource({
        ...chapter,
        polishedText: "",
      }),
    ).toMatchObject({
      kind: "final",
      text: "定稿正文",
    });

    expect(
      selectFanqieLayoutSource({
        ...chapter,
        finalText: "",
        polishedText: "",
      }),
    ).toMatchObject({
      kind: "draft",
      text: "草稿正文",
    });
  });

  it("allows an explicit source kind instead of auto fallback", () => {
    expect(selectFanqieLayoutSource(chapter, "draft")).toMatchObject({
      kind: "draft",
      label: "草稿正文",
      text: "草稿正文",
    });

    expect(
      selectFanqieLayoutSource(
        {
          ...chapter,
          draftText: "",
        },
        "draft",
      ),
    ).toBeNull();
  });

  it("normalizes titles, markdown dividers, completion markers, web tails, and AI outline traces", () => {
    const body = normalizeFanqieChapterBody(
      [
        "# 第7章《断供》",
        "",
        "---",
        "",
        "本章目标：制造配件断供压力。",
        "",
        "节拍一：小周送来目录。",
        "",
        "陈远把目录压在桌角。",
        "",
        "一、清晨的纸袋",
        "",
        "**他看见蓝色圆珠笔写下的恒达代理。**",
        "",
        "方老板没有立刻说话。（第7章完）",
        "",
        "上一章",
        "下一章",
        "保存书签",
      ].join("\n"),
      chapter,
    );

    expect(body).not.toContain("第7章《断供》");
    expect(body).not.toContain("---");
    expect(body).not.toContain("本章目标");
    expect(body).not.toContain("节拍一");
    expect(body).not.toContain("第7章完");
    expect(body).not.toContain("上一章");
    expect(body).not.toContain("下一章");
    expect(body).not.toContain("保存书签");
    expect(body).toContain("陈远把目录压在桌角。");
    expect(body).toContain("一、清晨的纸袋");
    expect(body).toContain("他看见蓝色圆珠笔写下的恒达代理。");
    expect(body).toContain("方老板没有立刻说话。");
  });

  it("does not change the story paragraph order", () => {
    const body = normalizeFanqieChapterBody(
      [
        "第 七 章 断供",
        "",
        "第一段。陈远走进培训班。",
        "",
        "第二段。林巧把登记本递给他。",
        "",
        "第三段。方老板在电话里压低了声音。",
      ].join("\n"),
      chapter,
    );

    expect(body).toBe(
      [
        "第一段。陈远走进培训班。",
        "",
        "第二段。林巧把登记本递给他。",
        "",
        "第三段。方老板在电话里压低了声音。",
      ].join("\n"),
    );
  });

  it("does not remove a narrative opening that only mentions the chapter number", () => {
    const body = normalizeFanqieChapterBody(
      [
        "第七章之后，罗文斌第一次把电话打到了培训班。",
        "",
        "陈远听见铃声时，林巧刚把登记本合上。",
      ].join("\n"),
      chapter,
    );

    expect(body).toContain("第七章之后，罗文斌第一次把电话打到了培训班。");
    expect(body).toContain("陈远听见铃声时，林巧刚把登记本合上。");
  });

  it("keeps author-written section headings and contrast labels that may be prose", () => {
    const body = normalizeFanqieChapterBody(
      [
        "一、清晨",
        "",
        "反转：他没有走。",
        "",
        "爽点：方老板终于把电话打给了老周。",
      ].join("\n"),
      chapter,
    );

    expect(body).toContain("一、清晨");
    expect(body).toContain("反转：他没有走。");
    expect(body).toContain("爽点：方老板终于把电话打给了老周。");
  });

  it("builds a body paste export without a title by default", () => {
    const result = buildFanqieLayoutExport({
      chapter,
      projectTitle: "离线未来",
      template: "body",
    });

    expect(result.plainText).toBe("精修正文");
    expect(result.body).toBe("精修正文");
    expect(result.title).toBe("第7章 断供");
    expect(result.filenameBase).toBe("离线未来-chapter-7-fanqie");
    expect(result.validation.sourceLabel).toBe("精修正文");
  });

  it("can include the title only when explicitly requested", () => {
    const result = buildFanqieLayoutExport({
      chapter,
      includeTitle: true,
      projectTitle: "离线未来",
      template: "body",
    });

    expect(result.body).toBe("第7章 断供\n\n精修正文");
  });

  it("validates source artifacts and target word count hints", () => {
    const validation = validateFanqieExport({
      body: "短正文",
      chapter,
      rawText: "# 第7章《断供》\n\n短正文\n\n（第7章完）\n\n保存书签",
      sourceLabel: "精修正文",
      targetWordCount: 4000,
    });

    expect(validation.hasMarkdownArtifacts).toBe(true);
    expect(validation.hasCompletionMarker).toBe(true);
    expect(validation.hasWebTail).toBe(true);
    expect(validation.isBelowSuggestedWordCount).toBe(true);
    expect(validation.messages).toEqual(
      expect.arrayContaining([
        "源正文包含 Markdown 痕迹，导出时会做确定性清理。",
        "源正文包含章节完结标记，导出时会移除。",
        "源正文包含网页阅读尾巴，导出时会移除。",
      ]),
    );
  });

  it("counts CJK characters and latin words together", () => {
    expect(countCjkAwareWords("陈远 checked the list")).toBe(2 + 3);
  });

  it("splits long text without inserting chapter titles into part bodies", () => {
    const text = [
      "一、清晨",
      "",
      repeatSentence("陈远把目录放在桌上。", 50),
      "",
      "二、电话",
      "",
      repeatSentence("方老板在电话里压低声音。", 50),
      "",
      "三、决定",
      "",
      repeatSentence("林巧把登记本推到他面前。", 50),
    ].join("\n");
    const parts = splitFanqieChapterText(text, {
      chapter,
      targetWordCount: 180,
    });

    expect(parts.length).toBeGreaterThan(1);
    expect(parts[0].fileName).toMatch(/^第007章-.+\.txt$/);
    expect(parts[0].body).not.toContain("第7章");
    expect(parts.map((part) => part.body).join("\n\n")).toContain("一、清晨");
    expect(parts.map((part) => part.body).join("\n\n")).toContain("二、电话");
    expect(parts.map((part) => part.body).join("\n\n")).toContain("三、决定");
    expect(parts.map((part) => part.body).join("\n\n")).toContain(
      "陈远把目录放在桌上。",
    );
  });

  it("builds a split manifest with upload guidance", () => {
    const parts = splitFanqieChapterText(
      [repeatSentence("陈远把目录放在桌上。", 50), repeatSentence("方老板点头。", 50)].join(
        "\n\n",
      ),
      {
        chapter,
        targetWordCount: 120,
      },
    );
    const manifest = buildFanqieSplitManifest({
      parts,
      projectTitle: "离线未来",
    });

    expect(manifest).toContain("# 离线未来 番茄版拆分清单");
    expect(manifest).toContain("正文文件默认不含标题");
    expect(manifest).toContain(parts[0].fileName);
  });
});

function repeatSentence(sentence: string, count: number) {
  return Array.from({ length: count }, () => sentence).join("");
}

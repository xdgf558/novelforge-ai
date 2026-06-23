import { describe, expect, it } from "vitest";
import {
  buildWechatLayoutExport,
  defaultWechatEndingFollowHook,
  defaultWechatOpeningGuide,
  normalizeWechatChapterBody,
  selectWechatLayoutSource,
} from "./wechat-layout-export";

const chapter = {
  id: "chapter_3",
  chapterNumber: 3,
  title: "罗文斌的警告",
  draftText: "草稿正文",
  finalText: "定稿正文",
  polishedText: "精修正文",
};

describe("wechat layout export", () => {
  it("selects polished text before final and draft text", () => {
    expect(selectWechatLayoutSource(chapter)).toMatchObject({
      kind: "polished",
      label: "精修正文",
      text: "精修正文",
    });

    expect(
      selectWechatLayoutSource({
        ...chapter,
        polishedText: "",
      }),
    ).toMatchObject({
      kind: "final",
      text: "定稿正文",
    });

    expect(
      selectWechatLayoutSource({
        ...chapter,
        finalText: "",
        polishedText: "",
      }),
    ).toMatchObject({
      kind: "draft",
      text: "草稿正文",
    });
  });

  it("normalizes duplicate chapter titles, dividers, beat headings, and sections", () => {
    const body = normalizeWechatChapterBody(
      [
        "# 第3章《罗文斌的警告》",
        "",
        "---",
        "",
        "## 【开场钩子】节拍1：深夜来电",
        "",
        "电话铃响的时候，陈远刚合上笔记本。",
        "",
        "## 一、第一笔账",
        "",
        "他在纸上写下三个数字。",
        "",
        "**二、风声变紧**",
        "",
        "罗文斌的人已经到了楼下。",
      ].join("\n"),
      chapter,
    );

    expect(body).not.toContain("第3章《罗文斌的警告》");
    expect(body).not.toContain("---");
    expect(body).not.toContain("开场钩子");
    expect(body).toContain("电话铃响的时候，陈远刚合上笔记本。");
    expect(body).toContain("一、第一笔账");
    expect(body).toContain("二、风声变紧");
    expect(body).toMatch(/一、第一笔账\n\n他在纸上写下三个数字。/);
  });

  it("builds a body paste template without title or author", () => {
    const result = buildWechatLayoutExport({
      chapter,
      endingFollowHook: "下一章继续。",
      openingGuide: "本章继续更新。",
      projectTitle: "离线未来",
      template: "body",
    });

    expect(result.plainText).not.toContain("作者：");
    expect(result.plainText).not.toContain("#");
    expect(result.plainText).toBe(["本章继续更新。", "精修正文", "下一章继续。"].join("\n\n"));
    expect(result.markdown).toContain("> 本章继续更新。");
  });

  it("builds a complete template with title and author", () => {
    const result = buildWechatLayoutExport({
      authorName: "少拉",
      chapter,
      endingFollowHook: defaultWechatEndingFollowHook(),
      openingGuide: defaultWechatOpeningGuide({
        chapter,
        projectTitle: "离线未来",
      }),
      projectTitle: "离线未来",
      publishTitle: "重生1999：罗文斌的警告",
      template: "complete",
    });

    expect(result.plainText).toContain("重生1999：罗文斌的警告");
    expect(result.plainText).toContain("作者：少拉");
    expect(result.markdown).toContain("# 重生1999：罗文斌的警告");
    expect(result.html).toContain("<h1>重生1999：罗文斌的警告</h1>");
  });

  it("escapes generated html", () => {
    const result = buildWechatLayoutExport({
      chapter: {
        ...chapter,
        polishedText: "陈远说：<别急> & \"稳住\"",
      },
      projectTitle: "离线未来",
      template: "body",
    });

    expect(result.html).toContain("&lt;别急&gt; &amp; &quot;稳住&quot;");
    expect(result.html).not.toContain("<别急>");
  });
});

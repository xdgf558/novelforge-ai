import { describe, expect, it } from "vitest";
import {
  buildPublishMarkdown,
  parseStoredStringList,
  publishPackageStatusLabel,
} from "./publish-packages";

describe("publish package helpers", () => {
  it("labels publish package statuses", () => {
    expect(publishPackageStatusLabel("draft")).toBe("草稿");
    expect(publishPackageStatusLabel("exported")).toBe("已导出");
    expect(publishPackageStatusLabel("stale")).toBe("未知");
  });

  it("parses stored title/checklist lists from JSON or newline text", () => {
    expect(parseStoredStringList(JSON.stringify(["标题一", "  标题二  "]))).toEqual([
      "标题一",
      "标题二",
    ]);
    expect(parseStoredStringList("检查首屏钩子\n\n检查敏感词")).toEqual([
      "检查首屏钩子",
      "检查敏感词",
    ]);
  });

  it("builds a WeChat-ready Markdown publish body", () => {
    const markdown = buildPublishMarkdown({
      selectedTitle: "第十章：雨夜借命",
      openingGuide: "这一夜，主角终于看见短信背后的代价。",
      chapterSummary: "本章揭开借命契约的第一层真相。",
      finalText: "雨声砸在窗上，倒计时只剩三分钟。",
      endingQuestion: "你觉得短信是谁发来的？",
      nextChapterPreview: "下一章，旧楼里的第二个名字出现。",
      commentGuide: "评论区聊聊你最怀疑的人。",
    });

    expect(markdown).toContain("# 第十章：雨夜借命");
    expect(markdown).toContain("> 本章揭开借命契约的第一层真相。");
    expect(markdown).toContain("雨声砸在窗上");
    expect(markdown).toContain("**互动问题**：你觉得短信是谁发来的？");
    expect(markdown).toContain("**下章预告**：下一章");
    expect(markdown).toContain("**评论区引导**：评论区聊聊");
  });
});

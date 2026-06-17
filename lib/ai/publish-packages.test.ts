import { describe, expect, it } from "vitest";
import {
  buildPublishPackageContext,
  buildPublishPackageContextSummary,
  parsePublishPackageOutput,
} from "./publish-packages";

const baseInput = {
  project: {
    title: "借命人",
    genre: "都市悬疑",
    targetAudience: "公众号男性读者",
    platform: "微信公众号",
    description: "寿命交易背后的地下契约网络。",
    wechatPositioning: "强钩子、短段落、末尾互动。",
  },
  setting: {
    targetAudience: "公众号男性读者",
    forbiddenItems: "不能宣称自动发布。",
    wechatPositioning: "每章末尾留下悬念。",
  },
  chapter: {
    chapterNumber: 12,
    title: "雨夜借命",
    goal: "主角收到死者短信。",
    finalText: "雨声砸在窗上，林野看见手机屏幕上跳出死者的名字。",
    notes: "标题要突出借命和短信。",
  },
  latestSummaryTask: {
    id: "task_summary_1",
    inputContextSummary: "第 12 章摘要",
    outputText: JSON.stringify({ shortSummary: "林野收到死者短信。" }),
    completedAt: new Date("2026-06-17T10:00:00.000Z"),
  },
  recentPublishPackages: [
    {
      selectedTitle: "上一章：死者来信",
      titleCandidatesJson: null,
    },
    {
      selectedTitle: null,
      titleCandidatesJson: JSON.stringify(["旧楼倒计时", "寿命只剩三分钟"]),
    },
  ],
};

describe("publish package AI helpers", () => {
  it("builds a context from final text and publish-relevant memory", () => {
    const context = buildPublishPackageContext(baseInput);

    expect(context.inputText).toContain("第 12 章《雨夜借命》");
    expect(context.inputText).toContain("雨声砸在窗上");
    expect(context.inputText).toContain("公众号男性读者");
    expect(context.inputText).toContain("上一章：死者来信");
    expect(context.inputText).toContain("markdown_body");
    expect(context.inputText).not.toContain("draftText");
    expect(context.inputJson.chapter).toMatchObject({
      chapterNumber: 12,
      title: "雨夜借命",
      finalTextLength: baseInput.chapter.finalText.length,
    });
  });

  it("summarizes publish package context for AI task records", () => {
    expect(buildPublishPackageContextSummary(baseInput)).toBe(
      `第 12 章《雨夜借命》公众号发布包装；定稿 ${baseInput.chapter.finalText.length} 字；包含章节摘要任务；历史标题 3 个`,
    );
  });

  it("parses snake_case model output into a package suggestion", () => {
    const suggestion = parsePublishPackageOutput(
      JSON.stringify({
        title_candidates: ["雨夜里，死者给他发来短信", "借命倒计时开始"],
        opening_guide: "这一次，短信来自不可能的人。",
        chapter_summary: "林野收到死者短信。",
        ending_question: "你觉得死者为什么还能发短信？",
        next_chapter_preview: "下一章，旧楼出现第二个名字。",
        comment_guide: "评论区留下你怀疑的角色。",
        collection_title: "借命人连载",
        cover_prompt: "雨夜旧楼，手机冷光，悬疑氛围。",
        markdown_body: "# 发布正文",
        checklist: ["标题不剧透", "结尾有互动"],
      }),
    );

    expect(suggestion).toMatchObject({
      titleCandidates: ["雨夜里，死者给他发来短信", "借命倒计时开始"],
      selectedTitle: "雨夜里，死者给他发来短信",
      openingGuide: "这一次，短信来自不可能的人。",
      markdownBody: "# 发布正文",
      checklist: ["标题不剧透", "结尾有互动"],
    });
  });

  it("builds fallback Markdown when model omits markdown_body", () => {
    const suggestion = parsePublishPackageOutput(
      "```json\n{\"title\":\"雨夜短信\",\"openingGuide\":\"先看这一幕。\",\"endingQuestion\":\"谁在说谎？\"}\n```",
      {
        chapterTitle: "雨夜借命",
        finalText: "定稿正文。",
      },
    );

    expect(suggestion?.selectedTitle).toBe("雨夜短信");
    expect(suggestion?.markdownBody).toContain("# 雨夜短信");
    expect(suggestion?.markdownBody).toContain("定稿正文。");
    expect(suggestion?.markdownBody).toContain("谁在说谎？");
  });
});

import { describe, expect, it } from "vitest";
import {
  buildChapterSummaryContext,
  buildChapterSummaryContextSummary,
  buildPromptSourceText,
  confirmedChapterText,
  hasConfirmedChapterText,
} from "./chapter-summaries";

const baseInput = {
  project: {
    title: "借命人",
    genre: "都市悬疑",
    targetAudience: "公众号男性读者",
    platform: "微信公众号",
    description: "寿命交易背后的地下契约网络。",
  },
  setting: {
    sellingPoint: "寿命交易带来高压反转。",
    mainConflict: "主角追查借命契约来源。",
    forbiddenItems: "不能让 AI 直接改写正式设定。",
  },
  chapter: {
    chapterNumber: 5,
    title: "门后的倒计时",
    goal: "主角确认短信来自死者手机。",
    beats: "1. 林野进入旧楼。\n2. 门后倒计时出现。",
    draftText: "这是草稿，不应进入摘要。",
    finalText:
      "林野推开旧楼铁门，门后的电子钟正在倒计时。短信再次弹出，署名却是三天前已经死亡的周医生。",
    notes: "摘要应记录短信来源和倒计时。",
  },
  characters: [
    {
      name: "林野",
      roleInStory: "主角",
      identity: "借命契约调查者",
      latestAppearance: "进入旧楼",
    },
  ],
};

describe("chapter summary context builder", () => {
  it("builds a summary extraction prompt from confirmed final text", () => {
    const context = buildChapterSummaryContext(baseInput);

    expect(context.inputText).toContain("第 5 章《门后的倒计时》");
    expect(context.inputText).toContain("电子钟正在倒计时");
    expect(context.inputText).toContain("寿命交易带来高压反转");
    expect(context.inputText).toContain("林野");
    expect(context.inputText).toContain("shortSummary");
    expect(context.inputText).not.toContain("这是草稿，不应进入摘要");
    expect(context.inputJson.chapter).toMatchObject({
      chapterNumber: 5,
      title: "门后的倒计时",
      finalTextLength: baseInput.chapter.finalText.length,
    });
  });

  it("does not treat draft text as confirmed chapter text", () => {
    expect(hasConfirmedChapterText(baseInput.chapter)).toBe(true);
    expect(confirmedChapterText(baseInput.chapter)).toContain("电子钟正在倒计时");
    expect(
      hasConfirmedChapterText({
        ...baseInput.chapter,
        finalText: "   ",
        draftText: "草稿正文不能作为摘要来源。",
      }),
    ).toBe(false);
  });

  it("summarizes context scope for AI task records", () => {
    expect(buildChapterSummaryContextSummary(baseInput)).toBe(
      `第 5 章《门后的倒计时》章节摘要提取；定稿 ${baseInput.chapter.finalText.length} 字；角色 1 个；伏笔候选 0 条；包含项目设定`,
    );
  });

  it("passes stable foreshadow ids and strict recovery rules into the summary audit", () => {
    const context = buildChapterSummaryContext({
      ...baseInput,
      foreshadows: [
        {
          id: "foreshadow_countdown",
          content: "门后的倒计时来源待查。",
          status: "needs_attention",
          importance: "high",
          expectedResolveChapter: 5,
          plantedChapterNumber: 2,
        },
      ],
    });

    expect(context.inputText).toContain("[foreshadow_countdown]");
    expect(context.inputText).toContain("只审计候选列表中的伏笔");
    expect(context.inputText).toContain("完整兑现使用 resolve");
    expect(context.inputJson.foreshadows).toEqual([
      expect.objectContaining({
        id: "foreshadow_countdown",
        expectedResolveChapter: 5,
      }),
    ]);
    expect(context.inputContextSummary).toContain("伏笔候选 1 条");
  });

  it("uses safe excerpts for very long final text prompts", () => {
    const longFinalText = [
      "开头：林野发现倒计时。",
      "甲".repeat(9000),
      "中段：周医生旧病例出现。",
      "乙".repeat(9000),
      "结尾：短信署名再次变成周医生。",
    ].join("\n");
    const context = buildChapterSummaryContext({
      ...baseInput,
      chapter: {
        ...baseInput.chapter,
        finalText: longFinalText,
      },
    });
    const promptSourceText = buildPromptSourceText(longFinalText);

    expect(context.inputText).toContain("开头摘录");
    expect(context.inputText).toContain("中段摘录");
    expect(context.inputText).toContain("结尾摘录");
    expect(context.inputText).toContain("只基于这些摘录");
    expect(context.inputText.length).toBeLessThan(longFinalText.length);
    expect(context.inputJson.chapter).toMatchObject({
      finalTextLength: longFinalText.length,
      finalTextPromptWasExcerpted: true,
      finalTextPromptStrategy: "head_middle_tail_excerpt",
    });
    expect(promptSourceText.wasExcerpted).toBe(true);
    expect(buildChapterSummaryContextSummary({
      ...baseInput,
      chapter: {
        ...baseInput.chapter,
        finalText: longFinalText,
      },
    })).toContain("模型输入首/中/尾摘录");
  });
});

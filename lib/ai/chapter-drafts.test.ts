import { describe, expect, it } from "vitest";
import {
  buildChapterDraftContext,
  buildChapterDraftContextSummary,
  hasConfirmedChapterBeats,
} from "./chapter-drafts";

const baseInput = {
  project: {
    title: "借命人",
    genre: "都市悬疑",
    targetAudience: "公众号男性读者",
    chapterWordMin: 2200,
    chapterWordMax: 2800,
    description: "寿命可以被交易，主角被迫调查第一份契约。",
  },
  setting: {
    sellingPoint: "寿命交易带来高压反转。",
    mainConflict: "主角要查清借命契约来源。",
    styleSample: "短句推进，悬疑压迫感强。",
    forbiddenItems: "不能让 AI 直接改写正式设定。",
    sensitiveContentRules: "避免血腥细节。",
  },
  chapter: {
    chapterNumber: 4,
    title: "死者发来的短信",
    goal: "主角确认第三个名字对应的人已经死亡。",
    beats:
      "1. 林野翻出旧合同。\n2. 第三个名字对应死者。\n3. 短信再次出现。",
    notes: "结尾保留短信来源。",
  },
  outlines: [
    {
      level: "unit",
      title: "死亡合同调查",
      startChapter: 3,
      endChapter: 5,
      goal: "逼主角确认借命契约不是个案。",
      coreEvents: "死者短信、合同线索、医院旧档案。",
    },
  ],
  characters: [
    {
      name: "林野",
      roleInStory: "主角",
      speakingStyle: "短句多，先质疑再行动",
      behaviorRules: "不会轻易相信陌生人",
    },
  ],
  previousChapter: {
    chapterNumber: 3,
    title: "合同上的第三个名字",
    finalText: `${"前情。".repeat(500)}手机屏幕亮起，短信写着：别相信第三个名字。`,
  },
};

describe("chapter draft context builder", () => {
  it("builds a draft prompt around confirmed beats and style constraints", () => {
    const context = buildChapterDraftContext(baseInput);

    expect(context.inputText).toContain("第 4 章《死者发来的短信》");
    expect(context.inputText).toContain("第三个名字对应死者");
    expect(context.inputText).toContain("短句推进，悬疑压迫感强");
    expect(context.inputText).toContain("不是……而是……");
    expect(context.inputText).toContain("反模板腔硬性自检");
    expect(context.inputText).toContain("反流水账硬性自检");
    expect(context.inputText).toContain("无冲突过渡日");
    expect(context.inputText).toContain("最多保留 1 处");
    expect(context.inputJson.styleConstraints).toEqual(
      expect.arrayContaining([
        expect.stringContaining("反模板腔"),
        expect.stringContaining("不是……而是……"),
        expect.stringContaining("反流水账"),
      ]),
    );
    expect(context.inputText).toContain("林野");
    expect(context.inputText).toContain("死亡合同调查");
    expect(context.inputText).toContain("医院旧档案");
    expect(context.inputText).toContain("不能让 AI 直接改写正式设定");
    expect(context.inputJson.chapter).toMatchObject({
      chapterNumber: 4,
      title: "死者发来的短信",
    });
  });

  it("injects Fanqie platform instructions when requested", () => {
    const context = buildChapterDraftContext(baseInput, {
      platformTemplate: "fanqie",
    });

    expect(context.inputText).toContain("目标平台：番茄小说长篇连载");
    expect(context.inputText).toContain("开篇 300 字内必须出现明确人物动作");
    expect(context.inputText).toContain("每 800-1200 字推进一次有效信息");
    expect(context.inputText).toContain("不要按一天一天或早中晚流水账推进");
    expect(context.inputText).toContain("章尾保留追读钩子");
    expect(context.inputJson.platformTemplate).toEqual(
      expect.objectContaining({
        value: "fanqie",
        label: "番茄小说",
        instructions: expect.arrayContaining([
          expect.stringContaining("目标平台：番茄小说"),
          expect.stringContaining("开篇 300 字"),
        ]),
      }),
    );
    expect(context.inputContextSummary).toContain("平台模板：番茄小说");
  });

  it("uses the previous chapter ending without sending the full previous text", () => {
    const context = buildChapterDraftContext(baseInput);

    expect(String(context.inputJson.previousChapterEnding).length).toBeLessThan(
      1300,
    );
    expect(context.inputText).toContain("别相信第三个名字");
  });

  it("summarizes draft context scope and detects confirmed beats", () => {
    expect(buildChapterDraftContextSummary(baseInput)).toBe(
      "第 4 章《死者发来的短信》章节草稿生成；包含已确认节拍；大纲 1 条；角色 1 个；无读者反馈；包含上一章结尾",
    );
    expect(hasConfirmedChapterBeats(baseInput.chapter)).toBe(true);
    expect(hasConfirmedChapterBeats({ ...baseInput.chapter, beats: "   " })).toBe(
      false,
    );
  });

  it("includes reader feedback without allowing it to rewrite formal facts", () => {
    const context = buildChapterDraftContext({
      ...baseInput,
      readerFeedback: [
        {
          chapterNumber: 3,
          title: "合同上的第三个名字",
          views: 910,
          completionRate: 0.81,
          averageReadSeconds: 260,
          dropOffPoint: "反派动机解释处流失。",
          pacing: "读者希望开场少解释、多动作。",
          hookStrategy: "结尾用短信或电话形成追更钩子。",
        },
      ],
    });

    expect(context.inputText).toContain("# 读者反馈信号");
    expect(context.inputText).toContain("反派动机解释处流失");
    expect(context.inputText).toContain("不要直接在正文中提到数据、指标或读者反馈");
    expect(context.inputJson.readerFeedback).toEqual([
      expect.objectContaining({
        chapterNumber: 3,
        title: "合同上的第三个名字",
        metrics: expect.objectContaining({
          completionRate: 0.81,
          averageReadSeconds: 260,
        }),
      }),
    ]);
    expect(context.inputContextSummary).toContain("读者反馈 1 条");
  });
});

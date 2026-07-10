import { describe, expect, it } from "vitest";
import {
  buildChapterBeatContext,
  buildChapterBeatContextSummary,
  excerptChapterEnding,
} from "./chapter-beats";

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
    forbiddenItems: "不能让 AI 直接改写正式设定。",
    sensitiveContentRules: "避免血腥细节。",
  },
  chapter: {
    chapterNumber: 3,
    title: "合同上的第三个名字",
    goal: "主角发现合同并非第一次出现。",
    notes: "结尾留下短信来源。",
  },
  outlines: [
    {
      level: "volume",
      title: "第一卷 县城起势",
      startChapter: 1,
      endChapter: 10,
      goal: "主角用第一桶金证明未来判断有效。",
      mainConflict: "县城灰色势力盯上电脑培训班资源。",
    },
    {
      level: "chapter",
      title: "合同上的第三个名字",
      chapterNumber: 3,
      chapterConflict: "主角发现第三个名字已死亡。",
      endingHook: "短信来源指向旧医院。",
    },
  ],
  characters: [
    {
      name: "林野",
      roleInStory: "主角",
      desire: "查清借命契约",
      behaviorRules: "不会轻易相信陌生人",
    },
  ],
  recentChapters: [
    {
      chapterNumber: 2,
      title: "第一通电话",
      goal: "建立契约威胁",
      beats: "电话警告；主角尝试报警失败。",
    },
  ],
  previousChapter: {
    chapterNumber: 2,
    title: "第一通电话",
    finalText: `${"前情。".repeat(500)}手机屏幕亮起，短信写着：别相信第三个名字。`,
  },
};

describe("chapter beat context builder", () => {
  it("builds a task-specific prompt with setting, characters, and chapter goal", () => {
    const context = buildChapterBeatContext(baseInput);

    expect(context.inputText).toContain("第 3 章《合同上的第三个名字》");
    expect(context.inputText).toContain("主角发现合同并非第一次出现");
    expect(context.inputText).toContain("林野");
    expect(context.inputText).toContain("寿命交易带来高压反转");
    expect(context.inputText).toContain("第一卷 县城起势");
    expect(context.inputText).toContain("短信来源指向旧医院");
    expect(context.inputText).toContain("不能让 AI 直接改写正式设定");
    expect(context.inputJson.chapter).toMatchObject({
      chapterNumber: 3,
      title: "合同上的第三个名字",
    });
  });

  it("clips previous chapter text to the ending instead of sending full text", () => {
    const ending = excerptChapterEnding(baseInput.previousChapter);

    expect(ending.length).toBeLessThan(1300);
    expect(ending).toContain("别相信第三个名字");
    expect(ending.startsWith("...")).toBe(true);
  });

  it("summarizes context scope for ai task records", () => {
    expect(buildChapterBeatContextSummary(baseInput)).toBe(
      "第 3 章《合同上的第三个名字》章节节拍生成；大纲 2 条；角色 1 个；最近章节 1 个；无读者反馈；无到期伏笔；包含上一章结尾",
    );
  });

  it("includes recent reader feedback signals as generation guidance", () => {
    const context = buildChapterBeatContext({
      ...baseInput,
      readerFeedback: [
        {
          chapterNumber: 2,
          title: "第一通电话",
          views: 1280,
          completionRate: 0.72,
          engagementScore: 66,
          dropOffPoint: "中段说明偏长。",
          focus: "读者希望林野更快行动。",
          hookStrategy: "章末保留短信威胁。",
        },
      ],
    });

    expect(context.inputText).toContain("# 读者反馈信号");
    expect(context.inputText).toContain("中段说明偏长");
    expect(context.inputText).toContain("读者希望林野更快行动");
    expect(context.inputJson.readerFeedback).toEqual([
      expect.objectContaining({
        chapterNumber: 2,
        title: "第一通电话",
        metrics: expect.objectContaining({
          completionRate: 0.72,
          engagementScore: 66,
        }),
      }),
    ]);
    expect(context.inputContextSummary).toContain("读者反馈 1 条");
  });

  it("includes due foreshadows as beat planning guidance without mutating memory", () => {
    const context = buildChapterBeatContext({
      ...baseInput,
      dueForeshadows: [
        {
          id: "foreshadow_sms",
          content: "短信来源指向旧医院，需要在本章给出阶段性解释。",
          status: "needs_attention",
          importance: "high",
          expectedResolveChapter: 3,
          relatedCharacters: "林野",
          plantedChapter: {
            chapterNumber: 2,
            title: "第一通电话",
          },
        },
      ],
    });

    expect(context.inputText).toContain("# 本章建议处理伏笔");
    expect(context.inputText).toContain("短信来源指向旧医院");
    expect(context.inputText).toContain("处理提示：已标记需要处理");
    expect(context.inputText).toContain("状态：需要处理");
    expect(context.inputText).toContain("重要度：高");
    expect(context.inputText).not.toContain("状态：needs_attention");
    expect(context.inputText).not.toContain("重要度：high");
    expect(context.inputText).toContain("必须在节拍中安排合理回收");
    expect(context.inputText).toContain("不得宣称已修改伏笔池状态");
    expect(context.inputJson.dueForeshadows).toEqual([
      expect.objectContaining({
        id: "foreshadow_sms",
        content: "短信来源指向旧医院，需要在本章给出阶段性解释。",
        status: "needs_attention",
        statusLabel: "需要处理",
        importance: "high",
        importanceLabel: "高",
        recoveryReason: "已标记需要处理",
        expectedResolveChapter: 3,
        relatedCharacters: "林野",
        plantedChapter: {
          chapterNumber: 2,
          title: "第一通电话",
        },
      }),
    ]);
    expect(context.inputContextSummary).toContain("建议处理伏笔 1 条");
  });

  it("includes prose anti-template guardrails for beat generation", () => {
    const context = buildChapterBeatContext(baseInput);

    expect(context.inputText).toContain("不是……而是……");
    expect(context.inputText).toContain("反流水账硬性自检");
    expect(context.inputText).toContain("无冲突过渡日");
    expect(context.inputJson.proseStyleGuardrails).toEqual(
      expect.arrayContaining([expect.stringContaining("反模板腔")]),
    );
    expect(context.inputJson.proseStyleGuardrails).toEqual(
      expect.arrayContaining([expect.stringContaining("反流水账")]),
    );
  });
});

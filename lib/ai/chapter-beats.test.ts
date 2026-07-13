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

const shortStoryBlueprint = {
  premise: "林野收到死者发来的借命短信。",
  openingHook: "短信准确预告下一名死者。",
  protagonistPressure: "每迟一天，林野就失去一年寿命。",
  coreConflict: "林野必须在寿命耗尽前找出契约源头。",
  reversalChain: "死者不是受害者；短信来自未来的林野。",
  emotionalArc: "怀疑、恐惧、主动追查、承担代价。",
  climax: "林野选择公开契约名单。",
  ending: "契约网络被摧毁，林野失去最后十年寿命。",
  requiredPayoffs: "解释死者短信与林野签名。",
  forbiddenDeviations: "不得新增无法在本篇闭环的幕后组织。",
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
    expect(context.inputJson).not.toHaveProperty("readerFeedback");
    expect(context.inputText).not.toContain("# 读者反馈信号");
  });

  it("clips previous chapter text to the ending instead of sending full text", () => {
    const ending = excerptChapterEnding(baseInput.previousChapter);

    expect(ending.length).toBeLessThan(1300);
    expect(ending).toContain("别相信第三个名字");
    expect(ending.startsWith("...")).toBe(true);
  });

  it("plans short-story writing units from the formal blueprint and unit plan", () => {
    const context = buildChapterBeatContext({
      ...baseInput,
      project: {
        ...baseInput.project,
        workType: "short_story",
        totalWordTarget: 30000,
      },
      blueprint: shortStoryBlueprint,
      seriesContext: "系列：雾城异闻录\n累计状态：林野已失去两年寿命。",
      chapter: {
        ...baseInput.chapter,
        chapterNumber: 2,
        title: "病历上的签名",
        unitSceneMovement: "从短信追查推进到医院旧档案室。",
        unitConflict: "保安封锁档案室，契约倒计时仍在减少。",
        unitTurn: "病历上的签名来自林野本人。",
        unitPayoffMovement: "兑现短信能预告受害者的能力。",
        unitWordTarget: 5200,
      },
      outlines: [],
      recentChapters: [baseInput.recentChapters[0]],
      previousChapter: {
        chapterNumber: 1,
        title: "死人来信",
        finalText: "林野推开医院后门，走廊尽头的档案室亮着灯。",
      },
    });

    expect(context.inputText).toContain("为写作单元 2《病历上的签名》");
    expect(context.inputText).toContain("# 正式短故事蓝图");
    expect(context.inputText).toContain("# 系列短故事连续性");
    expect(context.inputText).toContain("林野已失去两年寿命");
    expect(context.inputText).toContain("死者不是受害者；短信来自未来的林野");
    expect(context.inputText).toContain("目标字数: 约 5,200 字");
    expect(context.inputText).toContain("给出 5-8 个顺序节拍");
    expect(context.inputText).toContain("直接承接前序单元");
    expect(context.inputText).toContain("禁止为了切分而添加重复标题");
    expect(context.inputText).toContain("不得另开与单篇闭环无关的支线");
    expect(context.inputText).not.toContain("# 当前大纲");
    expect(context.inputJson).toMatchObject({
      project: {
        workType: "short_story",
      },
      blueprint: {
        coreConflict: "林野必须在寿命耗尽前找出契约源头。",
      },
      chapter: {
        unitPlan: {
          sceneMovement: "从短信追查推进到医院旧档案室。",
          conflict: "保安封锁档案室，契约倒计时仍在减少。",
          turn: "病历上的签名来自林野本人。",
          payoffMovement: "兑现短信能预告受害者的能力。",
          wordTarget: 5200,
        },
      },
    });
    expect(context.inputContextSummary).toContain("写作单元 2");
    expect(context.inputContextSummary).toContain("蓝图 已建立");
    expect(context.inputContextSummary).toContain("最近单元 1 个");
  });

  it("lets the first short-story unit establish the opening", () => {
    const context = buildChapterBeatContext({
      ...baseInput,
      project: {
        ...baseInput.project,
        workType: "short_story",
        totalWordTarget: 30000,
      },
      blueprint: shortStoryBlueprint,
      chapter: {
        ...baseInput.chapter,
        chapterNumber: 1,
        title: "死人来信",
        unitSceneMovement: "林野收到死者短信，并验证第一条预告。",
        unitConflict: "警方不信短信，寿命倒计时已经启动。",
        unitTurn: "短信准确预告下一名死者。",
        unitPayoffMovement: "建立死者短信的开篇承诺。",
        unitWordTarget: 4800,
      },
      outlines: [],
      recentChapters: [],
      previousChapter: undefined,
    });

    expect(context.inputText).toContain("建立故事开篇");
    expect(context.inputText).toContain("正式蓝图的开篇钩子");
    expect(context.inputText).not.toContain("直接承接前序单元");
    expect(context.inputJson.outputRequirements).toContain(
      "建立故事开篇，落实正式蓝图的开篇钩子，并启动核心冲突。",
    );
    expect(context.inputJson.outputRequirements).not.toContain(
      "承接前序单元，包含场景推进、冲突升级、关键转折和兑现推进。",
    );
    expect(context.inputJson.outputRequirements).not.toContain("");
  });

  it("summarizes context scope for ai task records", () => {
    expect(buildChapterBeatContextSummary(baseInput)).toBe(
      "第 3 章《合同上的第三个名字》章节节拍生成；大纲 2 条；角色 1 个；最近章节 1 个；无到期伏笔；包含上一章结尾",
    );
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

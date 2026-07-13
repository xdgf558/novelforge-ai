import { describe, expect, it } from "vitest";
import {
  buildSegmentedChapterPolishContext,
  buildChapterPolishContext,
  buildChapterPolishContextSummary,
  hashText,
  hasPolishableChapterText,
  isExcerptedChapterPolishInputJson,
  isSegmentedChapterPolishInputJson,
  polishSegmentSourceMaxLength,
  polishableChapterText,
  polishableChapterTextSource,
  shouldSegmentChapterPolish,
  splitChapterPolishSourceText,
} from "./chapter-polishes";

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
    styleSample: "短句推进，悬疑压迫感强。",
    emotionalTone: "冷峻、压迫。",
    forbiddenItems: "不能让 AI 直接改写正式设定。",
    sensitiveContentRules: "避免血腥细节。",
  },
  chapter: {
    chapterNumber: 4,
    title: "死者发来的短信",
    goal: "主角确认第三个名字对应的人已经死亡。",
    beats: "1. 林野翻出旧合同。\n2. 短信再次出现。",
    draftText:
      "## 【开场钩子】节拍1：旧合同\n林野翻出旧合同。\n\n**情绪作用**：制造悬疑。",
    notes: "保留短信来源。",
  },
  characters: [
    {
      name: "林野",
      roleInStory: "主角",
      speakingStyle: "短句多，先质疑再行动",
      behaviorRules: "不会轻易相信陌生人",
    },
  ],
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

describe("chapter polish context builder", () => {
  it("builds a polish prompt from draft text and removes process markers", () => {
    const context = buildChapterPolishContext(baseInput);

    expect(context.inputText).toContain("第 4 章《死者发来的短信》");
    expect(context.inputText).toContain("林野翻出旧合同");
    expect(context.inputText).toContain("删除“【开场钩子】");
    expect(context.inputText).toContain("不是……而是……");
    expect(context.inputText).toContain("反模板腔硬性自检");
    expect(context.inputText).toContain("反流水账精修");
    expect(context.inputText).toContain("最多保留 1 处");
    expect(context.inputJson.styleConstraints).toEqual(
      expect.arrayContaining([
        expect.stringContaining("反模板腔"),
        expect.stringContaining("不是……而是……"),
        expect.stringContaining("反流水账"),
      ]),
    );
    expect(context.inputText).toContain("不能让 AI 直接改写正式设定");
    expect(context.inputJson.chapter).toMatchObject({
      chapterNumber: 4,
      title: "死者发来的短信",
      sourceKind: "草稿正文",
    });
  });

  it("injects Fanqie platform instructions into normal polish context", () => {
    const context = buildChapterPolishContext(baseInput, {
      platformTemplate: "fanqie",
    });

    expect(context.inputText).toContain("目标平台：番茄小说长篇连载");
    expect(context.inputText).toContain("清理 AI 腔、解释腔、总结腔");
    expect(context.inputText).toContain("压缩逐日流水账式过渡");
    expect(context.inputText).toContain("强化开篇钩子");
    expect(context.inputText).toContain("章尾增加追读感");
    expect(context.inputJson.platformTemplate).toEqual(
      expect.objectContaining({
        value: "fanqie",
        label: "番茄小说",
        instructions: expect.arrayContaining([
          expect.stringContaining("目标平台：番茄小说"),
          expect.stringContaining("清理 AI 腔"),
        ]),
      }),
    );
    expect(context.inputContextSummary).toContain("平台模板：番茄小说");
  });

  it("summarizes source scope and detects polishable text", () => {
    expect(buildChapterPolishContextSummary(baseInput)).toBe(
      "第 4 章《死者发来的短信》正文精修；草稿正文 41 字；角色 1 个；包含项目设定",
    );
    expect(hasPolishableChapterText(baseInput.chapter)).toBe(true);
    expect(hasPolishableChapterText({ ...baseInput.chapter, draftText: "   " })).toBe(
      false,
    );
  });

  it("polishes a short-story unit without creating internal chapter seams", () => {
    const context = buildChapterPolishContext({
      ...baseInput,
      project: {
        ...baseInput.project,
        workType: "short_story",
      },
      blueprint: shortStoryBlueprint,
      seriesContext: "系列：雾城异闻录\n关系状态：林野仍不信任搭档。",
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
    });

    expect(context.inputText).toContain("精修写作单元 2《病历上的签名》");
    expect(context.inputText).toContain("# 正式短故事蓝图");
    expect(context.inputText).toContain("# 系列短故事连续性");
    expect(context.inputText).toContain("林野仍不信任搭档");
    expect(context.inputContextSummary).toContain("包含系列连续性");
    expect(context.inputText).toContain("约 5,200 字");
    expect(context.inputText).toContain("删除重复开篇、前情回顾");
    expect(context.inputText).toContain("不得为内部切分强造章末追读钩子");
    expect(context.inputJson).toMatchObject({
      blueprint: {
        reversalChain: "死者不是受害者；短信来自未来的林野。",
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
  });

  it("keeps short-story continuity guardrails in segmented polish tasks", () => {
    const context = buildSegmentedChapterPolishContext({
      ...baseInput,
      project: {
        ...baseInput.project,
        workType: "short_story",
      },
      blueprint: shortStoryBlueprint,
      seriesContext: "系列：雾城异闻录\n累计状态：林野已失去两年寿命。",
      chapter: {
        ...baseInput.chapter,
        chapterNumber: 3,
        unitWordTarget: 5000,
        draftText: "林野沿着签名继续追查。\n\n".repeat(1800),
      },
    });

    expect(context.segments.length).toBeGreaterThan(1);
    expect(context.segments[0].inputText).toContain("# 正式短故事蓝图");
    expect(context.segments[0].inputText).toContain("# 系列短故事连续性");
    expect(context.segments[0].inputText).toContain("删除重复开篇、前情回顾");
    expect(context.segments[0].inputText).toContain(
      "不得为内部单元强造章末追读钩子",
    );
    expect(context.inputJson).toMatchObject({
      blueprint: {
        ending: "契约网络被摧毁，林野失去最后十年寿命。",
      },
      chapter: {
        unitPlan: {
          wordTarget: 5000,
        },
      },
    });
  });

  it("prefers polished text over draft and final text", () => {
    const chapter = {
      ...baseInput.chapter,
      draftText: "旧草稿。",
      polishedText: "已有精修稿。",
      finalText: "已有定稿。",
    };

    expect(polishableChapterText(chapter)).toBe("已有精修稿。");
    expect(polishableChapterTextSource(chapter)).toBe("精修正文");
  });

  it("falls back to final text before draft text when polish is missing", () => {
    const chapter = {
      ...baseInput.chapter,
      draftText: "旧草稿。",
      polishedText: " ",
      finalText: "已有定稿。",
    };

    expect(polishableChapterText(chapter)).toBe("已有定稿。");
    expect(polishableChapterTextSource(chapter)).toBe("定稿正文");
  });

  it("splits overlong source text into adoptable segmented polish tasks", () => {
    const longDraft = Array.from({ length: 21000 }, (_, index) =>
      index % 2 === 0 ? "甲" : "乙",
    ).join("");
    const input = {
      ...baseInput,
      chapter: {
        ...baseInput.chapter,
        draftText: longDraft,
      },
    };
    const context = buildSegmentedChapterPolishContext(input);

    expect(shouldSegmentChapterPolish(input)).toBe(true);
    expect(context.segments.length).toBeGreaterThan(1);
    expect(
      context.segments.every(
        (segment) => segment.segment.text.length <= polishSegmentSourceMaxLength,
      ),
    ).toBe(true);
    expect(context.inputJson.chapter).toMatchObject({
      sourceTextLength: 21000,
      sourceTextHash: hashText(longDraft),
      sourceTextPromptWasExcerpted: false,
      sourceTextPromptWasSegmented: true,
      segmentCount: context.segments.length,
    });
    expect(context.segments[0].inputText).toContain("第 1 / 3 段");
    expect(context.segments[0].inputText).toContain(
      "只输出本段精修正文",
    );
    expect(context.segments[0].inputText).toContain("不是……而是……");
    expect(context.segments[0].inputText).toContain("反流水账精修");
    expect(context.inputContextSummary).toContain("自动分段精修");
    expect(isExcerptedChapterPolishInputJson(JSON.stringify(context.inputJson))).toBe(
      false,
    );
    expect(isSegmentedChapterPolishInputJson(JSON.stringify(context.inputJson))).toBe(
      true,
    );
  });

  it("keeps Fanqie platform instructions in segmented polish tasks", () => {
    const longDraft = "陈远推开门。\n\n".repeat(4000);
    const context = buildSegmentedChapterPolishContext(
      {
        ...baseInput,
        chapter: {
          ...baseInput.chapter,
          draftText: longDraft,
        },
      },
      {
        platformTemplate: "fanqie",
      },
    );

    expect(context.inputJson.platformTemplate).toEqual(
      expect.objectContaining({
        value: "fanqie",
        label: "番茄小说",
      }),
    );
    expect(context.inputContextSummary).toContain("平台模板：番茄小说");
    expect(context.segments[0].inputText).toContain(
      "目标平台：番茄小说长篇连载",
    );
    expect(context.segments[0].inputText).toContain("清理 AI 腔、解释腔、总结腔");
  });

  it("keeps paragraph boundaries while splitting polish segments when possible", () => {
    const paragraphs = Array.from({ length: 5 }, (_, index) =>
      `第${index + 1}段。${"正文".repeat(1200)}`,
    ).join("\n\n");
    const segments = splitChapterPolishSourceText(paragraphs, 5000);

    expect(segments.length).toBe(3);
    expect(segments[0].text).toContain("第1段");
    expect(segments[0].text).toContain("第2段");
    expect(segments[1].text).toContain("第3段");
    expect(segments[2].previousTail).toContain("...");
  });
});

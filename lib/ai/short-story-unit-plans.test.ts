import { describe, expect, it } from "vitest";
import {
  buildShortStoryUnitPlanGenerationContext,
  isReviewableShortStoryUnitPlanDraft,
  parseShortStoryUnitPlanGenerationOutput,
  shortStoryUnitPlanTaskTargetNumber,
} from "./short-story-unit-plans";

const completePlan = {
  title: "坠星荒原",
  unitSceneMovement: "从坠毁现场勘测推进到雇佣兵封锁山谷。",
  unitConflict: "阿德里安必须保住测绘记录，同时不能暴露银色安瓿。",
  unitTurn: "受伤同僚指认王室制图局内部有人提前知道坠落坐标。",
  unitPayoffMovement: "兑现开篇坠星异常，并建立安瓿会主动避火的第一层证据。",
  goal: "让阿德里安卷入争夺并作出藏起安瓿的第一次主动选择。",
};

describe("short-story unit plan generation", () => {
  it("builds bounded current-unit context without leaking later units", () => {
    const context = buildShortStoryUnitPlanGenerationContext({
      project: {
        title: "永生者档案：坠星瓶",
        genre: "架空历史科幻",
        totalWordTarget: 30000,
        description: "阿德里安误服外星再生剂。",
      },
      setting: {
        mainConflict: "王室与雇佣兵争夺坠毁物。",
        worldviewRules: "中世纪人物不能直接使用现代科学术语。",
        narrativePerspective:
          "【短故事叙事视角：沉浸式第三人称限制】\n不得直接进入其他人物内心。",
      },
      characters: [
        {
          name: "阿德里安",
          identity: "王室制图局学徒",
          desire: "查明坠毁物来源",
        },
      ],
      seriesContext: "系列长期谜团：R-7 为什么选择阿德里安。",
      blueprint: {
        premise: "制图局学徒在追杀中误服外星再生剂。",
        openingHook: "银色液体会主动躲避火焰。",
        coreConflict: "公开坠毁物会引发战争，销毁则失去解药线索。",
        ending: "阿德里安焚毁舱体并藏起罗盘。",
      },
      previousUnits: [
        {
          chapterNumber: 1,
          title: "荒原测绘",
          goal: "建立坠毁现场。",
          unitTurn: "雇佣兵提前抵达。",
        },
        {
          chapterNumber: 3,
          title: "未来单元标题不得出现",
          goal: "未来单元内容不得出现。",
        },
      ],
      target: {
        chapterNumber: 2,
        totalUnitCount: 6,
        unitWordTarget: 5000,
      },
      authorHints: {
        unitConflict: "保住安瓿，同时救下受伤同僚。",
      },
    });

    expect(context.inputText).toContain("系列长期谜团");
    expect(context.inputText).toContain("单元 1：荒原测绘");
    expect(context.inputText).toContain("保住安瓿，同时救下受伤同僚");
    expect(context.inputText).toContain("不得直接进入其他人物内心");
    expect(context.inputText).toContain("视角人物无法感知的事实");
    expect(context.inputText).not.toContain("未来单元标题不得出现");
    expect(context.inputText).not.toContain("未来单元内容不得出现");
    expect(context.inputJson.target).toEqual({
      chapterNumber: 2,
      totalUnitCount: 6,
      unitWordTarget: 5000,
    });
  });

  it("parses a fenced structured draft and requires every form field", () => {
    const parsed = parseShortStoryUnitPlanGenerationOutput(
      `\`\`\`json\n${JSON.stringify({ unitPlan: completePlan })}\n\`\`\``,
    );

    expect(parsed).toEqual(completePlan);
    expect(isReviewableShortStoryUnitPlanDraft(parsed)).toBe(true);
    expect(
      isReviewableShortStoryUnitPlanDraft({
        ...parsed,
        unitTurn: "",
      }),
    ).toBe(false);
  });

  it("reads the target unit number from logged task input", () => {
    expect(
      shortStoryUnitPlanTaskTargetNumber(
        JSON.stringify({
          target: {
            chapterNumber: 6,
          },
          aiExecutionRoute: {
            kind: "task_model_route",
          },
        }),
      ),
    ).toBe(6);
    expect(shortStoryUnitPlanTaskTargetNumber("not-json")).toBeNull();
  });
});

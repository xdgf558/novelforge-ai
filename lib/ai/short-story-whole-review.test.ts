import { describe, expect, it } from "vitest";
import { chapterFinalTextHash } from "../chapters/source-text";
import {
  buildShortStoryWholeReviewContext,
  excerptWholeStoryUnit,
  parseShortStoryWholeReviewOutput,
} from "./short-story-whole-review";

const longText = "甲".repeat(16_000);

function input() {
  return {
    project: {
      title: "雨夜来信",
      genre: "悬疑",
      totalWordTarget: 30_000,
    },
    setting: {
      mainConflict: "主角必须在真相和家人之间选择。",
      styleSample: "采用受限视角，让官方记录与私人记忆彼此冲突。",
    },
    blueprint: {
      premise: "一封来自死者的信迫使主角重查旧案。",
      openingHook: "死者来信。",
      reversalChain: "信件伪造者其实在保护主角。",
      ending: "主角公开真相并承担代价。",
      requiredPayoffs: "解释来信来源。",
    },
    characters: [
      {
        name: "林遥",
        desire: "查明旧案",
        fear: "牵连家人",
      },
    ],
    foreshadows: [
      {
        id: "foreshadow_1",
        content: "信封上的旧邮戳",
        status: "planted",
        importance: "high",
      },
    ],
    timelineEvents: [
      {
        title: "收到来信",
        description: "周五夜里收到死者署名的信。",
        storyTime: "周五夜",
      },
    ],
    seriesContext: "系列：雾城异闻录\n跨篇规则：人物认知必须持续累积。",
    units: [
      {
        id: "unit_1",
        chapterNumber: 1,
        title: "死者来信",
        status: "final",
        goal: "建立异常",
        unitTurn: "确认邮戳来自七年前",
        finalText: longText,
      },
      {
        id: "unit_2",
        chapterNumber: 2,
        title: "旧案回声",
        status: "final",
        goal: "迫使主角选择",
        finalText: "林遥决定继续追查。",
      },
    ],
  };
}

describe("short-story whole review", () => {
  it("assembles bounded unit text with stable ids and source hashes", () => {
    const context = buildShortStoryWholeReviewContext(input());
    const units = context.inputJson.units as Array<Record<string, unknown>>;

    expect(context.inputText).toContain("人物动机");
    expect(context.inputText).toContain("信息重复");
    expect(context.inputText).toContain("开篇承诺");
    expect(context.inputText).toContain("# 系列短故事连续性");
    expect(context.inputText).toContain("人物认知必须持续累积");
    expect(context.inputText).toContain("官方记录与私人记忆彼此冲突");
    expect(context.inputText).toContain("[unit_1]");
    expect(units[0]).toMatchObject({
      id: "unit_1",
      sourceTextHash: chapterFinalTextHash(longText),
      promptWasExcerpted: true,
      excerptStrategy: "head_middle_tail_excerpt",
    });
    expect(context.inputContextSummary).toContain("确认单元 2 个");
  });

  it("keeps short units whole and bounds long units with head/middle/tail excerpts", () => {
    expect(excerptWholeStoryUnit("完整正文", 1000)).toEqual({
      text: "完整正文",
      wasExcerpted: false,
      strategy: "full_text",
    });

    const excerpt = excerptWholeStoryUnit(longText, 3000);

    expect(excerpt.wasExcerpted).toBe(true);
    expect(excerpt.text).toContain("【开头】");
    expect(excerpt.text).toContain("【中段】");
    expect(excerpt.text).toContain("【结尾】");
    expect(excerpt.text.length).toBeLessThan(3300);
  });

  it("parses unit-bound suggestions and ignores entries without a target id", () => {
    const result = parseShortStoryWholeReviewOutput(`\n\`\`\`json\n${JSON.stringify({
      overallRiskLevel: "high",
      summary: "反转成立，但开篇承诺尚未完全兑现。",
      strengths: ["人物选择有代价"],
      priority: "先补足第二单元的信件来源。",
      issues: [
        {
          targetUnitId: "unit_2",
          targetUnitNumber: 2,
          relatedUnitIds: ["unit_1"],
          category: "opening_promise",
          severity: "high",
          title: "来信来源未兑现",
          description: "结尾没有回答开篇来信来自何处。",
          evidence: "第一单元明确承诺追查来源。",
          reviewBasis: "正式蓝图必须兑现。",
          suggestedFix: "在第二单元结尾补足来源和代价。",
        },
        {
          category: "pacing_gap",
          description: "没有目标单元，必须丢弃。",
        },
      ],
    })}\n\`\`\``);

    expect(result.overallRiskLevel).toBe("high");
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({
      targetUnitId: "unit_2",
      category: "opening_promise",
      severity: "high",
    });
  });

  it("prioritizes attention-needed and high-importance payoffs before clipping", () => {
    const manyForeshadows = Array.from({ length: 40 }, (_, index) => ({
      id: `low_${index}`,
      content: `普通伏笔 ${index}`,
      status: "planted",
      importance: "low",
    })).concat([
      {
        id: "critical_payoff",
        content: "必须兑现的核心承诺",
        status: "needs_attention",
        importance: "high",
      },
    ]);
    const context = buildShortStoryWholeReviewContext({
      ...input(),
      foreshadows: manyForeshadows,
    });
    const foreshadows = context.inputJson.foreshadows as Array<{
      id: string;
    }>;

    expect(foreshadows).toHaveLength(40);
    expect(foreshadows[0].id).toBe("critical_payoff");
    expect(foreshadows.some((item) => item.id === "low_39")).toBe(false);
  });
});

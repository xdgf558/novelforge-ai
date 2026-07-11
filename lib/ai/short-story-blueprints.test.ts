import { describe, expect, it } from "vitest";
import {
  buildShortStoryBlueprintGenerationContext,
  isReviewableShortStoryBlueprintDraft,
  parseShortStoryBlueprintGenerationOutput,
  shortStoryBlueprintDraftTextMaxLength,
} from "./short-story-blueprints";

describe("short-story blueprint AI context", () => {
  it("builds bounded context from formal project memory", () => {
    const context = buildShortStoryBlueprintGenerationContext({
      project: {
        title: "倒计时来信",
        workType: "short_story",
        genre: "悬疑",
        targetAudience: "番茄短故事读者",
        platform: "番茄小说",
        totalWordTarget: 30000,
        description: "一封来自未来的信迫使主角调查自己的死亡。",
      },
      setting: {
        sellingPoint: "未来遗书与现实谋杀互相验证。",
        mainConflict: "主角必须证明寄信者就是未来的自己。",
        forbiddenItems: "不能用梦境解释全部谜题。",
      },
      characters: [
        {
          name: "陈默",
          roleInStory: "主角",
          desire: "活过倒计时",
          secret: "他删除了关键记忆",
        },
      ],
      blueprint: {
        premise: "陈默收到自己死后的遗书。",
      },
    });

    expect(context.inputContextSummary).toContain("目标 30000 字");
    expect(context.inputJson.project.workType).toBe("short_story");
    expect(context.inputJson.characters).toHaveLength(1);
    expect(context.inputJson.currentBlueprint.premise).toContain("遗书");
    expect(context.inputText).toContain("# 当前正式蓝图");
    expect(context.inputText).toContain("不能用梦境解释全部谜题");
  });

  it("parses fenced JSON and keeps only allowed bounded fields", () => {
    const longHook = "钩".repeat(shortStoryBlueprintDraftTextMaxLength + 100);
    const draft = parseShortStoryBlueprintGenerationOutput(`
      \`\`\`json
      {
        "blueprint": {
          "premise": "收到未来遗书",
          "openingHook": "${longHook}",
          "coreConflict": "倒计时内查清死亡真相",
          "ending": "主角公开真相并保留记忆",
          "requiredPayoffs": ["解释遗书来源", "解释删除记忆"],
          "unknownField": "不得进入正式蓝图"
        }
      }
      \`\`\`
    `);

    expect(draft.premise).toBe("收到未来遗书");
    expect(draft.openingHook).toHaveLength(
      shortStoryBlueprintDraftTextMaxLength,
    );
    expect(draft.requiredPayoffs).toBe("解释遗书来源\n解释删除记忆");
    expect(draft).not.toHaveProperty("unknownField");
    expect(isReviewableShortStoryBlueprintDraft(draft)).toBe(true);
  });

  it("requires premise, core conflict, and ending before adoption", () => {
    expect(
      isReviewableShortStoryBlueprintDraft({
        premise: "前提",
        coreConflict: "冲突",
      }),
    ).toBe(false);
  });
});

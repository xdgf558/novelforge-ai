import { describe, expect, it } from "vitest";
import {
  buildProjectSettingGenerationContext,
  hasProjectSettingDraftValues,
  parseProjectSettingGenerationOutput,
} from "./project-settings";

describe("project setting AI helpers", () => {
  it("builds focused context from project basics and current setting", () => {
    const context = buildProjectSettingGenerationContext({
      project: {
        title: "离线未来",
        genre: "重生创业",
        targetAudience: "长篇连载读者",
        platform: "Station Cat",
        totalWordTarget: 800000,
        description: "程序员重回 1999 年。",
      },
      setting: {
        sellingPoint: "离线 AI 与重生年代创业结合。",
      },
    });

    expect(context.inputContextSummary).toContain("离线未来");
    expect(context.inputText).toContain("项目基础");
    expect(context.inputText).toContain("sellingPoint");
    expect(context.inputJson.project.totalWordTarget).toBe(800000);
    expect(context.inputJson.currentSetting.sellingPoint).toBe(
      "离线 AI 与重生年代创业结合。",
    );
  });

  it("parses direct JSON project setting drafts", () => {
    const values = parseProjectSettingGenerationOutput(
      JSON.stringify({
        genre: "都市重生",
        sellingPoint: "主角带着离线 AI 记忆库回到 1999 年。",
        forbiddenItems: ["不要让 AI 替主角自动解决人情关系", "避免万能外挂"],
      }),
    );

    expect(values.genre).toBe("都市重生");
    expect(values.sellingPoint).toContain("1999");
    expect(values.forbiddenItems).toContain("万能外挂");
    expect(hasProjectSettingDraftValues(values)).toBe(true);
  });

  it("parses fenced JSON nested under settings", () => {
    const values = parseProjectSettingGenerationOutput(`
\`\`\`json
{
  "settings": {
    "mainConflict": "陈远想抓住时代机会，但资金、人脉和家庭压力不断限制他。",
    "worldviewRules": {
      "AI边界": "零号只能离线提示，不能直接联网或替主角行动。"
    }
  }
}
\`\`\`
`);

    expect(values.mainConflict).toContain("家庭压力");
    expect(values.worldviewRules).toContain("AI边界");
    expect(values.worldviewRules).toContain("不能直接联网");
  });

  it("reads but does not let AI replace an author-selected narrative perspective", () => {
    const narrativePerspective =
      "【短故事叙事视角：沉浸式第三人称限制】\n主角看不见的，读者不能直接看见。";
    const context = buildProjectSettingGenerationContext({
      project: {
        title: "坠星瓶",
        workType: "short_story",
      },
      setting: {
        narrativePerspective,
      },
    });
    const allowedFields = context.inputJson.allowedFields as Array<{
      name: string;
    }>;

    expect(context.inputText).toContain(narrativePerspective);
    expect(context.inputText).toContain("不得生成、替换或删除 narrativePerspective");
    expect(allowedFields.map((field) => field.name)).not.toContain(
      "narrativePerspective",
    );
    expect(
      parseProjectSettingGenerationOutput(
        JSON.stringify({
          narrativePerspective: "AI 不得采用这个替换值",
          mainConflict: "作者仍可采用的冲突建议",
        }),
      ),
    ).toEqual({
      mainConflict: "作者仍可采用的冲突建议",
    });
  });
});

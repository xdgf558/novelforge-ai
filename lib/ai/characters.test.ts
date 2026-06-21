import { describe, expect, it } from "vitest";
import {
  buildCharacterGenerationContext,
  parseCharacterGenerationOutput,
} from "./characters";

describe("character generation AI helpers", () => {
  it("builds context with existing characters, relationships, and outlines", () => {
    const context = buildCharacterGenerationContext({
      project: {
        title: "离线未来",
        genre: "穿越创业",
        targetAudience: "20-40岁年轻人",
        platform: "个人网站",
        description: "程序员带着断网 AI 回到 1999 年。",
      },
      setting: {
        villainLogic: "反派会追查主角的信息来源。",
      },
      characters: [
        {
          name: "陈远",
          roleInStory: "主角",
          identity: "重生程序员",
          behaviorRules: "不能暴露穿越和 AI 来源。",
        },
      ],
      relationships: [
        {
          relationshipType: "rival",
          status: "tension",
          summary: "陈远与罗文斌围绕电脑培训班资源竞争。",
          sourceCharacter: {
            name: "陈远",
          },
          targetCharacter: {
            name: "罗文斌",
          },
        },
      ],
      outlines: [
        {
          level: "unit",
          title: "电脑培训班争夺",
          startChapter: 3,
          endChapter: 8,
          characterChanges: "谢勇从发小转为执行搭档。",
        },
      ],
      request: {
        targetRole: "阶段对手",
        brief: "需要给主角早期电脑生意制造压力。",
      },
    });

    expect(context.inputContextSummary).toContain("阶段对手");
    expect(context.inputText).toContain("陈远 -> 罗文斌");
    expect(context.inputText).toContain("电脑培训班争夺");
    expect(context.inputJson.relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "陈远",
          target: "罗文斌",
        }),
      ]),
    );
  });

  it("parses fenced JSON output into character draft values", () => {
    const parsed = parseCharacterGenerationOutput(`
\`\`\`json
{
  "character": {
    "name": "罗文斌",
    "roleInStory": "阶段反派",
    "identity": "县城电脑城老板",
    "behaviorRules": ["先压价", "再截货"]
  },
  "suggestedRelationships": [
    "与陈远形成早期商业竞争。"
  ]
}
\`\`\`
`);

    expect(parsed.values).toMatchObject({
      name: "罗文斌",
      roleInStory: "阶段反派",
      identity: "县城电脑城老板",
      behaviorRules: "先压价\n再截货",
    });
    expect(parsed.suggestedRelationships).toEqual([
      "与陈远形成早期商业竞争。",
    ]);
  });
});

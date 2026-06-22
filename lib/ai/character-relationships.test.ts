import { describe, expect, it } from "vitest";
import {
  buildCharacterRelationshipGenerationContext,
  parseCharacterRelationshipGenerationOutput,
} from "./character-relationships";

describe("character relationship generation AI helpers", () => {
  it("builds context with available character ids and existing relationships", () => {
    const context = buildCharacterRelationshipGenerationContext({
      project: {
        title: "离线未来",
        genre: "穿越创业",
        targetAudience: "20-40岁年轻人",
        platform: "个人网站",
        description: "程序员带着断网 AI 回到 1999 年。",
      },
      setting: {
        protagonistFlaw: "主角容易过度依赖 AI。",
      },
      characters: [
        {
          id: "character_chen",
          name: "陈远",
          roleInStory: "主角",
          identity: "重生程序员",
          behaviorRules: "不能暴露穿越和 AI 来源。",
        },
        {
          id: "character_xie",
          name: "谢勇",
          roleInStory: "发小兼搭档",
          identity: "电脑硬件爱好者",
        },
      ],
      relationships: [
        {
          relationshipType: "partner",
          direction: "two_way",
          status: "active",
          summary: "两人确认合伙做电脑维修。",
          sourceCharacterId: "character_chen",
          targetCharacterId: "character_xie",
          sourceCharacter: {
            id: "character_chen",
            name: "陈远",
          },
          targetCharacter: {
            id: "character_xie",
            name: "谢勇",
          },
        },
      ],
      outlines: [
        {
          level: "unit",
          title: "第一桶金",
          startChapter: 3,
          endChapter: 10,
          characterChanges: "谢勇从发小转为执行搭档。",
        },
      ],
      recentChapters: [
        {
          chapterNumber: 2,
          title: "谢勇出场",
          summaryOutput: '{"shortSummary":"陈远和谢勇确认合伙。"}',
        },
      ],
    });

    expect(context.inputContextSummary).toBe(
      "离线未来 人物关系草案生成；角色 2 个；已有关系 1 条",
    );
    expect(context.inputText).toContain("id：character_chen");
    expect(context.inputText).toContain("陈远 -> 谢勇");
    expect(context.inputText).toContain("第一桶金");
    expect(context.inputJson.characters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "character_chen",
          name: "陈远",
        }),
      ]),
    );
  });

  it("clips long character fields in input JSON and prompt text", () => {
    const longRoleText = "定位".repeat(1000);
    const longContextText = "人物关系上下文".repeat(1000);
    const context = buildCharacterRelationshipGenerationContext({
      project: {
        title: "离线未来",
      },
      characters: [
        {
          id: "character_long",
          name: "长文本角色",
          roleInStory: longRoleText,
          identity: longContextText,
          desire: longContextText,
          secret: longContextText,
          knownInfo: longContextText,
          hiddenInfo: longContextText,
          behaviorRules: longContextText,
          characterArc: longContextText,
        },
        {
          id: "character_other",
          name: "另一角色",
        },
      ],
      relationships: [],
    });
    const clippedRoleText = longRoleText.slice(0, 500);
    const clippedContextText = longContextText.slice(0, 800);

    expect(context.inputJson.characters[0]).toMatchObject({
      roleInStory: clippedRoleText,
      identity: clippedContextText,
      desire: clippedContextText,
      secret: clippedContextText,
      knownInfo: clippedContextText,
      hiddenInfo: clippedContextText,
      behaviorRules: clippedContextText,
      characterArc: clippedContextText,
    });
    expect(context.inputText).toContain(`定位：${clippedRoleText}`);
    expect(context.inputText).toContain(`行为规则：${clippedContextText}`);
    expect(context.inputText).not.toContain(longRoleText);
    expect(context.inputText).not.toContain(longContextText);
  });

  it("parses fenced JSON output into relationship drafts", () => {
    const parsed = parseCharacterRelationshipGenerationOutput(`
\`\`\`json
{
  "relationships": [
    {
      "sourceCharacterId": "character_chen",
      "sourceCharacterName": "陈远",
      "targetCharacterId": "character_xie",
      "targetCharacterName": "谢勇",
      "relationshipType": "partner",
      "direction": "two_way",
      "status": "active",
      "summary": "两人是早期创业搭档。",
      "dynamics": ["合伙起步", "后续有利益张力"],
      "evidence": "第2章拍手合伙。",
      "sourceChapterNumber": 2
    }
  ]
}
\`\`\`
`);

    expect(parsed).toEqual([
      expect.objectContaining({
        sourceCharacterId: "character_chen",
        targetCharacterId: "character_xie",
        relationshipType: "partner",
        direction: "two_way",
        status: "active",
        summary: "两人是早期创业搭档。",
        dynamics: "合伙起步\n后续有利益张力",
        sourceChapterNumber: 2,
      }),
    ]);
  });

  it("normalizes unsupported relationship fields and ignores empty drafts", () => {
    const parsed = parseCharacterRelationshipGenerationOutput(
      JSON.stringify({
        relationships: [
          {
            source: {
              id: "character_a",
              name: "角色A",
            },
            target: {
              id: "character_b",
              name: "角色B",
            },
            type: "unknown-type",
            direction: "bad",
            status: "archived",
            summary: "有效摘要",
          },
          {
            sourceCharacterId: "character_a",
            targetCharacterId: "character_b",
          },
        ],
      }),
    );

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      relationshipType: "other",
      direction: "two_way",
      status: "active",
      summary: "有效摘要",
    });
  });
});

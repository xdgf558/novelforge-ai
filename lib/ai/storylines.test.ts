import { describe, expect, it } from "vitest";
import {
  buildStorylineGenerationContext,
  parseStorylineGenerationOutput,
} from "./storylines";

describe("storyline AI generation helpers", () => {
  it("builds bounded context with existing ids and author-control instructions", () => {
    const context = buildStorylineGenerationContext({
      project: {
        title: "离线未来",
        genre: "重生创业",
        targetAudience: "公众号读者",
        description: "失业程序员带着断网 AI 回到 1999 年。",
      },
      setting: {
        sellingPoint: "断网 AI + 年代创业",
        endingDirection: "主角不再依赖 AI，而是在时代里建立自己的秩序。",
      },
      existingStorylines: [
        {
          id: "storyline_1",
          name: "县城第一桶金主线",
          type: "mainline",
          status: "active",
          startChapter: 1,
          endChapter: 30,
          coreGoal: "拿到第一桶金。",
        },
      ],
      characters: [
        {
          id: "character_chenyuan",
          name: "陈远",
          roleInStory: "主角",
          characterArc: "从依赖 AI 到主动承担风险。",
        },
      ],
      foreshadows: [
        {
          id: "foreshadow_supply",
          content: "省城供货渠道存在以次充好问题。",
          status: "planted",
          importance: "high",
        },
      ],
      chapters: [
        {
          id: "chapter_6",
          chapterNumber: 6,
          title: "查分方案",
          status: "final",
          goal: "承接第 5 章，推进查分服务。",
          summaryOutput: '{"shortSummary":"陈远落实查分方案。"}',
        },
      ],
      outlines: [
        {
          id: "outline_unit_1",
          level: "unit",
          title: "第一桶金",
          status: "active",
          startChapter: 3,
          endChapter: 10,
          goal: "完成县城第一阶段商业起步。",
        },
      ],
    });

    expect(context.inputContextSummary).toContain("已有故事线 1 条");
    expect(context.inputJson.characters).toEqual([
      expect.objectContaining({
        id: "character_chenyuan",
        name: "陈远",
      }),
    ]);
    expect(context.inputText).toContain("character_chenyuan");
    expect(context.inputText).toContain("foreshadow_supply");
    expect(context.inputText).toContain("只能引用这些 id");
    expect(context.inputText).toContain("不得宣称已经写入正式故事线");
  });

  it("parses storyline JSON candidates and normalizes unsafe values", () => {
    const drafts = parseStorylineGenerationOutput(`
      {
        "storylines": [
          {
            "name": "谢勇信任考验线",
            "type": "character_arc",
            "status": "archived",
            "startChapter": 2,
            "endChapter": 20,
            "coreGoal": "跟踪兄弟情在利益面前的变化。",
            "currentProgress": "已完成早期合伙与信息源疑问埋设。",
            "characterIds": ["character_xieyong", {"id": "character_chenyuan"}],
            "foreshadowIds": ["foreshadow_trust"],
            "chapterIds": [{"id": "chapter_2"}],
            "outlineIds": ["outline_unit_1"],
            "rationale": "这是长期人物关系张力。"
          }
        ]
      }
    `);

    expect(drafts).toEqual([
      {
        name: "谢勇信任考验线",
        type: "character_arc",
        status: "planned",
        startChapter: 2,
        endChapter: 20,
        coreGoal: "跟踪兄弟情在利益面前的变化。",
        currentProgress: "已完成早期合伙与信息源疑问埋设。",
        notes: "",
        characterIds: ["character_xieyong", "character_chenyuan"],
        foreshadowIds: ["foreshadow_trust"],
        chapterIds: ["chapter_2"],
        outlineIds: ["outline_unit_1"],
        rationale: "这是长期人物关系张力。",
      },
    ]);
  });
});

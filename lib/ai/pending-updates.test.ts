import { describe, expect, it } from "vitest";
import {
  buildPendingUpdateContext,
  buildPendingUpdateContextSummary,
  normalizePendingUpdateSuggestionTargetIds,
  parsePendingUpdateSuggestions,
} from "./pending-updates";

const baseInput = {
  project: {
    title: "借命人",
    genre: "都市悬疑",
    targetAudience: "公众号男性读者",
    platform: "微信公众号",
    description: "寿命交易背后的地下契约网络。",
  },
  setting: {
    worldviewRules: "借命契约需要支付寿命代价。",
    forbiddenItems: "不能让 AI 直接改写正式设定。",
  },
  chapter: {
    chapterNumber: 6,
    title: "倒计时归零",
    goal: "主角确认周医生并非真正死亡。",
    beats: "倒计时归零；周医生留下第二份契约。",
    finalText:
      "倒计时归零后，林野看见周医生从旧楼地下室走出。他承认第一份借命契约只是试探，真正的代价会在七天后生效。",
    notes: "需要提取周医生状态变化和契约规则。",
  },
  characters: [
    {
      id: "character-1",
      name: "周医生",
      roleInStory: "关键线索人物",
      identity: "借命契约知情者",
      latestAppearance: "旧楼地下室",
    },
  ],
  latestSummaryTask: {
    id: "task-1",
    inputContextSummary: "第 6 章章节摘要",
    outputText:
      '{"shortSummary":"周医生现身，说明真正代价七天后生效。","newSettings":["契约代价七天后生效"]}',
    completedAt: new Date("2026-06-17T12:00:00Z"),
  },
  worldRules: [
    {
      id: "rule-1",
      title: "契约代价",
      content: "借命契约需要支付寿命代价。",
      riskLevel: "high",
      isCore: true,
    },
  ],
  foreshadows: [
    {
      id: "foreshadow-1",
      content: "周医生是否真正死亡",
      status: "advancing",
      importance: "high",
      expectedResolveChapter: 6,
    },
  ],
  timelineEvents: [
    {
      id: "timeline-1",
      title: "倒计时开始",
      description: "第一份契约启动。",
      storyTime: "第 1 天",
      status: "active",
    },
  ],
};

describe("pending update context builder", () => {
  it("builds an extraction prompt from final text and formal memory", () => {
    const context = buildPendingUpdateContext(baseInput);

    expect(context.inputText).toContain("第 6 章《倒计时归零》");
    expect(context.inputText).toContain("真正的代价会在七天后生效");
    expect(context.inputText).toContain("[character-1] 周医生");
    expect(context.inputText).toContain("借命契约需要支付寿命代价");
    expect(context.inputText).toContain("[foreshadow-1]");
    expect(context.inputText).toContain("[timeline-1]");
    expect(context.inputText).toContain("updates");
    expect(context.inputJson.chapter).toMatchObject({
      chapterNumber: 6,
      title: "倒计时归零",
      finalTextLength: baseInput.chapter.finalText.length,
    });
  });

  it("clips bulky auxiliary context while keeping the confirmed final text", () => {
    const longBeatsTail = "节拍尾部不应出现在提示词";
    const longSummaryTail = "摘要尾部不应出现在提示词";
    const finalTextTail = "定稿尾部仍应作为提取依据";
    const context = buildPendingUpdateContext({
      ...baseInput,
      chapter: {
        ...baseInput.chapter,
        beats: `${"节拍内容".repeat(500)}${longBeatsTail}`,
        finalText: `${"正文内容".repeat(500)}${finalTextTail}`,
      },
      latestSummaryTask: {
        ...baseInput.latestSummaryTask,
        outputText: `${"摘要内容".repeat(800)}${longSummaryTail}`,
      },
    });
    const inputJson = context.inputJson as {
      chapter: { beats?: string };
      latestSummaryTask?: { outputText?: string } | null;
    };

    expect(context.inputText).toContain(finalTextTail);
    expect(context.inputText).not.toContain(longBeatsTail);
    expect(context.inputText).not.toContain(longSummaryTail);
    expect(String(inputJson.chapter.beats)).not.toContain(longBeatsTail);
    expect(String(inputJson.latestSummaryTask?.outputText)).not.toContain(
      longSummaryTail,
    );
  });

  it("summarizes extraction scope for AI task records", () => {
    expect(buildPendingUpdateContextSummary(baseInput)).toBe(
      `第 6 章《倒计时归零》待审核更新提取；定稿 ${baseInput.chapter.finalText.length} 字；角色 1 个；包含章节摘要任务`,
    );
  });

  it("parses direct updates array output", () => {
    const suggestions = parsePendingUpdateSuggestions(
      JSON.stringify({
        updates: [
          {
            updateType: "update",
            targetType: "world_rule",
            targetId: "rule-1",
            fieldName: "worldviewRules",
            title: "契约代价规则更新",
            content: "真正代价会在七天后生效。",
            reason: "周医生在本章直接承认。",
            riskLevel: "high",
            sourceEvidence: "真正的代价会在七天后生效",
          },
        ],
      }),
    );

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      updateType: "update",
      targetType: "world_rule",
      targetId: "rule-1",
      fieldName: "worldviewRules",
      title: "契约代价规则更新",
      riskLevel: "high",
    });
  });

  it("replaces hallucinated target ids with unique formal-memory ids", () => {
    const suggestions = parsePendingUpdateSuggestions(
      JSON.stringify({
        updates: [
          {
            updateType: "update",
            targetType: "character",
            targetId: "hallucinated-character-id",
            targetName: "周医生",
            title: "更新周医生",
            content: "周医生仍然存活。",
          },
          {
            updateType: "create",
            targetType: "character",
            targetId: "hallucinated-create-id",
            targetName: "新角色",
            title: "新增角色",
            content: "首次登场。",
          },
        ],
      }),
    );

    const normalized = normalizePendingUpdateSuggestionTargetIds(
      suggestions,
      baseInput,
    );

    expect(normalized[0].targetId).toBe("character-1");
    expect(normalized[1].targetId).toBeUndefined();
  });

  it("drops an unverified target id when no unique formal target matches", () => {
    const suggestions = parsePendingUpdateSuggestions(
      JSON.stringify({
        updates: [
          {
            updateType: "update",
            targetType: "character",
            targetId: "hallucinated-character-id",
            targetName: "同名角色",
            title: "更新同名角色",
            content: "新信息。",
          },
        ],
      }),
    );

    const normalized = normalizePendingUpdateSuggestionTargetIds(
      suggestions,
      {
        ...baseInput,
        characters: [
          { id: "character-1", name: "同名角色" },
          { id: "character-2", name: "同名角色" },
        ],
      },
    );

    expect(normalized[0].targetId).toBeUndefined();
  });

  it("prefers a unique formal name when a valid id points at another character", () => {
    const suggestions = parsePendingUpdateSuggestions(
      JSON.stringify({
        updates: [
          {
            updateType: "update",
            targetType: "character",
            targetId: "character-2",
            targetName: "周医生",
            title: "更新周医生",
            content: "周医生仍然存活。",
          },
        ],
      }),
    );

    const normalized = normalizePendingUpdateSuggestionTargetIds(
      suggestions,
      {
        ...baseInput,
        characters: [
          ...baseInput.characters,
          { id: "character-2", name: "林野" },
        ],
      },
    );

    expect(normalized[0].targetId).toBe("character-1");
  });

  it("salvages updates when optional evidence contains unescaped quote fragments", () => {
    const suggestions = parsePendingUpdateSuggestions(`{
      "updates": [
        {
          "updateType": "update",
          "targetType": "project_setting",
          "targetName": "世界观规则",
          "fieldName": "worldviewRules",
          "title": "零号能力边界扩展：承认“信号”盲区",
          "content": "在AI能力描述中补充：零号不掌握人类的非理性信号，在信息不充分时主动标记“数据不足”。",
          "reason": "第9章中零号明确表示模型里没有“信号”这个变量。",
          "riskLevel": "medium",
          "sourceEvidence": "零号回复：“你开始计算‘信号’了。我的模型里没有‘信号’这个变量。”以及“你已经计算过了。反对不需要重复。","你已经有解了。赌。”"
        }
      ]
    }`);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      updateType: "update",
      targetType: "project_setting",
      fieldName: "worldviewRules",
      title: "零号能力边界扩展：承认“信号”盲区",
      riskLevel: "medium",
    });
  });

  it("converts grouped schema output into reviewable updates", () => {
    const suggestions = parsePendingUpdateSuggestions(
      JSON.stringify({
        new_characters: [
          {
            name: "周医生",
            identity: "借命契约知情者",
            reason: "本章确认他仍然存活。",
          },
        ],
        new_world_rules: ["真正代价会在七天后生效。"],
        timeline_changes: ["第六章夜晚，周医生在旧楼地下室现身。"],
      }),
    );

    expect(suggestions.map((suggestion) => suggestion.targetType)).toEqual([
      "character",
      "world_rule",
      "timeline_event",
    ]);
    expect(suggestions.some((suggestion) => suggestion.riskLevel === "high")).toBe(
      true,
    );
  });
});

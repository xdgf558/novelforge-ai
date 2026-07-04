import { describe, expect, it } from "vitest";
import {
  buildPendingUpdateContext,
  buildPendingUpdateContextSummary,
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
};

describe("pending update context builder", () => {
  it("builds an extraction prompt from final text and formal memory", () => {
    const context = buildPendingUpdateContext(baseInput);

    expect(context.inputText).toContain("第 6 章《倒计时归零》");
    expect(context.inputText).toContain("真正的代价会在七天后生效");
    expect(context.inputText).toContain("周医生");
    expect(context.inputText).toContain("借命契约需要支付寿命代价");
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
            targetType: "project_setting",
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
      targetType: "project_setting",
      fieldName: "worldviewRules",
      title: "契约代价规则更新",
      riskLevel: "high",
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

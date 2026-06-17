import { describe, expect, it } from "vitest";
import {
  buildContinuityContext,
  buildContinuityContextSummary,
  parseContinuityIssues,
} from "./continuity-reports";

const baseInput = {
  project: {
    title: "借命人",
    genre: "都市悬疑",
    targetAudience: "公众号男性读者",
    platform: "微信公众号",
    description: "寿命交易背后的地下契约网络。",
  },
  setting: {
    worldviewRules: "借命契约必须由本人签名确认。",
    forbiddenItems: "不能让主角无铺垫获得超自然能力。",
  },
  chapter: {
    chapterNumber: 8,
    title: "无名签字",
    goal: "主角发现契约被他人代签。",
    beats: "林野找到契约；签名不是本人笔迹。",
    finalText:
      "林野发现契约上的签名不是周医生本人写下的，却仍然让契约立即生效。他还突然听见所有契约低语。",
    notes: "重点检查契约规则和能力边界。",
  },
  characters: [
    {
      name: "林野",
      roleInStory: "主角",
      identity: "借命契约调查者",
      abilityBoundary: "只能看见倒计时，不能直接听见契约声音。",
      behaviorRules: "遇到异常先求证。",
    },
  ],
  worldRules: [
    {
      title: "本人签名规则",
      content: "借命契约必须由本人签名确认，否则不能生效。",
      riskLevel: "high",
      status: "active",
    },
  ],
  foreshadows: [
    {
      content: "周医生留下的第二份契约仍未解释。",
      status: "planted",
      importance: "high",
    },
  ],
  timelineEvents: [
    {
      title: "周医生现身",
      description: "第六章夜晚，周医生在旧楼地下室现身。",
      storyTime: "第六章夜晚",
    },
  ],
  recentSummaryTasks: [
    {
      id: "summary-task-1",
      inputContextSummary: "第 7 章章节摘要",
      outputText: '{"shortSummary":"林野只能看见倒计时。"}',
      completedAt: new Date("2026-06-17T12:00:00Z"),
    },
  ],
  pendingUpdates: [
    {
      title: "契约声音能力待审",
      status: "pending",
      targetType: "character",
      riskLevel: "high",
      proposedContent: "林野可能听见契约低语。",
    },
  ],
};

describe("continuity context builder", () => {
  it("builds a continuity prompt from final text and formal memory", () => {
    const context = buildContinuityContext(baseInput);

    expect(context.inputText).toContain("第 8 章《无名签字》");
    expect(context.inputText).toContain("必须由本人签名确认");
    expect(context.inputText).toContain("只能看见倒计时");
    expect(context.inputText).toContain("契约上的签名不是周医生本人写下的");
    expect(context.inputText).toContain("overall_risk_level");
    expect(context.inputJson.chapter).toMatchObject({
      chapterNumber: 8,
      title: "无名签字",
      finalTextLength: baseInput.chapter.finalText.length,
    });
  });

  it("summarizes continuity check scope for AI task records", () => {
    expect(buildContinuityContextSummary(baseInput)).toBe(
      `第 8 章《无名签字》连续性检查；定稿 ${baseInput.chapter.finalText.length} 字；角色 1 个；世界规则 1 条；伏笔 1 条；时间线 1 条；摘要 1 条`,
    );
  });

  it("parses document-style continuity issues", () => {
    const issues = parseContinuityIssues(
      JSON.stringify({
        chapter_number: 8,
        overall_risk_level: "high",
        issues: [
          {
            issue_type: "世界观规则冲突",
            severity: "high",
            description: "代签契约立即生效，违反本人签名规则。",
            evidence: "签名不是周医生本人写下的，却仍然让契约立即生效。",
            related_characters: ["周医生"],
            related_rules: ["借命契约必须由本人签名确认。"],
            fix_suggestion: "解释代签例外，或改为契约暂未生效。",
          },
        ],
      }),
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      severity: "high",
      category: "world_rule",
      description: "代签契约立即生效，违反本人签名规则。",
      conflictingMemory: "借命契约必须由本人签名确认。",
      suggestedFix: "解释代签例外，或改为契约暂未生效。",
    });
  });

  it("parses camelCase issue variants", () => {
    const issues = parseContinuityIssues(
      JSON.stringify({
        issues: [
          {
            issueType: "character knowledge",
            severity: "critical",
            summary: "角色知道了隐藏信息。",
            relatedCharacters: ["林野"],
            relatedRules: ["林野不知道契约来源。"],
            suggestion: "补一段信息来源。",
          },
        ],
      }),
    );

    expect(issues[0]).toMatchObject({
      severity: "critical",
      category: "character_knowledge",
      evidence: "林野",
      conflictingMemory: "林野不知道契约来源。",
    });
  });
});

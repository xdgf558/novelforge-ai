import { clipText } from "./chapter-beats";
import {
  buildPromptSourceText,
  confirmedChapterText,
} from "./chapter-summaries";
import {
  normalizeContinuityCategory,
  normalizeContinuitySeverity,
  type ContinuityCategory,
  type ContinuitySeverity,
} from "../continuity-reports";
import {
  projectSettingFields,
  type ProjectSettingFieldName,
} from "../project-setting-fields";

export type ContinuityProjectContext = {
  title: string;
  genre?: string | null;
  targetAudience?: string | null;
  platform?: string | null;
  description?: string | null;
  wechatPositioning?: string | null;
};

export type ContinuitySettingContext = Partial<
  Record<ProjectSettingFieldName, string | null>
>;

export type ContinuityChapterContext = {
  chapterNumber: number;
  title: string;
  goal?: string | null;
  beats?: string | null;
  finalText?: string | null;
  notes?: string | null;
};

export type ContinuityCharacterContext = {
  name: string;
  roleInStory?: string | null;
  identity?: string | null;
  speakingStyle?: string | null;
  knownInfo?: string | null;
  hiddenInfo?: string | null;
  abilityBoundary?: string | null;
  behaviorRules?: string | null;
  latestAppearance?: string | null;
  notes?: string | null;
};

export type ContinuityWorldRuleContext = {
  title: string;
  content: string;
  category?: string | null;
  scope?: string | null;
  relatedCharacters?: string | null;
  relatedLocations?: string | null;
  relatedOrganizations?: string | null;
  isCore?: boolean | null;
  riskLevel?: string | null;
  status?: string | null;
};

export type ContinuityForeshadowContext = {
  content: string;
  status?: string | null;
  importance?: string | null;
  expectedResolveChapter?: number | null;
  relatedCharacters?: string | null;
  relatedLocations?: string | null;
  relatedFactions?: string | null;
};

export type ContinuityTimelineEventContext = {
  title: string;
  description: string;
  storyTime?: string | null;
  relatedCharacters?: string | null;
  location?: string | null;
  impact?: string | null;
};

export type ContinuitySummaryTaskContext = {
  id: string;
  inputContextSummary: string;
  outputText?: string | null;
  completedAt?: Date | null;
};

export type ContinuityPendingUpdateContext = {
  title: string;
  status: string;
  targetType: string;
  riskLevel: string;
  proposedContent: string;
};

export type ContinuityContextInput = {
  project: ContinuityProjectContext;
  setting?: ContinuitySettingContext | null;
  chapter: ContinuityChapterContext;
  characters: readonly ContinuityCharacterContext[];
  worldRules: readonly ContinuityWorldRuleContext[];
  foreshadows: readonly ContinuityForeshadowContext[];
  timelineEvents: readonly ContinuityTimelineEventContext[];
  recentSummaryTasks: readonly ContinuitySummaryTaskContext[];
  pendingUpdates: readonly ContinuityPendingUpdateContext[];
};

export type BuiltContinuityContext = {
  inputText: string;
  inputJson: Record<string, unknown>;
  inputContextSummary: string;
};

export type ContinuityIssueSuggestion = {
  severity: ContinuitySeverity;
  category: ContinuityCategory;
  title: string;
  description: string;
  evidence?: string;
  conflictingMemory?: string;
  suggestedFix?: string;
  payload: Record<string, unknown>;
};

const finalTextPreviewMaxLength = 1200;

export function buildContinuityContext(
  input: ContinuityContextInput,
): BuiltContinuityContext {
  const sourceText = confirmedChapterText(input.chapter);
  const promptSourceText = buildPromptSourceText(sourceText);
  const settingItems = buildSettingItems(input.setting);
  const characterItems = input.characters.map(buildCharacterLine).filter(Boolean);
  const worldRuleItems = input.worldRules.map(buildWorldRuleLine).filter(Boolean);
  const foreshadowItems = input.foreshadows.map(buildForeshadowLine).filter(Boolean);
  const timelineItems = input.timelineEvents
    .map(buildTimelineEventLine)
    .filter(Boolean);
  const summaryItems = input.recentSummaryTasks
    .map(buildSummaryTaskLine)
    .filter(Boolean);
  const pendingUpdateItems = input.pendingUpdates
    .map(buildPendingUpdateLine)
    .filter(Boolean);

  const inputJson = {
    project: {
      title: input.project.title,
      genre: clean(input.project.genre),
      targetAudience: clean(input.project.targetAudience),
      platform: clean(input.project.platform),
      description: clipText(input.project.description),
      wechatPositioning: clipText(input.project.wechatPositioning),
    },
    chapter: {
      chapterNumber: input.chapter.chapterNumber,
      title: input.chapter.title,
      goal: clean(input.chapter.goal),
      beats: clipText(input.chapter.beats),
      notes: clean(input.chapter.notes),
      finalTextLength: sourceText.length,
      finalTextPreview: clipText(sourceText, finalTextPreviewMaxLength),
      finalTextPromptLength: promptSourceText.length,
      finalTextPromptWasExcerpted: promptSourceText.wasExcerpted,
      finalTextPromptStrategy: promptSourceText.strategy,
    },
    setting: Object.fromEntries(settingItems),
    characters: characterItems,
    worldRules: worldRuleItems,
    foreshadows: foreshadowItems,
    timelineEvents: timelineItems,
    recentSummaryTasks: input.recentSummaryTasks.map((task) => ({
      id: task.id,
      inputContextSummary: task.inputContextSummary,
      outputText: clipText(task.outputText, 1600),
    })),
    pendingUpdates: input.pendingUpdates.map((update) => ({
      title: update.title,
      status: update.status,
      targetType: update.targetType,
      riskLevel: update.riskLevel,
      proposedContent: clipText(update.proposedContent, 600),
    })),
    outputRequirements: [
      "只输出 JSON，不要输出 Markdown 说明。",
      "只报告真实连续性风险，不要为了凑数编造问题。",
      "不要自动修改正式记忆；修复建议只能供作者审阅。",
      "issues 为空数组代表未发现明确问题。",
      ...(input.setting?.narrativePerspective
        ? [
            "已设置正式叙事视角时，必须检查跳视角和越权信息；相关问题使用 issue_type=narrative_perspective。",
          ]
        : []),
    ],
  };

  const inputText = [
    "# 任务",
    `检查第 ${input.chapter.chapterNumber} 章《${input.chapter.title}》定稿正文是否与既有正式故事记忆冲突。`,
    "你只输出连续性检查报告，不得宣称已经修改正式设定、角色、时间线、伏笔或章节正文。",
    "",
    "# 重点检查",
    "1. 人物是否知道了不该知道的信息。",
    "2. 人物性格、说话方式或行为边界是否突变。",
    "3. 世界观规则、能力边界或禁写事项是否被破坏。",
    "4. 上一章结尾和最近章节摘要是否能自然接上。",
    "5. 时间线先后、人物位置或事件顺序是否冲突。",
    "6. 伏笔是否重复、断裂、过期或被错误回收。",
    "7. 反派是否明显降智，主角是否突然获得未经铺垫的能力。",
    "8. 是否存在公众号发布风险。",
    ...(input.setting?.narrativePerspective
      ? [
          "9. 是否违反正式叙事视角：同场景跳入其他人物内心，或由旁白泄露当前视角人物无权知道的信息。",
        ]
      : []),
    "",
    "# 项目基础信息",
    lines([
      ["项目", input.project.title],
      ["题材", input.project.genre],
      ["目标读者", input.project.targetAudience],
      ["平台", input.project.platform],
      ["简介", input.project.description],
      ["公众号定位", input.project.wechatPositioning],
    ]),
    "",
    "# 当前正式总设定档",
    settingItems.length > 0
      ? settingItems
          .map(([name, value]) => `- ${settingLabel(name)}(${name}): ${value}`)
          .join("\n")
      : "未填写项目设定。",
    "",
    "# 当前正式角色档案",
    characterItems.length > 0 ? characterItems.join("\n") : "暂无角色资料。",
    "",
    "# 当前正式世界规则",
    worldRuleItems.length > 0 ? worldRuleItems.join("\n") : "暂无世界规则。",
    "",
    "# 当前伏笔池",
    foreshadowItems.length > 0 ? foreshadowItems.join("\n") : "暂无伏笔记录。",
    "",
    "# 当前时间线事件",
    timelineItems.length > 0 ? timelineItems.join("\n") : "暂无时间线事件。",
    "",
    "# 最近章节摘要任务输出",
    summaryItems.length > 0 ? summaryItems.join("\n\n") : "暂无最近章节摘要。",
    "",
    "# 最近待审更新",
    pendingUpdateItems.length > 0 ? pendingUpdateItems.join("\n") : "暂无待审更新。",
    "",
    "# 当前章节元信息",
    lines([
      ["章节目标", input.chapter.goal],
      ["章节节拍", input.chapter.beats],
      ["作者备注", input.chapter.notes],
    ]),
    "",
    "# 当前章节定稿正文",
    promptSourceText.text ||
      "未填写定稿正文。禁止基于草稿正文进行连续性检查。",
    promptSourceText.wasExcerpted
      ? "\n[系统说明：定稿较长，以上为首段/中段/尾段摘录；不得臆造省略部分。]"
      : "",
    "",
    "# 输出 JSON 字段",
    "- chapter_number: 当前章节号。",
    "- overall_risk_level: low, medium, high, critical。",
    "- issues: 问题数组；如果没有明确问题，返回空数组。",
    "- 每个 issue 包含 issue_type, severity, description, evidence, related_characters, related_rules, fix_suggestion。",
    ...(input.setting?.narrativePerspective
      ? [
          "- 叙事视角问题的 issue_type 必须为 narrative_perspective，并引用可核验正文作为 evidence。",
        ]
      : []),
  ].join("\n");

  return {
    inputText,
    inputJson,
    inputContextSummary: buildContinuityContextSummary(input),
  };
}

export function buildContinuityContextSummary(input: ContinuityContextInput) {
  const sourceText = confirmedChapterText(input.chapter);

  return [
    `第 ${input.chapter.chapterNumber} 章《${input.chapter.title}》连续性检查`,
    sourceText ? `定稿 ${sourceText.length} 字` : "缺少定稿正文",
    `角色 ${input.characters.length} 个`,
    `世界规则 ${input.worldRules.length} 条`,
    `伏笔 ${input.foreshadows.length} 条`,
    `时间线 ${input.timelineEvents.length} 条`,
    `摘要 ${input.recentSummaryTasks.length} 条`,
  ].join("；");
}

export function parseContinuityIssues(
  outputText?: string | null,
): ContinuityIssueSuggestion[] {
  const parsed = parseJsonPayload(outputText);

  if (!isRecord(parsed) || !Array.isArray(parsed.issues)) {
    return [];
  }

  return parsed.issues
    .map(normalizeContinuityIssue)
    .filter((issue): issue is ContinuityIssueSuggestion => Boolean(issue));
}

function normalizeContinuityIssue(
  value: unknown,
): ContinuityIssueSuggestion | null {
  if (!isRecord(value)) {
    return null;
  }

  const description = clean(
    stringValue(value.description) ??
      stringValue(value.summary) ??
      stringValue(value.issue),
  );

  if (!description) {
    return null;
  }

  const issueType = clean(
    stringValue(value.issue_type) ??
      stringValue(value.issueType) ??
      stringValue(value.category),
  );
  const severity = normalizeContinuitySeverity(
    stringValue(value.severity) ?? stringValue(value.riskLevel),
  );
  const category = normalizeContinuityCategory(issueType || description);
  const relatedCharacters = arrayToText(
    value.related_characters ?? value.relatedCharacters,
  );
  const relatedRules = arrayToText(value.related_rules ?? value.relatedRules);
  const evidence = clean(
    stringValue(value.evidence) ??
      stringValue(value.sourceEvidence) ??
      relatedCharacters,
  );
  const conflictingMemory = clean(
    stringValue(value.conflictingMemory) ??
      stringValue(value.conflicting_memory) ??
      relatedRules,
  );
  const suggestedFix = clean(
    stringValue(value.fix_suggestion) ??
      stringValue(value.fixSuggestion) ??
      stringValue(value.suggestion) ??
      stringValue(value.suggestedFix),
  );
  const title = clean(stringValue(value.title)) || buildIssueTitle(issueType, description);

  return {
    severity,
    category,
    title,
    description,
    evidence: evidence || undefined,
    conflictingMemory: conflictingMemory || undefined,
    suggestedFix: suggestedFix || undefined,
    payload: value,
  };
}

function buildSettingItems(setting?: ContinuitySettingContext | null) {
  if (!setting) {
    return [];
  }

  return projectSettingFields
    .map((field) => [field.name, clipText(setting[field.name], 600)] as const)
    .filter(([, value]) => Boolean(value));
}

function buildCharacterLine(character: ContinuityCharacterContext) {
  const details = [
    character.roleInStory,
    character.identity,
    character.speakingStyle ? `说话风格：${character.speakingStyle}` : "",
    character.knownInfo ? `已知信息：${character.knownInfo}` : "",
    character.hiddenInfo ? `隐藏信息：${character.hiddenInfo}` : "",
    character.abilityBoundary ? `能力边界：${character.abilityBoundary}` : "",
    character.behaviorRules ? `行为规则：${character.behaviorRules}` : "",
    character.latestAppearance ? `最近出场：${character.latestAppearance}` : "",
    character.notes ? `备注：${character.notes}` : "",
  ]
    .map(clean)
    .filter(Boolean)
    .map((value) => clipText(value, 240))
    .join("；");

  return `- ${character.name}${details ? `：${details}` : ""}`;
}

function buildWorldRuleLine(rule: ContinuityWorldRuleContext) {
  const details = [
    rule.isCore ? "核心规则" : "",
    rule.category,
    rule.scope ? `适用范围：${rule.scope}` : "",
    rule.relatedCharacters ? `人物：${rule.relatedCharacters}` : "",
    rule.relatedLocations ? `地点：${rule.relatedLocations}` : "",
    rule.relatedOrganizations ? `组织：${rule.relatedOrganizations}` : "",
  ]
    .map(clean)
    .filter(Boolean)
    .join("；");

  return `- ${rule.title}：${clipText(rule.content, 400)}${
    details ? `（${clipText(details, 200)}）` : ""
  }`;
}

function buildForeshadowLine(foreshadow: ContinuityForeshadowContext) {
  const details = [
    foreshadow.expectedResolveChapter
      ? `预计第 ${foreshadow.expectedResolveChapter} 章回收`
      : "",
    foreshadow.relatedCharacters ? `人物：${foreshadow.relatedCharacters}` : "",
    foreshadow.relatedLocations ? `地点：${foreshadow.relatedLocations}` : "",
    foreshadow.relatedFactions ? `势力：${foreshadow.relatedFactions}` : "",
  ]
    .map(clean)
    .filter(Boolean)
    .join("；");

  return `- ${foreshadow.status || "unknown"} / ${
    foreshadow.importance || "medium"
  }：${clipText(foreshadow.content, 320)}${
    details ? `（${clipText(details, 180)}）` : ""
  }`;
}

function buildTimelineEventLine(event: ContinuityTimelineEventContext) {
  const details = [
    event.storyTime,
    event.location ? `地点：${event.location}` : "",
    event.relatedCharacters ? `人物：${event.relatedCharacters}` : "",
    event.impact,
  ]
    .map(clean)
    .filter(Boolean)
    .join("；");

  return `- ${event.title}：${clipText(event.description, 340)}${
    details ? `（${clipText(details, 200)}）` : ""
  }`;
}

function buildSummaryTaskLine(task: ContinuitySummaryTaskContext) {
  return [
    `## ${task.inputContextSummary}`,
    clipText(task.outputText, 1200) || "摘要任务无输出。",
  ].join("\n");
}

function buildPendingUpdateLine(update: ContinuityPendingUpdateContext) {
  return `- ${update.status} / ${update.targetType} / ${update.riskLevel}：${
    update.title
  }；${clipText(update.proposedContent, 400)}`;
}

function lines(items: readonly (readonly [string, string | number | null | undefined])[]) {
  return items
    .map(([label, value]) => `- ${label}: ${clean(String(value ?? "")) || "未填写"}`)
    .join("\n");
}

function settingLabel(name: ProjectSettingFieldName) {
  return projectSettingFields.find((field) => field.name === name)?.label ?? name;
}

function buildIssueTitle(issueType: string, description: string) {
  return issueType
    ? `${issueType}：${clipText(description, 40)}`
    : clipText(description, 48);
}

function parseJsonPayload(value?: string | null) {
  const cleaned = clean(value);

  if (!cleaned) {
    return null;
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);

    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[1].trim());
    } catch {
      return null;
    }
  }
}

function arrayToText(value: unknown) {
  return arrayValue(value)
    .map((item) => (typeof item === "string" ? item : stringifyUnknown(item)))
    .map(clean)
    .filter(Boolean)
    .join("；");
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function stringifyUnknown(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value == null) {
    return "";
  }

  return JSON.stringify(value);
}

function clean(value?: string | null) {
  return value?.trim().replace(/\n{3,}/g, "\n\n") ?? "";
}

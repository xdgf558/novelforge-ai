import { clipText } from "./chapter-beats";
import {
  normalizeContinuityCategory,
  normalizeContinuitySeverity,
  type ContinuityCategory,
  type ContinuitySeverity,
} from "../continuity-reports";
import {
  formatShortStoryBlueprintForContext,
  shortStoryBlueprintValuesFromRecord,
  type ShortStoryBlueprintFieldName,
} from "../short-stories/blueprint-fields";
import { chapterFinalTextHash } from "../chapters/source-text";

export const shortStoryWholeReviewTaskType = "short_story_whole_review";
export const shortStoryWholeReviewTemplateKey = shortStoryWholeReviewTaskType;
export const shortStoryWholeReviewMinimumUnits = 2;
export const shortStoryWholeReviewPromptBudget = 48_000;

type Scalar = string | number | boolean | Date | null | undefined;

export type ShortStoryWholeReviewUnit = {
  id: string;
  chapterNumber: number;
  title: string;
  status: string;
  goal?: string | null;
  beats?: string | null;
  unitSceneMovement?: string | null;
  unitConflict?: string | null;
  unitTurn?: string | null;
  unitPayoffMovement?: string | null;
  unitWordTarget?: number | null;
  wordCount?: number | null;
  finalText?: string | null;
};

export type ShortStoryWholeReviewInput = {
  project: {
    title?: Scalar;
    genre?: Scalar;
    targetAudience?: Scalar;
    platform?: Scalar;
    totalWordTarget?: Scalar;
    description?: Scalar;
  };
  setting?: Record<string, Scalar> | null;
  blueprint?: Partial<
    Record<ShortStoryBlueprintFieldName, string | null>
  > | null;
  characters: ReadonlyArray<{
    name?: Scalar;
    roleInStory?: Scalar;
    identity?: Scalar;
    desire?: Scalar;
    fear?: Scalar;
    secret?: Scalar;
    characterArc?: Scalar;
    behaviorRules?: Scalar;
  }>;
  foreshadows: ReadonlyArray<{
    id: string;
    content: string;
    status?: string | null;
    importance?: string | null;
    expectedResolveChapter?: number | null;
  }>;
  timelineEvents: ReadonlyArray<{
    title: string;
    description: string;
    storyTime?: string | null;
    location?: string | null;
  }>;
  seriesContext?: string | null;
  units: readonly ShortStoryWholeReviewUnit[];
};

export type ShortStoryWholeReviewIssue = {
  targetUnitId: string;
  targetUnitNumber?: number;
  relatedUnitIds: string[];
  category: ContinuityCategory;
  severity: ContinuitySeverity;
  title: string;
  description: string;
  evidence?: string;
  reviewBasis?: string;
  suggestedFix?: string;
};

export type ShortStoryWholeReviewViewpointAudit = {
  checked: boolean;
  viewpointViolationCount: number;
  unauthorizedKnowledgeLeakCount: number;
};

export type ShortStoryWholeReviewResult = {
  overallRiskLevel: ContinuitySeverity;
  summary: string;
  strengths: string[];
  priority: string;
  viewpointAudit: ShortStoryWholeReviewViewpointAudit;
  issues: ShortStoryWholeReviewIssue[];
};

const reviewSettingFields = [
  "mainConflict",
  "protagonistDesire",
  "protagonistFlaw",
  "villainLogic",
  "narrativePerspective",
  "styleSample",
  "emotionalTone",
  "readerExpectation",
  "endingDirection",
  "forbiddenItems",
] as const;

export function buildShortStoryWholeReviewContext(
  input: ShortStoryWholeReviewInput,
) {
  const projectTitle = stringValue(input.project.title) || "未命名短故事";
  const units = input.units
    .filter((unit) => Boolean(unit.finalText?.trim()))
    .sort((left, right) => left.chapterNumber - right.chapterNumber);
  const perUnitBudget = Math.min(
    12_000,
    Math.max(800, Math.floor(shortStoryWholeReviewPromptBudget / Math.max(1, units.length))),
  );
  const promptUnits = units.map((unit) =>
    buildPromptUnit(unit, perUnitBudget),
  );
  const blueprint = shortStoryBlueprintValuesFromRecord(input.blueprint);
  const setting = Object.fromEntries(
    reviewSettingFields.map((fieldName) => [
      fieldName,
      clipText(
        stringValue(input.setting?.[fieldName]),
        fieldName === "styleSample" || fieldName === "narrativePerspective"
          ? 1600
          : 800,
      ),
    ]),
  );
  const characters = input.characters.slice(0, 16).map((character) => ({
    name: clipText(stringValue(character.name), 120),
    roleInStory: clipText(stringValue(character.roleInStory), 300),
    identity: clipText(stringValue(character.identity), 400),
    desire: clipText(stringValue(character.desire), 500),
    fear: clipText(stringValue(character.fear), 400),
    secret: clipText(stringValue(character.secret), 500),
    characterArc: clipText(stringValue(character.characterArc), 600),
    behaviorRules: clipText(stringValue(character.behaviorRules), 500),
  }));
  const foreshadows = [...input.foreshadows]
    .sort(compareForeshadowPriority)
    .slice(0, 40)
    .map((foreshadow) => ({
      id: foreshadow.id,
      content: clipText(foreshadow.content, 500),
      status: foreshadow.status ?? "planted",
      importance: foreshadow.importance ?? "medium",
      expectedResolveChapter: foreshadow.expectedResolveChapter ?? null,
    }));
  const timelineEvents = input.timelineEvents.slice(0, 40).map((event) => ({
    title: clipText(event.title, 240),
    description: clipText(event.description, 600),
    storyTime: clipText(event.storyTime, 200),
    location: clipText(event.location, 160),
  }));
  const originalTextLength = promptUnits.reduce(
    (total, unit) => total + unit.sourceLength,
    0,
  );
  const promptTextLength = promptUnits.reduce(
    (total, unit) => total + unit.promptText.length,
    0,
  );

  return {
    inputContextSummary: [
      `${projectTitle} 整篇闭环审校`,
      `确认单元 ${units.length} 个`,
      `定稿 ${originalTextLength} 字`,
      promptTextLength < originalTextLength
        ? `模型审校文本 ${promptTextLength} 字（分单元摘录）`
        : `模型审校文本 ${promptTextLength} 字`,
      `角色 ${characters.length} 个`,
      `未结伏笔 ${foreshadows.length} 条`,
      input.seriesContext ? "包含系列连续性" : "独立短故事",
    ].join("；"),
    inputJson: {
      project: {
        title: projectTitle,
        genre: stringValue(input.project.genre),
        targetAudience: stringValue(input.project.targetAudience),
        platform: stringValue(input.project.platform),
        totalWordTarget: numberValue(input.project.totalWordTarget),
        description: clipText(stringValue(input.project.description), 1200),
      },
      blueprint,
      seriesContext: clipText(input.seriesContext, 12000),
      setting,
      characters,
      foreshadows,
      timelineEvents,
      units: promptUnits.map((unit) => ({
        id: unit.id,
        unitNumber: unit.chapterNumber,
        title: unit.title,
        status: unit.status,
        sourceTextHash: unit.sourceTextHash,
        sourceLength: unit.sourceLength,
        promptLength: unit.promptText.length,
        promptWasExcerpted: unit.wasExcerpted,
        excerptStrategy: unit.strategy,
        finalTextPreview: clipText(unit.sourceText, 600),
      })),
      reviewDimensions: [
        "motivation",
        "timeline",
        "repeated_information",
        "pacing_gap",
        "opening_promise",
        "reversal_setup",
        "unresolved_payoff",
        "narrative_perspective",
      ],
      viewpointAuditMetrics: [
        "viewpointViolationCount",
        "unauthorizedKnowledgeLeakCount",
      ],
    },
    inputText: [
      "# 任务",
      `对短故事《${projectTitle}》的全部已确认写作单元进行整篇闭环审校。`,
      "只输出供作者审阅的修改建议，不得重写、替换或宣称已经修改任何定稿正文。",
      "每条问题必须绑定一个最适合动手修改的 targetUnitId；跨单元问题可另列 relatedUnitIds。",
      "",
      "# 必查维度",
      "1. 人物动机：关键行动、选择和情绪变化是否有足够原因与压力。",
      "2. 时间顺序：事件先后、人物位置、昼夜或间隔是否自洽。",
      "3. 信息重复：是否重复解释人物、设定、线索或上一单元已经明确的事实。",
      "4. 节奏缺口：是否存在无因果压力的跳跃、拖沓过场或关键变化缺场。",
      "5. 开篇承诺：开头提出的异常、危险、关系和阅读期待是否得到回应。",
      "6. 反转铺垫：每次反转是否可由前文信息和人物选择回溯验证。",
      "7. 未兑现项：蓝图必须兑现、正式伏笔和情绪债是否仍悬而未决。",
      setting.narrativePerspective
        ? "8. 叙事视角：逐处检查跳入他人内心、旁白泄露越权信息、场内无标记切换视角，或违反已确认感官距离的段落。"
        : "",
      "",
      "# 项目",
      `标题：${projectTitle}`,
      `题材：${stringValue(input.project.genre) || "未设置"}`,
      `目标读者：${stringValue(input.project.targetAudience) || "未设置"}`,
      `目标字数：${numberValue(input.project.totalWordTarget) ?? "未设置"}`,
      `简介：${clipText(stringValue(input.project.description), 1200) || "未设置"}`,
      "",
      "# 正式短故事蓝图",
      formatShortStoryBlueprintForContext(blueprint, 1800) || "未建立正式蓝图。",
      "",
      "# 系列短故事连续性",
      clipText(input.seriesContext, 12000) || "当前为独立短故事，没有系列级约束。",
      "",
      "# 正式设定摘要",
      formatRecord(setting) || "暂无相关正式设定。",
      "",
      "# 正式角色动机与边界",
      formatCharacters(characters) || "暂无角色资料。",
      "",
      "# 尚未闭环的正式伏笔",
      formatForeshadows(foreshadows) || "暂无未闭环伏笔。",
      "",
      "# 正式时间线",
      formatTimeline(timelineEvents) || "暂无时间线记录。",
      "",
      "# 已确认写作单元索引",
      promptUnits
        .map(
          (unit) =>
            `- [${unit.id}] 单元 ${unit.chapterNumber}《${unit.title}》；目标：${clipText(unit.goal, 260) || "未填写"}；转折：${clipText(unit.unitTurn, 260) || "未填写"}；兑现推进：${clipText(unit.unitPayoffMovement, 260) || "未填写"}`,
        )
        .join("\n") || "没有可审校的已确认单元。",
      "",
      "# 已确认单元正文",
      promptUnits.map(formatPromptUnit).join("\n\n") || "没有定稿正文。",
      "",
      "# 审校边界",
      "- 没有明确证据时不要为了凑数制造问题。",
      "- targetUnitId 和 relatedUnitIds 只能引用上方索引中的 ID。",
      "- suggestedFix 只能描述修改目的、位置和核对点，不得输出整段替换稿。",
      "- 单元正文若标记为摘录，不能断言省略部分不存在某个信息。",
      input.seriesContext
        ? "- 同时核对系列共享世界观、核心人物累计状态、关系与已知信息边界；本篇长期谜团推进不能破坏独立结局。"
        : "",
      setting.narrativePerspective
        ? "- viewpointAudit.checked 必须为 true；viewpointViolationCount 统计有正文证据的叙事视角违规总数，unauthorizedKnowledgeLeakCount 只统计其中由旁白或错误视角直接泄露当前视角人物无权知道事实的次数，且后者不得大于前者。"
        : "- 当前没有正式叙事视角：viewpointAudit.checked 必须为 false，两个计数必须为 0。",
      "- 任一视角计数非零时，issues 中至少要有一条 category 为 narrative_perspective 的建议，并在 evidence 中定位可核验正文；不要为了凑指标重复计算同一处问题。",
      "- issues 为空数组表示当前输入中没有明确的闭环问题。",
      "- 只输出 JSON，不要输出 Markdown。",
    ].join("\n"),
  };
}

export function parseShortStoryWholeReviewOutput(
  output?: string | null,
): ShortStoryWholeReviewResult {
  const parsed = parseJsonLikeObject(output);
  const issues = Array.isArray(parsed?.issues)
    ? parsed.issues
        .map(normalizeIssue)
        .filter((issue): issue is ShortStoryWholeReviewIssue => Boolean(issue))
    : [];
  const viewpointAudit = normalizeViewpointAudit(
    parsed?.viewpointAudit ?? parsed?.viewpoint_audit,
  );

  return {
    overallRiskLevel: normalizeContinuitySeverity(
      stringValue(parsed?.overallRiskLevel ?? parsed?.overall_risk_level),
    ),
    summary: limitText(stringValue(parsed?.summary ?? parsed?.overallAssessment), 2000),
    strengths: stringArray(parsed?.strengths).map((item) => limitText(item, 500)),
    priority: limitText(stringValue(parsed?.priority ?? parsed?.revisionPriority), 1200),
    viewpointAudit,
    issues,
  };
}

function normalizeViewpointAudit(
  value: unknown,
): ShortStoryWholeReviewViewpointAudit {
  if (!isRecord(value) || !booleanValue(value.checked)) {
    return {
      checked: false,
      viewpointViolationCount: 0,
      unauthorizedKnowledgeLeakCount: 0,
    };
  }

  const viewpointViolationCount = nonNegativeInteger(
    value.viewpointViolationCount ?? value.viewpoint_violation_count,
  );
  const unauthorizedKnowledgeLeakCount = Math.min(
    viewpointViolationCount,
    nonNegativeInteger(
      value.unauthorizedKnowledgeLeakCount ??
        value.unauthorized_knowledge_leak_count,
    ),
  );

  return {
    checked: true,
    viewpointViolationCount,
    unauthorizedKnowledgeLeakCount,
  };
}

function buildPromptUnit(unit: ShortStoryWholeReviewUnit, budget: number) {
  const sourceText = unit.finalText?.trim() ?? "";
  const excerpt = excerptWholeStoryUnit(sourceText, budget);

  return {
    ...unit,
    sourceText,
    sourceLength: sourceText.length,
    sourceTextHash: chapterFinalTextHash(sourceText),
    promptText: excerpt.text,
    wasExcerpted: excerpt.wasExcerpted,
    strategy: excerpt.strategy,
  };
}

export function excerptWholeStoryUnit(sourceText: string, budget: number) {
  const text = sourceText.trim();

  if (text.length <= budget) {
    return { text, wasExcerpted: false, strategy: "full_text" } as const;
  }

  const sectionLength = Math.max(120, Math.floor((budget - 240) / 3));
  const middleStart = Math.max(
    0,
    Math.floor(text.length / 2) - Math.floor(sectionLength / 2),
  );
  const excerpt = [
    `【本单元定稿 ${text.length} 字；以下为开头、中段和结尾摘录，省略处不得脑补。】`,
    "【开头】",
    text.slice(0, sectionLength).trim(),
    "【中段】",
    text.slice(middleStart, middleStart + sectionLength).trim(),
    "【结尾】",
    text.slice(-sectionLength).trim(),
  ].join("\n");

  return {
    text: excerpt,
    wasExcerpted: true,
    strategy: "head_middle_tail_excerpt",
  } as const;
}

function normalizeIssue(value: unknown): ShortStoryWholeReviewIssue | null {
  if (!isRecord(value)) {
    return null;
  }

  const targetUnitId = stringValue(
    value.targetUnitId ?? value.target_unit_id ?? value.unitId,
  );
  const description = limitText(
    stringValue(value.description ?? value.issue ?? value.summary),
    3000,
  );

  if (!targetUnitId || !description) {
    return null;
  }

  const categoryText = stringValue(
    value.category ?? value.issueType ?? value.issue_type,
  );

  return {
    targetUnitId,
    targetUnitNumber: positiveInteger(
      value.targetUnitNumber ?? value.target_unit_number ?? value.unitNumber,
    ),
    relatedUnitIds: stringArray(value.relatedUnitIds ?? value.related_unit_ids),
    category: normalizeContinuityCategory(categoryText || description),
    severity: normalizeContinuitySeverity(
      stringValue(value.severity ?? value.riskLevel),
    ),
    title:
      limitText(stringValue(value.title), 240) ||
      `${categoryText || "整篇闭环"}建议`,
    description,
    evidence: optionalText(value.evidence ?? value.sourceEvidence, 2000),
    reviewBasis: optionalText(value.reviewBasis ?? value.review_basis, 1600),
    suggestedFix: optionalText(
      value.suggestedFix ?? value.suggested_fix ?? value.fixSuggestion,
      2400,
    ),
  };
}

function formatPromptUnit(unit: ReturnType<typeof buildPromptUnit>) {
  return [
    `## [${unit.id}] 单元 ${unit.chapterNumber}《${unit.title}》`,
    `状态：${unit.status}；原文 ${unit.sourceLength} 字；输入策略：${unit.strategy}`,
    `单元目标：${clipText(unit.goal, 500) || "未填写"}`,
    `场景推进：${clipText(unit.unitSceneMovement, 500) || "未填写"}`,
    `核心冲突：${clipText(unit.unitConflict, 500) || "未填写"}`,
    `关键转折：${clipText(unit.unitTurn, 500) || "未填写"}`,
    `兑现推进：${clipText(unit.unitPayoffMovement, 500) || "未填写"}`,
    "### 定稿正文",
    unit.promptText,
  ].join("\n");
}

function formatRecord(record: Record<string, string>) {
  return Object.entries(record)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `- ${key}：${value}`)
    .join("\n");
}

function formatCharacters(characters: Array<Record<string, string>>) {
  return characters
    .map((character) =>
      [
        `- ${character.name || "未命名角色"}`,
        character.roleInStory ? `作用：${character.roleInStory}` : "",
        character.desire ? `欲望：${character.desire}` : "",
        character.fear ? `恐惧：${character.fear}` : "",
        character.secret ? `秘密：${character.secret}` : "",
        character.characterArc ? `变化：${character.characterArc}` : "",
        character.behaviorRules ? `边界：${character.behaviorRules}` : "",
      ]
        .filter(Boolean)
        .join("；"),
    )
    .join("\n");
}

function formatForeshadows(
  foreshadows: Array<{
    id: string;
    content: string;
    status: string;
    importance: string;
    expectedResolveChapter: number | null;
  }>,
) {
  return foreshadows
    .map(
      (item) =>
        `- [${item.id}] ${item.content}（${item.status}；${item.importance}；预计单元 ${item.expectedResolveChapter ?? "未指定"}）`,
    )
    .join("\n");
}

function compareForeshadowPriority(
  left: ShortStoryWholeReviewInput["foreshadows"][number],
  right: ShortStoryWholeReviewInput["foreshadows"][number],
) {
  const statusRank = { needs_attention: 0, advancing: 1, planted: 2 } as const;
  const importanceRank = { high: 0, medium: 1, low: 2 } as const;
  const leftStatus = statusRank[left.status as keyof typeof statusRank] ?? 3;
  const rightStatus = statusRank[right.status as keyof typeof statusRank] ?? 3;

  if (leftStatus !== rightStatus) {
    return leftStatus - rightStatus;
  }

  const leftImportance =
    importanceRank[left.importance as keyof typeof importanceRank] ?? 3;
  const rightImportance =
    importanceRank[right.importance as keyof typeof importanceRank] ?? 3;

  if (leftImportance !== rightImportance) {
    return leftImportance - rightImportance;
  }

  return (
    (left.expectedResolveChapter ?? Number.POSITIVE_INFINITY) -
    (right.expectedResolveChapter ?? Number.POSITIVE_INFINITY)
  );
}

function formatTimeline(
  events: Array<{
    title: string;
    description: string;
    storyTime: string;
    location: string;
  }>,
) {
  return events
    .map(
      (event) =>
        `- ${event.storyTime || "时间未注明"} / ${event.location || "地点未注明"}：${event.title}；${event.description}`,
    )
    .join("\n");
}

function parseJsonLikeObject(output?: string | null): Record<string, unknown> | null {
  const text = output?.trim();

  if (!text) {
    return null;
  }

  const candidates = [text];
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedMatch?.[1]) {
    candidates.push(fencedMatch[1].trim());
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(text.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);

      if (isRecord(parsed)) {
        return parsed;
      }
    } catch {
      // Keep trying compatible JSON candidates.
    }
  }

  return null;
}

function optionalText(value: unknown, maxLength: number) {
  const text = limitText(stringValue(value), maxLength);

  return text || undefined;
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(stringValue).filter(Boolean).slice(0, 20);
}

function stringValue(value: unknown) {
  if (value == null) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }

  return "";
}

function numberValue(value: Scalar) {
  const number = typeof value === "number" ? value : Number(stringValue(value));

  return Number.isFinite(number) ? number : null;
}

function positiveInteger(value: unknown) {
  const number = typeof value === "number" ? value : Number(stringValue(value));

  return Number.isInteger(number) && number > 0 ? number : undefined;
}

function nonNegativeInteger(value: unknown) {
  const number = typeof value === "number" ? value : Number(stringValue(value));

  return Number.isInteger(number) && number >= 0 ? Math.min(number, 10_000) : 0;
}

function booleanValue(value: unknown) {
  return value === true || stringValue(value).toLowerCase() === "true";
}

function limitText(value: string, maxLength: number) {
  const normalized = value.trim();

  return normalized.length > maxLength
    ? `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`
    : normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

import { clipText } from "./chapter-beats";
import {
  buildPromptSourceText,
  confirmedChapterText,
} from "./chapter-summaries";
import {
  normalizeRiskLevel,
  normalizeTargetType,
  normalizeUpdateType,
  type PendingUpdateRisk,
  type PendingUpdateTargetType,
  type PendingUpdateType,
} from "../pending-updates";
import {
  projectSettingFields,
  type ProjectSettingFieldName,
} from "../project-setting-fields";

export type PendingUpdateProjectContext = {
  title: string;
  genre?: string | null;
  targetAudience?: string | null;
  platform?: string | null;
  description?: string | null;
  wechatPositioning?: string | null;
};

export type PendingUpdateSettingContext = Partial<
  Record<ProjectSettingFieldName, string | null>
>;

export type PendingUpdateCharacterContext = {
  id?: string | null;
  name: string;
  roleInStory?: string | null;
  identity?: string | null;
  status?: string | null;
  knownInfo?: string | null;
  hiddenInfo?: string | null;
  abilityBoundary?: string | null;
  behaviorRules?: string | null;
  latestAppearance?: string | null;
  notes?: string | null;
};

export type PendingUpdateChapterContext = {
  chapterNumber: number;
  title: string;
  goal?: string | null;
  beats?: string | null;
  finalText?: string | null;
  notes?: string | null;
};

export type PendingUpdateSummaryTaskContext = {
  id: string;
  inputContextSummary: string;
  outputText?: string | null;
  completedAt?: Date | null;
};

export type PendingUpdateWorldRuleContext = {
  id: string;
  title: string;
  content: string;
  riskLevel?: string | null;
  isCore?: boolean | null;
};

export type PendingUpdateForeshadowContext = {
  id: string;
  content: string;
  status?: string | null;
  importance?: string | null;
  expectedResolveChapter?: number | null;
};

export type PendingUpdateTimelineEventContext = {
  id: string;
  title: string;
  description: string;
  storyTime?: string | null;
  status?: string | null;
};

export type PendingUpdateContextInput = {
  project: PendingUpdateProjectContext;
  setting?: PendingUpdateSettingContext | null;
  chapter: PendingUpdateChapterContext;
  characters: readonly PendingUpdateCharacterContext[];
  latestSummaryTask?: PendingUpdateSummaryTaskContext | null;
  worldRules?: readonly PendingUpdateWorldRuleContext[];
  foreshadows?: readonly PendingUpdateForeshadowContext[];
  timelineEvents?: readonly PendingUpdateTimelineEventContext[];
};

export type BuiltPendingUpdateContext = {
  inputText: string;
  inputJson: Record<string, unknown>;
  inputContextSummary: string;
};

export type PendingUpdateSuggestion = {
  updateType: PendingUpdateType;
  targetType: PendingUpdateTargetType;
  targetId?: string;
  targetName?: string;
  fieldName?: string;
  title: string;
  proposedContent: string;
  reason?: string;
  riskLevel: PendingUpdateRisk;
  evidence?: string;
  payload: Record<string, unknown>;
};

type PendingUpdateTargetContext = Pick<
  PendingUpdateContextInput,
  "characters" | "worldRules" | "foreshadows" | "timelineEvents"
>;

const finalTextPreviewMaxLength = 1200;
const latestSummaryMaxLength = 2000;

export function buildPendingUpdateContext(
  input: PendingUpdateContextInput,
): BuiltPendingUpdateContext {
  const sourceText = confirmedChapterText(input.chapter);
  const promptSourceText = buildPromptSourceText(sourceText);
  const projectDescription = clipText(input.project.description);
  const projectWechatPositioning = clipText(input.project.wechatPositioning);
  const chapterBeats = clipText(input.chapter.beats);
  const chapterNotes = clipText(input.chapter.notes);
  const settingItems = buildSettingItems(input.setting);
  const characterItems = input.characters.map(buildCharacterLine).filter(Boolean);
  const summaryOutput = clean(input.latestSummaryTask?.outputText);
  const latestSummaryOutput = clipText(summaryOutput, latestSummaryMaxLength);
  const worldRules = input.worldRules ?? [];
  const foreshadows = input.foreshadows ?? [];
  const timelineEvents = input.timelineEvents ?? [];

  const inputJson = {
    project: {
      title: input.project.title,
      genre: clean(input.project.genre),
      targetAudience: clean(input.project.targetAudience),
      platform: clean(input.project.platform),
      description: projectDescription,
      wechatPositioning: projectWechatPositioning,
    },
    chapter: {
      chapterNumber: input.chapter.chapterNumber,
      title: input.chapter.title,
      goal: clean(input.chapter.goal),
      beats: chapterBeats,
      notes: chapterNotes,
      finalTextLength: sourceText.length,
      finalTextPreview: clipText(sourceText, finalTextPreviewMaxLength),
      finalTextPromptLength: promptSourceText.length,
      finalTextPromptWasExcerpted: promptSourceText.wasExcerpted,
    },
    latestSummaryTask: input.latestSummaryTask
      ? {
          id: input.latestSummaryTask.id,
          inputContextSummary: input.latestSummaryTask.inputContextSummary,
          outputText: latestSummaryOutput,
        }
      : null,
    setting: Object.fromEntries(settingItems),
    characters: characterItems,
    worldRules: worldRules.map((rule) => ({
      id: rule.id,
      title: rule.title,
      content: clipText(rule.content, 500),
      riskLevel: clean(rule.riskLevel),
      isCore: Boolean(rule.isCore),
    })),
    foreshadows: foreshadows.map((foreshadow) => ({
      id: foreshadow.id,
      content: clipText(foreshadow.content, 500),
      status: clean(foreshadow.status),
      importance: clean(foreshadow.importance),
      expectedResolveChapter: foreshadow.expectedResolveChapter ?? null,
    })),
    timelineEvents: timelineEvents.map((event) => ({
      id: event.id,
      title: event.title,
      description: clipText(event.description, 500),
      storyTime: clean(event.storyTime),
      status: clean(event.status),
    })),
    outputRequirements: [
      "只输出 JSON，不要输出 Markdown 说明。",
      "每条建议必须进入 updates 数组。",
      "不要直接修改正式记忆；只提出待审核更新。",
      "高风险项包括核心世界观、主角、反派、禁写项、能力边界和时间线冲突。",
      "更新或回收现有角色、世界规则、伏笔或时间线时必须返回对应 targetId；项目总设定更新使用 fieldName。",
      "正文首次出现且当前正式角色列表不存在的人物必须使用 updateType=create，并将 targetId 留空；禁止伪造角色 ID。",
      "逐条检查正式伏笔池：完整兑现使用 updateType=resolve，只有实质推进时使用 updateType=update；重复提及不算推进。",
    ],
  };

  const inputText = [
    "# 任务",
    `从第 ${input.chapter.chapterNumber} 章《${input.chapter.title}》定稿正文中提取需要作者审核的记忆更新建议。`,
    "你只能提出待审核更新，不得宣称已经修改正式设定、角色、世界规则、伏笔或时间线。",
    "",
    "# 项目基础信息",
    lines([
      ["项目", input.project.title],
      ["题材", input.project.genre],
      ["目标读者", input.project.targetAudience],
      ["平台", input.project.platform],
      ["简介", projectDescription],
      ["公众号定位", projectWechatPositioning],
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
    worldRules.length > 0
      ? worldRules
          .map(
            (rule) =>
              `- [${rule.id}] ${rule.title}（${rule.isCore ? "核心" : "普通"}/${clean(rule.riskLevel) || "medium"}）：${clipText(rule.content, 500)}`,
          )
          .join("\n")
      : "暂无正式世界规则。",
    "",
    "# 当前正式伏笔池",
    foreshadows.length > 0
      ? foreshadows
          .map(
            (foreshadow) =>
              `- [${foreshadow.id}] ${clipText(foreshadow.content, 500)}（状态：${clean(foreshadow.status) || "planted"}；重要度：${clean(foreshadow.importance) || "medium"}；预计回收：${foreshadow.expectedResolveChapter ?? "未指定"}）`,
          )
          .join("\n")
      : "暂无正式伏笔。",
    "",
    "# 当前正式时间线",
    timelineEvents.length > 0
      ? timelineEvents
          .map(
            (event) =>
              `- [${event.id}] ${event.title}（${clean(event.storyTime) || "时间未指定"}）：${clipText(event.description, 500)}`,
          )
          .join("\n")
      : "暂无正式时间线事件。",
    "",
    "# 最新章节摘要任务输出",
    latestSummaryOutput || "暂无已完成章节摘要任务输出。",
    "",
    "# 当前章节元信息",
    lines([
      ["章节目标", input.chapter.goal],
      ["章节节拍", chapterBeats],
      ["作者备注", chapterNotes],
    ]),
    "",
    "# 定稿正文",
    promptSourceText.text ||
      "未填写定稿正文。禁止基于草稿正文提取待审核更新。",
    promptSourceText.wasExcerpted
      ? "\n[系统说明：定稿较长，以上为首段/中段/尾段摘录；不得臆造省略部分。]"
      : "",
    "",
    "# 输出 JSON 字段",
    "- updates: 待审核更新数组。",
    "- 每条 update 包含 updateType, targetType, targetId, targetName, fieldName, title, content, reason, riskLevel, sourceEvidence。",
    "- 更新或回收现有角色、世界规则、伏笔或时间线时，targetId 必须使用上方正式记忆中的真实 ID；create 时 targetId 留空。",
    "- 正文首次出现且当前正式角色列表不存在的人物，必须输出 targetType=character、updateType=create，并将 targetId 留空；禁止为新角色编造 ID。",
    "- 正文已经明确回答既有伏笔核心疑问时，必须优先输出 targetType=foreshadow、updateType=resolve，而不是再 create 一条相似伏笔。",
    "- 正文只增加新证据但仍未回答核心疑问时，输出 targetType=foreshadow、updateType=update。仅重复提及线索时不要输出更新。",
    "- targetType 只能使用 project_setting, character, world_rule, foreshadow, timeline_event, location, organization。",
    "- project_setting 更新如能定位字段，请在 fieldName 使用总设定字段名，例如 worldviewRules, timeline, forbiddenItems。",
    "- riskLevel 使用 low, medium, high。",
  ].join("\n");

  return {
    inputText,
    inputJson,
    inputContextSummary: buildPendingUpdateContextSummary(input),
  };
}

export function buildPendingUpdateContextSummary(
  input: PendingUpdateContextInput,
) {
  const sourceText = confirmedChapterText(input.chapter);

  return [
    `第 ${input.chapter.chapterNumber} 章《${input.chapter.title}》待审核更新提取`,
    sourceText ? `定稿 ${sourceText.length} 字` : "缺少定稿正文",
    `角色 ${input.characters.length} 个`,
    input.latestSummaryTask ? "包含章节摘要任务" : "无章节摘要任务",
  ].join("；");
}

export function parsePendingUpdateSuggestions(
  outputText?: string | null,
): PendingUpdateSuggestion[] {
  const parsed = parseJsonPayload(outputText);

  if (isRecord(parsed)) {
    const directUpdates = Array.isArray(parsed.updates)
      ? parsed.updates
      : groupedSchemaToUpdates(parsed);

    return normalizeSuggestionList(directUpdates);
  }

  return normalizeSuggestionList(parseLooseUpdateObjects(outputText));
}

export function normalizePendingUpdateSuggestionTargetIds(
  suggestions: readonly PendingUpdateSuggestion[],
  context: PendingUpdateTargetContext,
) {
  const validIds = new Map<PendingUpdateTargetType, Set<string>>([
    ["character", idsFrom(context.characters)],
    ["world_rule", idsFrom(context.worldRules)],
    ["foreshadow", idsFrom(context.foreshadows)],
    ["timeline_event", idsFrom(context.timelineEvents)],
  ]);
  const targetTypesById = uniqueTargetTypesById(validIds);
  const idsByName = new Map<PendingUpdateTargetType, Map<string, string>>([
    ["character", uniqueIdsByName(context.characters, (item) => item.name)],
    ["world_rule", uniqueIdsByName(context.worldRules, (item) => item.title)],
    [
      "foreshadow",
      uniqueIdsByName(context.foreshadows, (item) => item.content),
    ],
    [
      "timeline_event",
      uniqueIdsByName(context.timelineEvents, (item) => item.title),
    ],
  ]);

  return suggestions.map((suggestion) => {
    if (suggestion.updateType === "create") {
      return suggestion.targetId
        ? { ...suggestion, targetId: undefined }
        : suggestion;
    }

    const typeIds = validIds.get(suggestion.targetType);
    const targetId = clean(suggestion.targetId);
    const resolvedId = idsByName
      .get(suggestion.targetType)
      ?.get(clean(suggestion.targetName));

    if (resolvedId) {
      return resolvedId === targetId
        ? suggestion
        : { ...suggestion, targetId: resolvedId };
    }

    if (targetId && typeIds?.has(targetId)) {
      return suggestion;
    }

    const resolvedTargetType = targetTypesById.get(targetId);

    if (targetId && resolvedTargetType) {
      return {
        ...suggestion,
        targetId,
        targetType: resolvedTargetType,
      };
    }

    if (
      suggestion.targetType === "character" &&
      clean(suggestion.targetName) &&
      !context.characters.some(
        (character) =>
          clean(character.name) === clean(suggestion.targetName),
      )
    ) {
      return {
        ...suggestion,
        updateType: "create" as const,
        targetId: undefined,
      };
    }

    return targetId ? { ...suggestion, targetId: undefined } : suggestion;
  });
}

function normalizeSuggestionList(values: unknown[]) {
  return values
    .map(normalizeSuggestion)
    .filter((suggestion): suggestion is PendingUpdateSuggestion =>
      Boolean(suggestion),
    );
}

function normalizeSuggestion(value: unknown): PendingUpdateSuggestion | null {
  if (!isRecord(value)) {
    return null;
  }

  const content = clean(
    stringValue(value.content) ??
      stringValue(value.proposedContent) ??
      stringValue(value.proposed_content) ??
      stringValue(value.description),
  );

  if (!content) {
    return null;
  }

  const targetType = normalizeTargetType(
    stringValue(value.targetType) ?? stringValue(value.target_type),
  );
  const updateType = normalizeUpdateType(
    stringValue(value.updateType) ?? stringValue(value.update_type),
  );
  const targetName = clean(
    stringValue(value.targetName) ??
      stringValue(value.target_name) ??
      stringValue(value.name),
  );
  const targetId = clean(
    stringValue(value.targetId) ?? stringValue(value.target_id),
  );
  const fieldName = clean(
    stringValue(value.fieldName) ?? stringValue(value.field_name),
  );
  const title = clean(stringValue(value.title)) || buildSuggestionTitle(value);
  const reason = clean(stringValue(value.reason));
  const evidence = clean(
    stringValue(value.sourceEvidence) ??
      stringValue(value.source_evidence) ??
      stringValue(value.evidence),
  );

  return {
    updateType,
    targetType,
    targetId: targetId || undefined,
    targetName: targetName || undefined,
    fieldName: fieldName || undefined,
    title,
    proposedContent: content,
    reason: reason || undefined,
    riskLevel: normalizeRiskLevel(
      stringValue(value.riskLevel) ?? stringValue(value.risk_level),
    ),
    evidence: evidence || undefined,
    payload: value,
  };
}

function groupedSchemaToUpdates(payload: Record<string, unknown>) {
  const updates: Record<string, unknown>[] = [];

  for (const character of arrayValue(payload.new_characters)) {
    if (!isRecord(character)) {
      continue;
    }

    updates.push({
      updateType: "create",
      targetType: "character",
      targetName: stringValue(character.name),
      title: `新增角色：${stringValue(character.name) ?? "未命名角色"}`,
      content: stringValue(character.identity) ?? stringifyUnknown(character),
      reason: stringValue(character.reason),
      riskLevel: "medium",
      sourceEvidence: stringValue(character.reason),
    });
  }

  addStringArrayUpdates(updates, payload.new_locations, {
    targetType: "location",
    titlePrefix: "新增地点",
  });
  addStringArrayUpdates(updates, payload.new_world_rules, {
    targetType: "world_rule",
    titlePrefix: "新增世界规则",
    riskLevel: "high",
  });
  addStringArrayUpdates(updates, payload.character_changes, {
    targetType: "character",
    titlePrefix: "角色状态变化",
  });
  addStringArrayUpdates(updates, payload.relationship_changes, {
    targetType: "character",
    titlePrefix: "人物关系变化",
  });
  addStringArrayUpdates(updates, payload.foreshadow_changes, {
    targetType: "foreshadow",
    titlePrefix: "伏笔变化",
  });
  addStringArrayUpdates(updates, payload.timeline_changes, {
    targetType: "timeline_event",
    titlePrefix: "时间线变化",
    riskLevel: "high",
  });
  addStringArrayUpdates(updates, payload.potential_conflicts, {
    targetType: "project_setting",
    titlePrefix: "潜在矛盾",
    riskLevel: "high",
  });

  for (const settingUpdate of arrayValue(payload.setting_field_updates)) {
    if (!isRecord(settingUpdate)) {
      continue;
    }

    updates.push({
      updateType: "update",
      targetType: "project_setting",
      fieldName:
        stringValue(settingUpdate.fieldName) ??
        stringValue(settingUpdate.field_name),
      title:
        stringValue(settingUpdate.title) ??
        `建议修改设定字段：${
          stringValue(settingUpdate.fieldName) ??
          stringValue(settingUpdate.field_name) ??
          "未指定"
        }`,
      content:
        stringValue(settingUpdate.content) ??
        stringValue(settingUpdate.proposedContent) ??
        stringifyUnknown(settingUpdate),
      reason: stringValue(settingUpdate.reason),
      riskLevel:
        stringValue(settingUpdate.riskLevel) ??
        stringValue(settingUpdate.risk_level) ??
        "medium",
      sourceEvidence:
        stringValue(settingUpdate.sourceEvidence) ??
        stringValue(settingUpdate.source_evidence),
    });
  }

  return updates;
}

function addStringArrayUpdates(
  updates: Record<string, unknown>[],
  value: unknown,
  options: {
    targetType: PendingUpdateTargetType;
    titlePrefix: string;
    riskLevel?: PendingUpdateRisk;
  },
) {
  for (const item of arrayValue(value)) {
    const content = typeof item === "string" ? item : stringifyUnknown(item);

    if (!content) {
      continue;
    }

    updates.push({
      updateType: "create",
      targetType: options.targetType,
      title: `${options.titlePrefix}：${clipText(content, 40)}`,
      content,
      riskLevel: options.riskLevel ?? "medium",
      sourceEvidence: content,
    });
  }
}

function buildSuggestionTitle(value: Record<string, unknown>) {
  const targetName = clean(
    stringValue(value.targetName) ??
      stringValue(value.target_name) ??
      stringValue(value.name),
  );
  const targetType = normalizeTargetType(
    stringValue(value.targetType) ?? stringValue(value.target_type),
  );

  return targetName ? `${targetType}: ${targetName}` : `${targetType} 更新建议`;
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

function parseLooseUpdateObjects(value?: string | null) {
  const cleaned = clean(value);
  const updatesArray = extractLooseUpdatesArray(cleaned);

  if (!updatesArray) {
    return [];
  }

  return extractLooseObjectBlocks(updatesArray)
    .map(parseLooseObjectBlock)
    .filter((record) => Object.keys(record).length > 0);
}

function extractLooseUpdatesArray(value: string) {
  const updatesMatch = /"updates"\s*:/.exec(value);

  if (!updatesMatch) {
    return "";
  }

  const arrayStart = value.indexOf("[", updatesMatch.index);

  if (arrayStart < 0) {
    return "";
  }

  let depth = 0;

  for (let index = arrayStart; index < value.length; index += 1) {
    const char = value[index];

    if (char === "[") {
      depth += 1;
    } else if (char === "]") {
      depth -= 1;

      if (depth === 0) {
        return value.slice(arrayStart + 1, index);
      }
    }
  }

  return value.slice(arrayStart + 1);
}

function extractLooseObjectBlocks(value: string) {
  const blocks: string[] = [];
  let depth = 0;
  let startIndex = -1;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];

    if (char === "{") {
      if (depth === 0) {
        startIndex = index;
      }

      depth += 1;
    } else if (char === "}" && depth > 0) {
      depth -= 1;

      if (depth === 0 && startIndex >= 0) {
        blocks.push(value.slice(startIndex, index + 1));
        startIndex = -1;
      }
    }
  }

  return blocks;
}

function parseLooseObjectBlock(value: string) {
  const record: Record<string, unknown> = {};

  for (const line of value.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed === "{" || trimmed === "}" || trimmed === "},") {
      continue;
    }

    const match = /^"([^"]+)"\s*:\s*([\s\S]*?)(?:,\s*)?$/.exec(trimmed);

    if (!match) {
      continue;
    }

    record[match[1]] = parseLooseValue(match[2]);
  }

  return record;
}

function parseLooseValue(value: string) {
  const trimmed = value.trim().replace(/,\s*$/, "");

  if (trimmed.startsWith('"')) {
    const withoutOpeningQuote = trimmed.slice(1);
    const withoutClosingQuote = withoutOpeningQuote.endsWith('"')
      ? withoutOpeningQuote.slice(0, -1)
      : withoutOpeningQuote;

    return withoutClosingQuote
      .replace(/\\"/g, '"')
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\\\/g, "\\");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

function buildSettingItems(setting?: PendingUpdateSettingContext | null) {
  if (!setting) {
    return [];
  }

  return projectSettingFields
    .map((field) => [field.name, clipText(setting[field.name], 600)] as const)
    .filter(([, value]) => Boolean(value));
}

function buildCharacterLine(character: PendingUpdateCharacterContext) {
  const details = [
    character.roleInStory,
    character.identity,
    character.knownInfo ? `已知信息：${character.knownInfo}` : "",
    character.hiddenInfo ? `隐藏信息：${character.hiddenInfo}` : "",
    character.abilityBoundary ? `能力边界：${character.abilityBoundary}` : "",
    character.behaviorRules ? `行为规则：${character.behaviorRules}` : "",
    character.latestAppearance ? `最近出场：${character.latestAppearance}` : "",
    character.notes ? `备注：${character.notes}` : "",
  ]
    .map(clean)
    .filter(Boolean)
    .map((item) => clipText(item, 240))
    .join("；");

  const id = clean(character.id);

  return `- ${id ? `[${id}] ` : ""}${character.name}${details ? `：${details}` : ""}`;
}

function idsFrom(items?: readonly { id?: string | null }[]) {
  return new Set(
    (items ?? []).map((item) => clean(item.id)).filter(Boolean),
  );
}

function uniqueTargetTypesById(
  idsByType: ReadonlyMap<PendingUpdateTargetType, ReadonlySet<string>>,
) {
  const types = new Map<string, PendingUpdateTargetType | null>();

  for (const [targetType, ids] of idsByType) {
    for (const id of ids) {
      types.set(id, types.has(id) ? null : targetType);
    }
  }

  return new Map(
    [...types.entries()].filter(
      (entry): entry is [string, PendingUpdateTargetType] => Boolean(entry[1]),
    ),
  );
}

function uniqueIdsByName<T extends { id?: string | null }>(
  items: readonly T[] | undefined,
  nameOf: (item: T) => string,
) {
  const names = new Map<string, string | null>();

  for (const item of items ?? []) {
    const id = clean(item.id);
    const name = clean(nameOf(item));

    if (!id || !name) {
      continue;
    }

    names.set(name, names.has(name) ? null : id);
  }

  return new Map(
    [...names.entries()].filter(
      (entry): entry is [string, string] => Boolean(entry[1]),
    ),
  );
}

function lines(items: readonly (readonly [string, string | number | null | undefined])[]) {
  return items
    .map(([label, value]) => `- ${label}: ${clean(String(value ?? "")) || "未填写"}`)
    .join("\n");
}

function settingLabel(name: ProjectSettingFieldName) {
  return projectSettingFields.find((field) => field.name === name)?.label ?? name;
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

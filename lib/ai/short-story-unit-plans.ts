import { clipText } from "./chapter-beats";
import {
  projectSettingFields,
  projectSettingValuesFromRecord,
  type ProjectSettingFieldName,
} from "../project-setting-fields";
import {
  formatShortStoryBlueprintForContext,
  type ShortStoryBlueprintFieldName,
} from "../short-stories/blueprint-fields";

type Scalar = string | number | boolean | Date | null | undefined;

export const shortStoryUnitPlanTaskType =
  "short_story_unit_plan_generation";
export const shortStoryUnitPlanTemplateKey = shortStoryUnitPlanTaskType;
export const shortStoryUnitPlanDraftTextMaxLength = 8000;

export const shortStoryUnitPlanDraftFieldNames = [
  "title",
  "unitSceneMovement",
  "unitConflict",
  "unitTurn",
  "unitPayoffMovement",
  "goal",
] as const;

export type ShortStoryUnitPlanDraftFieldName =
  (typeof shortStoryUnitPlanDraftFieldNames)[number];
export type ShortStoryUnitPlanDraft = Record<
  ShortStoryUnitPlanDraftFieldName,
  string
>;

const unitPlanSettingFieldNames = [
  "mainConflict",
  "worldviewRules",
  "protagonistDesire",
  "protagonistFlaw",
  "villainLogic",
  "timeline",
  "endingDirection",
  "emotionalTone",
  "forbiddenItems",
  "sensitiveContentRules",
  "styleSample",
] as const satisfies readonly ProjectSettingFieldName[];

export type ShortStoryUnitPlanGenerationInput = {
  project: {
    title?: Scalar;
    genre?: Scalar;
    targetAudience?: Scalar;
    platform?: Scalar;
    totalWordTarget?: Scalar;
    description?: Scalar;
  };
  setting?: Record<string, Scalar> | null;
  characters: ReadonlyArray<{
    name?: Scalar;
    roleInStory?: Scalar;
    identity?: Scalar;
    desire?: Scalar;
    fear?: Scalar;
    secret?: Scalar;
    characterArc?: Scalar;
    behaviorRules?: Scalar;
    knownInfo?: Scalar;
  }>;
  seriesContext?: string | null;
  blueprint?: Partial<Record<ShortStoryBlueprintFieldName, string | null>> | null;
  previousUnits: ReadonlyArray<{
    chapterNumber?: Scalar;
    title?: Scalar;
    status?: Scalar;
    goal?: Scalar;
    unitSceneMovement?: Scalar;
    unitConflict?: Scalar;
    unitTurn?: Scalar;
    unitPayoffMovement?: Scalar;
    finalText?: Scalar;
  }>;
  target: {
    chapterNumber: number;
    totalUnitCount: number;
    unitWordTarget: number;
  };
  authorHints?: Partial<ShortStoryUnitPlanDraft> | null;
};

export function buildShortStoryUnitPlanGenerationContext(
  input: ShortStoryUnitPlanGenerationInput,
) {
  const projectTitle = stringValue(input.project.title) || "未命名短故事";
  const setting = projectSettingValuesFromRecord(input.setting);
  const compactSetting = Object.fromEntries(
    unitPlanSettingFieldNames.map((fieldName) => [
      fieldName,
      clipText(setting[fieldName], fieldName === "styleSample" ? 1000 : 1400),
    ]),
  ) as Record<(typeof unitPlanSettingFieldNames)[number], string>;
  const characters = input.characters.slice(0, 12).map((character) => ({
    name: clipText(stringValue(character.name), 120),
    roleInStory: clipText(stringValue(character.roleInStory), 400),
    identity: clipText(stringValue(character.identity), 500),
    desire: clipText(stringValue(character.desire), 600),
    fear: clipText(stringValue(character.fear), 500),
    secret: clipText(stringValue(character.secret), 600),
    characterArc: clipText(stringValue(character.characterArc), 800),
    behaviorRules: clipText(stringValue(character.behaviorRules), 600),
    knownInfo: clipText(stringValue(character.knownInfo), 700),
  }));
  const previousUnits = input.previousUnits
    .filter(
      (unit) =>
        positiveInteger(unit.chapterNumber) !== null &&
        positiveInteger(unit.chapterNumber)! < input.target.chapterNumber,
    )
    .sort(
      (left, right) =>
        positiveInteger(left.chapterNumber)! - positiveInteger(right.chapterNumber)!,
    )
    .slice(-12)
    .map((unit) => ({
      chapterNumber: positiveInteger(unit.chapterNumber),
      title: clipText(stringValue(unit.title), 160),
      status: clipText(stringValue(unit.status), 80),
      goal: clipText(stringValue(unit.goal), 900),
      unitSceneMovement: clipText(stringValue(unit.unitSceneMovement), 1200),
      unitConflict: clipText(stringValue(unit.unitConflict), 1000),
      unitTurn: clipText(stringValue(unit.unitTurn), 1000),
      unitPayoffMovement: clipText(
        stringValue(unit.unitPayoffMovement),
        1000,
      ),
      finalTextTail: tailText(stringValue(unit.finalText), 1200),
    }));
  const authorHints = normalizeDraft(input.authorHints);

  return {
    inputContextSummary: `${projectTitle} 第 ${input.target.chapterNumber} 写作单元规划；建议共 ${input.target.totalUnitCount} 单元；目标 ${input.target.unitWordTarget} 字；前序单元 ${previousUnits.length} 个；${input.seriesContext ? "包含系列连续性" : "独立短故事"}`,
    inputJson: {
      project: {
        title: projectTitle,
        genre: stringValue(input.project.genre),
        targetAudience: stringValue(input.project.targetAudience),
        platform: stringValue(input.project.platform),
        totalWordTarget: positiveInteger(input.project.totalWordTarget),
        description: clipText(stringValue(input.project.description), 1800),
      },
      target: input.target,
      setting: compactSetting,
      characters,
      seriesContext: clipText(input.seriesContext, 12000),
      blueprint: input.blueprint,
      previousUnits,
      authorHints,
      allowedFields: shortStoryUnitPlanDraftFieldNames,
    },
    inputText: [
      "# 短故事项目",
      `标题：${projectTitle}`,
      `题材：${stringValue(input.project.genre) || "未设置"}`,
      `目标读者：${stringValue(input.project.targetAudience) || "未设置"}`,
      `发布平台：${stringValue(input.project.platform) || "未设置"}`,
      `全篇目标字数：${positiveInteger(input.project.totalWordTarget) ?? "未设置"}`,
      `故事简介：${clipText(stringValue(input.project.description), 1800) || "未设置"}`,
      "",
      "# 正式短故事蓝图",
      formatShortStoryBlueprintForContext(input.blueprint, 2200) ||
        "未建立可用正式蓝图。",
      "",
      "# 系列短故事连续性",
      clipText(input.seriesContext, 12000) ||
        "当前为独立短故事，没有系列级约束。",
      "",
      "# 已确认项目设定",
      formatNamedValues(compactSetting) || "暂无可用项目设定。",
      "",
      "# 已确认角色",
      formatCharacters(characters) ||
        "暂无角色资料，只能使用蓝图与项目中已经明确的信息。",
      "",
      "# 已有前序写作单元",
      formatPreviousUnits(previousUnits) || "当前是首个写作单元。",
      "",
      "# 当前目标位置",
      `生成第 ${input.target.chapterNumber} 个写作单元，建议全篇共 ${input.target.totalUnitCount} 个单元，本单元目标约 ${input.target.unitWordTarget} 字。`,
      unitPositionGuidance(input.target),
      "",
      "# 作者已有提示",
      formatDraft(authorHints) ||
        "作者尚未填写规划提示，请依据正式蓝图与当前位置生成。",
      "",
      "# 本次任务",
      "只规划当前一个写作单元，不生成正文，也不提前替后续单元完成高潮或结局。",
      "为当前单元生成有辨识度的内部标题、场景推进、核心冲突、关键转折、兑现推进和单元目标。",
      "场景推进应说明从什么局面进入、经过哪些关键场景、人物被推到什么新局面；核心冲突要包含目标、阻力与选择代价。",
      "关键转折必须由已知信息、行动后果或人物选择触发；兑现推进必须指出本单元推进了蓝图中的哪项承诺、反转、关系或情绪债。",
      "不得重复前序单元已经完成的功能，不得引入与正式蓝图、系列规则或已确认角色相冲突的新设定。",
      "作者已有提示属于优先约束；可以补强表达，但不能无故改向。",
      "",
      "# 输出要求",
      "只输出 JSON 对象，不要输出 Markdown、代码围栏或解释文字。",
      "顶层必须是 unitPlan 对象，且只能包含 title、unitSceneMovement、unitConflict、unitTurn、unitPayoffMovement、goal。",
      "六个字段必须全部给出具体、可执行且互不重复的内容。",
      "输出只是待作者确认的表单草案，不得宣称已经创建写作单元或修改正式记忆。",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export function parseShortStoryUnitPlanGenerationOutput(
  output?: string | null,
): Partial<ShortStoryUnitPlanDraft> {
  const parsed = parseJsonLikeObject(output);
  const record = isRecord(parsed?.unitPlan)
    ? parsed.unitPlan
    : isRecord(parsed?.plan)
      ? parsed.plan
      : parsed;
  const values: Partial<ShortStoryUnitPlanDraft> = {};

  if (!isRecord(record)) {
    return values;
  }

  for (const fieldName of shortStoryUnitPlanDraftFieldNames) {
    const value = limitText(
      stringifyDraftValue(record[fieldName]),
      shortStoryUnitPlanDraftTextMaxLength,
    );

    if (value) {
      values[fieldName] = value;
    }
  }

  return values;
}

export function isReviewableShortStoryUnitPlanDraft(
  values: Partial<ShortStoryUnitPlanDraft>,
) {
  return shortStoryUnitPlanDraftFieldNames.every((fieldName) =>
    Boolean(values[fieldName]?.trim()),
  );
}

export function isUsableShortStoryBlueprint(
  blueprint?: Partial<
    Record<ShortStoryBlueprintFieldName, string | null | undefined>
  > | null,
) {
  return Boolean(
    blueprint?.premise?.trim() &&
      blueprint.coreConflict?.trim() &&
      blueprint.ending?.trim(),
  );
}

export function shortStoryUnitPlanTaskTargetNumber(inputJson?: string | null) {
  if (!inputJson?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(inputJson);

    if (!isRecord(parsed) || !isRecord(parsed.target)) {
      return null;
    }

    return positiveInteger(parsed.target.chapterNumber);
  } catch {
    return null;
  }
}

function normalizeDraft(
  values?: Partial<ShortStoryUnitPlanDraft> | null,
): Partial<ShortStoryUnitPlanDraft> {
  return Object.fromEntries(
    shortStoryUnitPlanDraftFieldNames
      .map((fieldName) => [
        fieldName,
        clipText(values?.[fieldName]?.trim(), 1800),
      ])
      .filter(([, value]) => Boolean(value)),
  );
}

function formatNamedValues(values: Record<string, string>) {
  return Object.entries(values)
    .map(([fieldName, value]) => {
      if (!value) {
        return "";
      }

      const label =
        projectSettingFields.find((field) => field.name === fieldName)?.label ??
        fieldName;

      return `## ${label}\n${value}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

function formatCharacters(characters: Array<Record<string, string>>) {
  return characters
    .map((character) =>
      [
        `## ${character.name || "未命名角色"}`,
        character.roleInStory ? `故事作用：${character.roleInStory}` : "",
        character.identity ? `身份：${character.identity}` : "",
        character.desire ? `欲望：${character.desire}` : "",
        character.fear ? `恐惧：${character.fear}` : "",
        character.secret ? `秘密：${character.secret}` : "",
        character.knownInfo ? `已知信息：${character.knownInfo}` : "",
        character.characterArc ? `人物变化：${character.characterArc}` : "",
        character.behaviorRules ? `行为边界：${character.behaviorRules}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
}

function formatPreviousUnits(
  units: Array<{
    chapterNumber: number | null;
    title: string;
    status: string;
    goal: string;
    unitSceneMovement: string;
    unitConflict: string;
    unitTurn: string;
    unitPayoffMovement: string;
    finalTextTail: string;
  }>,
) {
  return units
    .map((unit) =>
      [
        `## 单元 ${unit.chapterNumber}：${unit.title || "未命名"}`,
        unit.status ? `状态：${unit.status}` : "",
        unit.goal ? `目标：${unit.goal}` : "",
        unit.unitSceneMovement ? `场景推进：${unit.unitSceneMovement}` : "",
        unit.unitConflict ? `核心冲突：${unit.unitConflict}` : "",
        unit.unitTurn ? `关键转折：${unit.unitTurn}` : "",
        unit.unitPayoffMovement
          ? `兑现推进：${unit.unitPayoffMovement}`
          : "",
        unit.finalTextTail ? `已确认正文结尾：${unit.finalTextTail}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
}

function formatDraft(values: Partial<ShortStoryUnitPlanDraft>) {
  const labels: Record<ShortStoryUnitPlanDraftFieldName, string> = {
    title: "单元标题",
    unitSceneMovement: "场景推进",
    unitConflict: "核心冲突",
    unitTurn: "关键转折",
    unitPayoffMovement: "兑现推进",
    goal: "单元目标",
  };

  return shortStoryUnitPlanDraftFieldNames
    .map((fieldName) =>
      values[fieldName] ? `## ${labels[fieldName]}\n${values[fieldName]}` : "",
    )
    .filter(Boolean)
    .join("\n\n");
}

function unitPositionGuidance(target: ShortStoryUnitPlanGenerationInput["target"]) {
  if (target.chapterNumber <= 1) {
    return "这是首个单元：必须兑现开篇钩子，建立主角当前处境与第一轮不可回避的压力，但不要过早解释终局真相。";
  }

  if (target.chapterNumber >= target.totalUnitCount) {
    return "这是建议结构中的末单元：必须完成高潮选择、核心冲突闭环与必要回收，不要留下依赖下一篇才能理解的单篇悬空结局。";
  }

  const progress = target.chapterNumber / Math.max(1, target.totalUnitCount);

  return progress >= 0.7
    ? "这是后段单元：应把既有线索压向高潮，兑现关键反转并提高选择代价，为结局闭环创造必然条件。"
    : "这是中前段单元：应升级冲突、修正一次判断或关系，并把局势推到下一层，避免原地调查和重复说明。";
}

function parseJsonLikeObject(output?: string | null) {
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
      return JSON.parse(candidate);
    } catch {
      // Keep trying compatible JSON extraction candidates.
    }
  }

  return null;
}

function stringifyDraftValue(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => stringifyDraftValue(item))
      .filter(Boolean)
      .join("\n");
  }

  if (isRecord(value)) {
    return Object.entries(value)
      .map(([key, item]) => {
        const content = stringifyDraftValue(item);

        return content ? `${key}：${content}` : "";
      })
      .filter(Boolean)
      .join("\n");
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function limitText(value: string, maxLength: number) {
  const normalized = value.trim();

  return normalized.length > maxLength
    ? normalized.slice(0, maxLength).trimEnd()
    : normalized;
}

function tailText(value: string, maxLength: number) {
  const normalized = value.trim();

  return normalized.length > maxLength
    ? normalized.slice(-maxLength).trimStart()
    : normalized;
}

function stringValue(value: Scalar) {
  if (value == null) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value).trim();
}

function positiveInteger(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

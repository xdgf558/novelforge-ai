import { clipText } from "./chapter-beats";
import {
  shortStoryBlueprintFieldNames,
  shortStoryBlueprintValuesFromRecord,
  type ShortStoryBlueprintFieldName,
  type ShortStoryBlueprintValues,
} from "../short-stories/blueprint-fields";
import {
  projectSettingFields,
  projectSettingValuesFromRecord,
  type ProjectSettingFieldName,
} from "../project-setting-fields";

type Scalar = string | number | boolean | Date | null | undefined;

export const shortStoryBlueprintTaskType =
  "short_story_blueprint_generation";
export const shortStoryBlueprintTemplateKey = shortStoryBlueprintTaskType;
export const shortStoryBlueprintDraftTextMaxLength = 8000;

const blueprintSettingFieldNames = [
  "sellingPoint",
  "mainConflict",
  "protagonistDesire",
  "protagonistFlaw",
  "villainLogic",
  "narrativePerspective",
  "styleSample",
  "emotionalTone",
  "readerExpectation",
  "commercialHook",
  "endingDirection",
  "forbiddenItems",
  "sensitiveContentRules",
] as const satisfies readonly ProjectSettingFieldName[];

export type ShortStoryBlueprintGenerationInput = {
  project: {
    title?: Scalar;
    workType?: Scalar;
    genre?: Scalar;
    targetAudience?: Scalar;
    platform?: Scalar;
    totalWordTarget?: Scalar;
    description?: Scalar;
    wechatPositioning?: Scalar;
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
  }>;
  seriesContext?: string | null;
  blueprint?: Partial<Record<ShortStoryBlueprintFieldName, string | null>> | null;
};

export function buildShortStoryBlueprintGenerationContext(
  input: ShortStoryBlueprintGenerationInput,
) {
  const projectTitle = stringValue(input.project.title) || "未命名短故事";
  const setting = projectSettingValuesFromRecord(input.setting);
  const currentBlueprint = shortStoryBlueprintValuesFromRecord(input.blueprint);
  const compactSetting = Object.fromEntries(
    blueprintSettingFieldNames.map((fieldName) => [
      fieldName,
      clipText(setting[fieldName], fieldName === "styleSample" ? 1600 : 1200),
    ]),
  ) as Record<(typeof blueprintSettingFieldNames)[number], string>;
  const characters = input.characters.slice(0, 12).map((character) => ({
    name: clipText(stringValue(character.name), 120),
    roleInStory: clipText(stringValue(character.roleInStory), 400),
    identity: clipText(stringValue(character.identity), 500),
    desire: clipText(stringValue(character.desire), 600),
    fear: clipText(stringValue(character.fear), 500),
    secret: clipText(stringValue(character.secret), 600),
    characterArc: clipText(stringValue(character.characterArc), 800),
    behaviorRules: clipText(stringValue(character.behaviorRules), 600),
  }));
  const completedBlueprintFields = shortStoryBlueprintFieldNames.filter(
    (fieldName) => currentBlueprint[fieldName],
  ).length;

  return {
    inputContextSummary: `${projectTitle} 短故事蓝图生成；目标 ${numberValue(input.project.totalWordTarget) ?? "未设置"} 字；角色 ${characters.length} 个；${input.seriesContext ? "包含系列连续性" : "独立短故事"}；已有蓝图字段 ${completedBlueprintFields} 个`,
    inputJson: {
      project: {
        title: projectTitle,
        workType: stringValue(input.project.workType),
        genre: stringValue(input.project.genre),
        targetAudience: stringValue(input.project.targetAudience),
        platform: stringValue(input.project.platform),
        totalWordTarget: numberValue(input.project.totalWordTarget),
        description: clipText(stringValue(input.project.description), 1500),
        wechatPositioning: clipText(
          stringValue(input.project.wechatPositioning),
          1000,
        ),
      },
      setting: compactSetting,
      characters,
      seriesContext: clipText(input.seriesContext, 12000),
      currentBlueprint,
      allowedFields: shortStoryBlueprintFieldNames,
    },
    inputText: [
      "# 短故事项目",
      `标题：${projectTitle}`,
      `题材：${stringValue(input.project.genre) || "未设置"}`,
      `目标读者：${stringValue(input.project.targetAudience) || "未设置"}`,
      `发布平台：${stringValue(input.project.platform) || "未设置"}`,
      `目标字数：${numberValue(input.project.totalWordTarget) ?? "未设置"}`,
      `故事简介：${clipText(stringValue(input.project.description), 1500) || "未设置"}`,
      `发布定位：${clipText(stringValue(input.project.wechatPositioning), 1000) || "未设置"}`,
      "",
      "# 已确认项目设定",
      formatNamedValues(compactSetting) || "暂无可用项目设定。",
      "",
      "# 已确认角色",
      formatCharacters(characters) || "暂无角色资料，请只使用项目中已经明确的信息。",
      "",
      "# 系列短故事连续性",
      clipText(input.seriesContext, 12000) || "当前为独立短故事，没有系列级约束。",
      "",
      "# 当前正式蓝图",
      formatBlueprint(currentBlueprint) || "尚未建立正式蓝图。",
      "",
      "# 本次任务",
      "生成一份可在目标篇幅内完成、开篇承诺与结局兑现相互闭合的短故事蓝图。",
      "反转必须由前置信息和人物选择触发，不能靠突然出现的新设定解决冲突。",
      "情绪曲线要对应具体事件压力与选择代价，结局必须回答核心冲突。",
      compactSetting.narrativePerspective
        ? "蓝图必须服从已确认叙事视角的信息边界和切换规则，不得把视角人物无法得知的事实当作直接叙述。"
        : "",
      input.seriesContext
        ? "本篇必须具备独立完整的起因、调查、真相和结局；系列长期谜团只能按已确认方向推进一小步，不得取代本篇闭环或提前揭晓未公开答案。"
        : "",
      "已有正式蓝图内容应被尊重；如需优化，只在不改变已确认方向的前提下补强。",
      "",
      "# 输出要求",
      "只输出 JSON 对象，不要输出 Markdown 或解释文字。",
      "顶层必须是 blueprint 对象，且只能包含允许的字段。",
      "所有字段都必须给出具体可执行内容；列表型内容使用换行分隔。",
      "输出只是作者待审草案，不得宣称已经写入正式蓝图、设定或正文。",
    ].join("\n"),
  };
}

export function parseShortStoryBlueprintGenerationOutput(
  output?: string | null,
): Partial<ShortStoryBlueprintValues> {
  const parsed = parseJsonLikeObject(output);
  const record = isRecord(parsed?.blueprint)
    ? parsed.blueprint
    : isRecord(parsed?.shortStoryBlueprint)
      ? parsed.shortStoryBlueprint
      : parsed;
  const values: Partial<ShortStoryBlueprintValues> = {};

  if (!isRecord(record)) {
    return values;
  }

  for (const fieldName of shortStoryBlueprintFieldNames) {
    const value = limitText(
      stringifyDraftValue(record[fieldName]),
      shortStoryBlueprintDraftTextMaxLength,
    );

    if (value) {
      values[fieldName] = value;
    }
  }

  return values;
}

export function isReviewableShortStoryBlueprintDraft(
  values: Partial<ShortStoryBlueprintValues>,
) {
  return Boolean(
    values.premise?.trim() &&
      values.coreConflict?.trim() &&
      values.ending?.trim(),
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

function formatCharacters(
  characters: Array<Record<string, string>>,
) {
  return characters
    .map((character) =>
      [
        `## ${character.name || "未命名角色"}`,
        character.roleInStory ? `故事作用：${character.roleInStory}` : "",
        character.identity ? `身份：${character.identity}` : "",
        character.desire ? `欲望：${character.desire}` : "",
        character.fear ? `恐惧：${character.fear}` : "",
        character.secret ? `秘密：${character.secret}` : "",
        character.characterArc ? `人物变化：${character.characterArc}` : "",
        character.behaviorRules ? `行为边界：${character.behaviorRules}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
}

function formatBlueprint(values: ShortStoryBlueprintValues) {
  return shortStoryBlueprintFieldNames
    .map((fieldName) => {
      const value = values[fieldName];

      return value ? `## ${fieldName}\n${clipText(value, 2500)}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
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

function stringValue(value: Scalar) {
  if (value == null) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value).trim();
}

function numberValue(value: Scalar) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

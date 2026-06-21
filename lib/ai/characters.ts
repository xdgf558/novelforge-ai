import {
  characterFieldNames,
  characterSnapshot,
  characterValuesFromRecord,
  type CharacterFieldName,
  type CharacterValues,
} from "../character-fields";

type Scalar = string | number | boolean | Date | null | undefined;

export type CharacterGenerationRequest = {
  targetRole?: string | null;
  brief?: string | null;
};

export type CharacterGenerationProject = {
  title?: Scalar;
  genre?: Scalar;
  targetAudience?: Scalar;
  platform?: Scalar;
  description?: Scalar;
};

export type CharacterGenerationSetting =
  | Record<string, Scalar>
  | null
  | undefined;

export type CharacterGenerationCharacter = Partial<
  Record<CharacterFieldName, string | null | undefined>
>;

export type CharacterGenerationRelationship = {
  relationshipType?: Scalar;
  status?: Scalar;
  summary?: Scalar;
  dynamics?: Scalar;
  sourceCharacter?: { name?: Scalar } | null;
  targetCharacter?: { name?: Scalar } | null;
};

export type CharacterGenerationOutline = {
  level?: Scalar;
  title?: Scalar;
  status?: Scalar;
  goal?: Scalar;
  characterChanges?: Scalar;
  characters?: Scalar;
  startChapter?: Scalar;
  endChapter?: Scalar;
  chapterNumber?: Scalar;
};

export type CharacterGenerationInput = {
  project: CharacterGenerationProject;
  setting?: CharacterGenerationSetting;
  characters: readonly CharacterGenerationCharacter[];
  relationships?: readonly CharacterGenerationRelationship[];
  outlines?: readonly CharacterGenerationOutline[];
  request: CharacterGenerationRequest;
};

export type ParsedCharacterDraft = {
  values: Partial<CharacterValues>;
  suggestedRelationships: string[];
};

export function buildCharacterGenerationContext(
  input: CharacterGenerationInput,
) {
  const projectTitle = stringValue(input.project.title) || "未命名项目";
  const brief = stringValue(input.request.brief);
  const targetRole = stringValue(input.request.targetRole) || "未指定";
  const existingCharacterCount = input.characters.length;

  return {
    inputContextSummary: `${projectTitle} 人物草案生成；目标定位：${targetRole}；现有角色 ${existingCharacterCount} 个`,
    inputJson: {
      project: {
        title: stringValue(input.project.title),
        genre: stringValue(input.project.genre),
        targetAudience: stringValue(input.project.targetAudience),
        platform: stringValue(input.project.platform),
        description: stringValue(input.project.description),
      },
      request: {
        targetRole,
        brief,
      },
      existingCharacters: input.characters.map((character) =>
        characterValuesFromRecord(character),
      ),
      relationships: (input.relationships ?? []).map((relationship) => ({
        source: stringValue(relationship.sourceCharacter?.name),
        target: stringValue(relationship.targetCharacter?.name),
        type: stringValue(relationship.relationshipType),
        status: stringValue(relationship.status),
        summary: stringValue(relationship.summary),
        dynamics: stringValue(relationship.dynamics),
      })),
      outlines: (input.outlines ?? []).map((outline) => ({
        level: stringValue(outline.level),
        title: stringValue(outline.title),
        status: stringValue(outline.status),
        range: formatOutlineRange(outline),
        goal: stringValue(outline.goal),
        characterChanges: stringValue(outline.characterChanges),
        characters: stringValue(outline.characters),
      })),
      allowedFields: characterFieldNames,
    },
    inputText: [
      "# 项目基础",
      `标题：${projectTitle}`,
      `题材：${stringValue(input.project.genre) || "未设置"}`,
      `目标读者：${stringValue(input.project.targetAudience) || "未设置"}`,
      `平台：${stringValue(input.project.platform) || "未设置"}`,
      `简介：${stringValue(input.project.description) || "未设置"}`,
      "",
      "# 角色生成需求",
      `目标定位：${targetRole}`,
      `作者补充：${brief || "未填写"}`,
      "",
      "# 项目设定摘要",
      formatSetting(input.setting) || "暂无项目设定。",
      "",
      "# 已有角色",
      formatCharacters(input.characters) || "暂无已有角色。",
      "",
      "# 已有人物关系",
      formatRelationships(input.relationships ?? []) || "暂无人物关系记录。",
      "",
      "# 相关大纲",
      formatOutlines(input.outlines ?? []) || "暂无大纲记录。",
      "",
      "# 输出要求",
      "只输出 JSON 对象，不要输出 Markdown 或解释文字。",
      "顶层字段必须包含 character；可以包含 suggestedRelationships 数组。",
      "character 里的字段只能使用下列字段名；未知字段留空字符串，不要发明正式记忆：",
      characterFieldNames.map((fieldName) => `- ${fieldName}`).join("\n"),
      "人物草案只是供作者审核，不能宣称已经写入正式角色库。",
      "建议关系只写成短句，后续需要作者手动创建人物关系记录。",
    ].join("\n"),
  };
}

export function parseCharacterGenerationOutput(
  output?: string | null,
): ParsedCharacterDraft {
  const parsed = parseJsonLikeObject(output);
  const record = isRecord(parsed?.character)
    ? parsed.character
    : isRecord(parsed?.profile)
      ? parsed.profile
      : parsed;
  const values: Partial<CharacterValues> = {};

  if (isRecord(record)) {
    for (const fieldName of characterFieldNames) {
      const value = stringifyDraftValue(record[fieldName]);

      if (value) {
        values[fieldName] = value;
      }
    }
  }

  return {
    values: characterSnapshot(characterValuesFromRecord(values)),
    suggestedRelationships: parseSuggestedRelationships(parsed),
  };
}

export function hasCharacterDraftValues(values: Partial<CharacterValues>) {
  return Boolean(values.name?.trim());
}

function parseSuggestedRelationships(parsed: unknown) {
  const raw = isRecord(parsed) ? parsed.suggestedRelationships : undefined;

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => stringifyDraftValue(item))
    .filter(Boolean)
    .slice(0, 10);
}

function formatSetting(setting: CharacterGenerationSetting) {
  if (!setting) {
    return "";
  }

  return Object.entries(setting)
    .map(([key, value]) => {
      const content = stringValue(value);

      return content ? `## ${key}\n${content}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function formatCharacters(characters: readonly CharacterGenerationCharacter[]) {
  return characters
    .map((character) => {
      const values = characterValuesFromRecord(character);
      const details = [
        values.roleInStory ? `定位：${values.roleInStory}` : "",
        values.identity ? `身份：${values.identity}` : "",
        values.desire ? `欲望：${values.desire}` : "",
        values.behaviorRules ? `行为规则：${values.behaviorRules}` : "",
        values.knownInfo ? `已知信息：${values.knownInfo}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      return values.name ? `## ${values.name}\n${details || "暂无细节"}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function formatRelationships(
  relationships: readonly CharacterGenerationRelationship[],
) {
  return relationships
    .map((relationship) => {
      const source = stringValue(relationship.sourceCharacter?.name) || "未知";
      const target = stringValue(relationship.targetCharacter?.name) || "未知";
      const summary = stringValue(relationship.summary);

      return [
        `- ${source} -> ${target}`,
        `类型：${stringValue(relationship.relationshipType) || "未设置"}`,
        `状态：${stringValue(relationship.status) || "未设置"}`,
        summary ? `摘要：${summary}` : "",
        stringValue(relationship.dynamics)
          ? `变化：${stringValue(relationship.dynamics)}`
          : "",
      ]
        .filter(Boolean)
        .join("；");
    })
    .join("\n");
}

function formatOutlines(outlines: readonly CharacterGenerationOutline[]) {
  return outlines
    .map((outline) => {
      const title = stringValue(outline.title);

      if (!title) {
        return "";
      }

      return [
        `## ${title}`,
        `层级：${stringValue(outline.level) || "未设置"}`,
        `范围：${formatOutlineRange(outline) || "未设置"}`,
        stringValue(outline.goal) ? `目标：${stringValue(outline.goal)}` : "",
        stringValue(outline.characterChanges)
          ? `人物变化：${stringValue(outline.characterChanges)}`
          : "",
        stringValue(outline.characters)
          ? `涉及角色：${stringValue(outline.characters)}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

function formatOutlineRange(outline: CharacterGenerationOutline) {
  const chapterNumber = numberValue(outline.chapterNumber);
  const startChapter = numberValue(outline.startChapter);
  const endChapter = numberValue(outline.endChapter);

  if (chapterNumber) {
    return `第 ${chapterNumber} 章`;
  }

  if (startChapter && endChapter) {
    return `第 ${startChapter}-${endChapter} 章`;
  }

  if (startChapter) {
    return `第 ${startChapter} 章起`;
  }

  if (endChapter) {
    return `截至第 ${endChapter} 章`;
  }

  return "";
}

function parseJsonLikeObject(output?: string | null) {
  const text = output?.trim();

  if (!text) {
    return null;
  }

  for (const candidate of jsonCandidates(text)) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

function jsonCandidates(text: string) {
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

  return candidates;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

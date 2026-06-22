import {
  normalizeRelationshipDirection,
  normalizeRelationshipStatus,
  normalizeRelationshipType,
  type CharacterRelationshipDirection,
  type CharacterRelationshipStatus,
  type CharacterRelationshipType,
} from "../character-relationship-fields";

type Scalar = string | number | boolean | Date | null | undefined;

export const characterRelationshipGenerationTaskType =
  "character_relationship_generation";

export type CharacterRelationshipGenerationProject = {
  title?: Scalar;
  genre?: Scalar;
  targetAudience?: Scalar;
  platform?: Scalar;
  description?: Scalar;
};

export type CharacterRelationshipGenerationSetting =
  | Record<string, Scalar>
  | null
  | undefined;

export type CharacterRelationshipGenerationCharacter = {
  id?: Scalar;
  name?: Scalar;
  roleInStory?: Scalar;
  identity?: Scalar;
  status?: Scalar;
  desire?: Scalar;
  fear?: Scalar;
  secret?: Scalar;
  relationToProtagonist?: Scalar;
  relationToAntagonist?: Scalar;
  knownInfo?: Scalar;
  hiddenInfo?: Scalar;
  behaviorRules?: Scalar;
  characterArc?: Scalar;
  latestAppearance?: Scalar;
};

export type CharacterRelationshipGenerationRelationship = {
  sourceCharacterId?: Scalar;
  targetCharacterId?: Scalar;
  relationshipType?: Scalar;
  direction?: Scalar;
  status?: Scalar;
  summary?: Scalar;
  dynamics?: Scalar;
  evidence?: Scalar;
  sourceCharacter?: { id?: Scalar; name?: Scalar } | null;
  targetCharacter?: { id?: Scalar; name?: Scalar } | null;
  sourceChapter?: { chapterNumber?: Scalar; title?: Scalar } | null;
};

export type CharacterRelationshipGenerationOutline = {
  level?: Scalar;
  title?: Scalar;
  status?: Scalar;
  startChapter?: Scalar;
  endChapter?: Scalar;
  chapterNumber?: Scalar;
  goal?: Scalar;
  characters?: Scalar;
  characterChanges?: Scalar;
};

export type CharacterRelationshipGenerationChapter = {
  chapterNumber?: Scalar;
  title?: Scalar;
  status?: Scalar;
  goal?: Scalar;
  summaryOutput?: Scalar;
};

export type CharacterRelationshipGenerationInput = {
  project: CharacterRelationshipGenerationProject;
  setting?: CharacterRelationshipGenerationSetting;
  characters: readonly CharacterRelationshipGenerationCharacter[];
  relationships: readonly CharacterRelationshipGenerationRelationship[];
  outlines?: readonly CharacterRelationshipGenerationOutline[];
  recentChapters?: readonly CharacterRelationshipGenerationChapter[];
};

export type ParsedCharacterRelationshipDraft = {
  sourceCharacterId?: string;
  sourceCharacterName?: string;
  targetCharacterId?: string;
  targetCharacterName?: string;
  relationshipType: CharacterRelationshipType;
  direction: CharacterRelationshipDirection;
  status: Exclude<CharacterRelationshipStatus, "archived">;
  summary: string;
  dynamics: string;
  evidence: string;
  sourceChapterId?: string;
  sourceChapterNumber?: number | null;
  rationale: string;
};

const draftTextMaxLength = 12000;
const draftShortTextMaxLength = 1200;
const draftMediumTextMaxLength = 3000;
const maxDraftRelationships = 12;

export function buildCharacterRelationshipGenerationContext(
  input: CharacterRelationshipGenerationInput,
) {
  const projectTitle = stringValue(input.project.title) || "未命名项目";
  const activeCharacterCount = input.characters.length;
  const existingRelationshipCount = input.relationships.length;

  return {
    inputContextSummary: `${projectTitle} 人物关系草案生成；角色 ${activeCharacterCount} 个；已有关系 ${existingRelationshipCount} 条`,
    inputJson: {
      project: {
        title: stringValue(input.project.title),
        genre: stringValue(input.project.genre),
        targetAudience: stringValue(input.project.targetAudience),
        platform: stringValue(input.project.platform),
        description: stringValue(input.project.description),
      },
      setting: compactSetting(input.setting),
      characters: input.characters.map((character) => ({
        id: stringValue(character.id),
        name: stringValue(character.name),
        roleInStory: stringValue(character.roleInStory),
        identity: stringValue(character.identity),
        status: stringValue(character.status),
        desire: stringValue(character.desire),
        fear: stringValue(character.fear),
        secret: stringValue(character.secret),
        relationToProtagonist: stringValue(character.relationToProtagonist),
        relationToAntagonist: stringValue(character.relationToAntagonist),
        knownInfo: stringValue(character.knownInfo),
        hiddenInfo: stringValue(character.hiddenInfo),
        behaviorRules: stringValue(character.behaviorRules),
        characterArc: stringValue(character.characterArc),
        latestAppearance: stringValue(character.latestAppearance),
      })),
      existingRelationships: input.relationships.map((relationship) => ({
        sourceCharacterId: stringValue(
          relationship.sourceCharacterId ?? relationship.sourceCharacter?.id,
        ),
        sourceCharacterName: stringValue(relationship.sourceCharacter?.name),
        targetCharacterId: stringValue(
          relationship.targetCharacterId ?? relationship.targetCharacter?.id,
        ),
        targetCharacterName: stringValue(relationship.targetCharacter?.name),
        relationshipType: stringValue(relationship.relationshipType),
        direction: stringValue(relationship.direction),
        status: stringValue(relationship.status),
        summary: clipText(stringValue(relationship.summary), 800),
        dynamics: clipText(stringValue(relationship.dynamics), 800),
        evidence: clipText(stringValue(relationship.evidence), 800),
      })),
      outlines: (input.outlines ?? []).map((outline) => ({
        level: stringValue(outline.level),
        title: stringValue(outline.title),
        status: stringValue(outline.status),
        range: formatOutlineRange(outline),
        goal: clipText(stringValue(outline.goal), 1000),
        characters: clipText(stringValue(outline.characters), 800),
        characterChanges: clipText(stringValue(outline.characterChanges), 800),
      })),
      recentChapters: (input.recentChapters ?? []).map((chapter) => ({
        chapterNumber: numberValue(chapter.chapterNumber),
        title: stringValue(chapter.title),
        status: stringValue(chapter.status),
        goal: clipText(stringValue(chapter.goal), 1000),
        summaryOutput: clipText(stringValue(chapter.summaryOutput), 1500),
      })),
      allowedValues: {
        relationshipType: [
          "family",
          "ally",
          "partner",
          "mentor",
          "rival",
          "enemy",
          "romantic",
          "business",
          "secret",
          "other",
        ],
        direction: [
          "two_way",
          "source_to_target",
          "target_to_source",
          "unclear",
        ],
        status: ["active", "tension", "hidden", "resolved"],
      },
    },
    inputText: [
      "# 项目基础",
      `标题：${projectTitle}`,
      `题材：${stringValue(input.project.genre) || "未设置"}`,
      `目标读者：${stringValue(input.project.targetAudience) || "未设置"}`,
      `平台：${stringValue(input.project.platform) || "未设置"}`,
      `简介：${stringValue(input.project.description) || "未设置"}`,
      "",
      "# 项目设定摘要",
      formatSetting(input.setting) || "暂无项目设定。",
      "",
      "# 可用角色（只能使用这些 id）",
      formatCharacters(input.characters) || "暂无可用角色。",
      "",
      "# 已有人物关系（不要重复生成）",
      formatRelationships(input.relationships) || "暂无人物关系记录。",
      "",
      "# 相关大纲",
      formatOutlines(input.outlines ?? []) || "暂无大纲记录。",
      "",
      "# 最近章节与摘要",
      formatChapters(input.recentChapters ?? []) || "暂无最近章节摘要。",
      "",
      "# 输出要求",
      "只输出 JSON 对象，不要输出 Markdown 或解释文字。",
      "顶层字段必须是 relationships 数组，建议输出 4-10 条最有价值的人物关系草案。",
      "每条关系必须使用可用角色列表中的 sourceCharacterId 和 targetCharacterId，不要发明角色。",
      "避免和已有人物关系重复；同一对角色只在确有阶段差异时输出一条最关键关系。",
      "关系草案只是供作者审核，不能宣称已经写入正式人物关系网络。",
      "relationshipType 只能使用：family, ally, partner, mentor, rival, enemy, romantic, business, secret, other。",
      "direction 只能使用：two_way, source_to_target, target_to_source, unclear。",
      "status 只能使用：active, tension, hidden, resolved。",
      "JSON 示例：",
      JSON.stringify(
        {
          relationships: [
            {
              sourceCharacterId: "character_id",
              sourceCharacterName: "角色甲",
              targetCharacterId: "character_id",
              targetCharacterName: "角色乙",
              relationshipType: "partner",
              direction: "two_way",
              status: "active",
              summary: "两人形成早期执行搭档关系。",
              dynamics: "后续会因资金与眼界差距出现张力。",
              evidence: "第 2 章二人确认合伙。",
              sourceChapterNumber: 2,
              rationale: "这条关系会影响后续人物生成和连续性检查。",
            },
          ],
        },
        null,
        2,
      ),
    ].join("\n"),
  };
}

export function parseCharacterRelationshipGenerationOutput(
  output?: string | null,
): ParsedCharacterRelationshipDraft[] {
  const parsed = parseJsonLikeObject(output);
  const rawRelationships = isRecord(parsed)
    ? parsed.relationships ?? parsed.characterRelationships ?? parsed.suggestions
    : undefined;

  if (!Array.isArray(rawRelationships)) {
    return [];
  }

  return rawRelationships
    .map(parseRelationshipDraftItem)
    .filter(
      (draft): draft is ParsedCharacterRelationshipDraft =>
        Boolean(draft?.summary),
    )
    .slice(0, maxDraftRelationships);
}

function parseRelationshipDraftItem(
  item: unknown,
): ParsedCharacterRelationshipDraft | null {
  if (!isRecord(item)) {
    return null;
  }

  const source = item.source;
  const target = item.target;
  const status = normalizeRelationshipStatus(
    stringifyDraftValue(item.status ?? item.relationshipStatus),
  );

  return {
    sourceCharacterId: firstText(
      item.sourceCharacterId,
      item.sourceId,
      isRecord(source) ? source.id ?? source.characterId : undefined,
    ),
    sourceCharacterName: firstText(
      item.sourceCharacterName,
      item.sourceName,
      isRecord(source) ? source.name : source,
    ),
    targetCharacterId: firstText(
      item.targetCharacterId,
      item.targetId,
      isRecord(target) ? target.id ?? target.characterId : undefined,
    ),
    targetCharacterName: firstText(
      item.targetCharacterName,
      item.targetName,
      isRecord(target) ? target.name : target,
    ),
    relationshipType: normalizeRelationshipType(
      stringifyDraftValue(item.relationshipType ?? item.type),
    ),
    direction: normalizeRelationshipDirection(stringifyDraftValue(item.direction)),
    status: status === "archived" ? "active" : status,
    summary: clipText(
      stringifyDraftValue(item.summary ?? item.description),
      draftShortTextMaxLength,
    ),
    dynamics: clipText(
      stringifyDraftValue(item.dynamics ?? item.arc ?? item.stageChanges),
      draftMediumTextMaxLength,
    ),
    evidence: clipText(
      stringifyDraftValue(item.evidence ?? item.sourceEvidence),
      draftMediumTextMaxLength,
    ),
    sourceChapterId: firstText(
      item.sourceChapterId,
      isRecord(item.sourceChapter) ? item.sourceChapter.id : undefined,
    ),
    sourceChapterNumber: firstNumber(
      item.sourceChapterNumber,
      item.chapterNumber,
      isRecord(item.sourceChapter) ? item.sourceChapter.chapterNumber : undefined,
    ),
    rationale: clipText(
      stringifyDraftValue(item.rationale ?? item.reason),
      draftShortTextMaxLength,
    ),
  };
}

function compactSetting(setting: CharacterRelationshipGenerationSetting) {
  if (!setting) {
    return null;
  }

  return Object.fromEntries(
    Object.entries(setting)
      .map(([key, value]) => [key, clipText(stringValue(value), 1200)] as const)
      .filter(([, value]) => Boolean(value)),
  );
}

function formatSetting(setting: CharacterRelationshipGenerationSetting) {
  if (!setting) {
    return "";
  }

  return Object.entries(setting)
    .map(([key, value]) => {
      const content = clipText(stringValue(value), 1200);

      return content ? `## ${key}\n${content}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function formatCharacters(
  characters: readonly CharacterRelationshipGenerationCharacter[],
) {
  return characters
    .map((character) => {
      const id = stringValue(character.id);
      const name = stringValue(character.name);

      if (!id || !name) {
        return "";
      }

      const details = [
        `id：${id}`,
        `姓名：${name}`,
        stringValue(character.roleInStory)
          ? `定位：${stringValue(character.roleInStory)}`
          : "",
        stringValue(character.identity)
          ? `身份：${stringValue(character.identity)}`
          : "",
        stringValue(character.desire)
          ? `欲望：${stringValue(character.desire)}`
          : "",
        stringValue(character.behaviorRules)
          ? `行为规则：${stringValue(character.behaviorRules)}`
          : "",
        stringValue(character.knownInfo)
          ? `已知信息：${stringValue(character.knownInfo)}`
          : "",
        stringValue(character.hiddenInfo)
          ? `隐藏信息：${stringValue(character.hiddenInfo)}`
          : "",
        stringValue(character.latestAppearance)
          ? `最近出场：${stringValue(character.latestAppearance)}`
          : "",
      ];

      return `## ${name}\n${details.filter(Boolean).join("\n")}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

function formatRelationships(
  relationships: readonly CharacterRelationshipGenerationRelationship[],
) {
  return relationships
    .map((relationship) => {
      const source =
        stringValue(relationship.sourceCharacter?.name) ||
        stringValue(relationship.sourceCharacterId) ||
        "未知";
      const target =
        stringValue(relationship.targetCharacter?.name) ||
        stringValue(relationship.targetCharacterId) ||
        "未知";

      return [
        `- ${source} -> ${target}`,
        `类型：${stringValue(relationship.relationshipType) || "未设置"}`,
        `方向：${stringValue(relationship.direction) || "未设置"}`,
        `状态：${stringValue(relationship.status) || "未设置"}`,
        stringValue(relationship.summary)
          ? `摘要：${clipText(stringValue(relationship.summary), 800)}`
          : "",
        stringValue(relationship.dynamics)
          ? `变化：${clipText(stringValue(relationship.dynamics), 800)}`
          : "",
      ]
        .filter(Boolean)
        .join("；");
    })
    .join("\n");
}

function formatOutlines(
  outlines: readonly CharacterRelationshipGenerationOutline[],
) {
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
        stringValue(outline.goal)
          ? `目标：${clipText(stringValue(outline.goal), 1000)}`
          : "",
        stringValue(outline.characters)
          ? `涉及角色：${clipText(stringValue(outline.characters), 800)}`
          : "",
        stringValue(outline.characterChanges)
          ? `人物变化：${clipText(stringValue(outline.characterChanges), 800)}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

function formatChapters(
  chapters: readonly CharacterRelationshipGenerationChapter[],
) {
  return chapters
    .map((chapter) => {
      const chapterNumber = numberValue(chapter.chapterNumber);
      const title = stringValue(chapter.title);

      return [
        `## 第 ${chapterNumber || "?"} 章 ${title || "未命名"}`,
        stringValue(chapter.status) ? `状态：${stringValue(chapter.status)}` : "",
        stringValue(chapter.goal)
          ? `章节目标：${clipText(stringValue(chapter.goal), 1000)}`
          : "",
        stringValue(chapter.summaryOutput)
          ? `摘要任务输出：${clipText(stringValue(chapter.summaryOutput), 1500)}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

function formatOutlineRange(outline: CharacterRelationshipGenerationOutline) {
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

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = stringifyDraftValue(value);

    if (text) {
      return clipText(text, draftShortTextMaxLength);
    }
  }

  return undefined;
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    const parsed =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number(value.trim())
          : null;

    if (parsed && Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function clipText(value: string, maxLength: number) {
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
  if (value == null) {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(String(value));

  return Number.isFinite(parsed) ? parsed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

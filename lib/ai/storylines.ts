import {
  normalizeStorylineStatus,
  normalizeStorylineType,
  storylineStatusOptions,
  storylineTypeOptions,
  type StorylineStatus,
  type StorylineType,
} from "../storyline-fields";

type Scalar = string | number | boolean | Date | null | undefined;

export const storylineGenerationTaskType = "storyline_generation";

export type StorylineGenerationProject = {
  title?: Scalar;
  genre?: Scalar;
  targetAudience?: Scalar;
  platform?: Scalar;
  description?: Scalar;
};

export type StorylineGenerationSetting =
  | Record<string, Scalar>
  | null
  | undefined;

export type StorylineGenerationCharacter = {
  id?: Scalar;
  name?: Scalar;
  status?: Scalar;
  roleInStory?: Scalar;
  identity?: Scalar;
  characterArc?: Scalar;
  latestAppearance?: Scalar;
};

export type StorylineGenerationForeshadow = {
  id?: Scalar;
  content?: Scalar;
  status?: Scalar;
  importance?: Scalar;
  expectedResolveChapter?: Scalar;
};

export type StorylineGenerationChapter = {
  id?: Scalar;
  chapterNumber?: Scalar;
  title?: Scalar;
  status?: Scalar;
  goal?: Scalar;
  summaryOutput?: Scalar;
};

export type StorylineGenerationOutline = {
  id?: Scalar;
  level?: Scalar;
  title?: Scalar;
  status?: Scalar;
  chapterNumber?: Scalar;
  startChapter?: Scalar;
  endChapter?: Scalar;
  goal?: Scalar;
  mainlineProgression?: Scalar;
  coreEvents?: Scalar;
  characterChanges?: Scalar;
  foreshadow?: Scalar;
  resolvedForeshadow?: Scalar;
};

export type StorylineGenerationStoryline = {
  id?: Scalar;
  name?: Scalar;
  type?: Scalar;
  status?: Scalar;
  startChapter?: Scalar;
  endChapter?: Scalar;
  coreGoal?: Scalar;
  currentProgress?: Scalar;
};

export type StorylineGenerationInput = {
  project: StorylineGenerationProject;
  setting?: StorylineGenerationSetting;
  characters: readonly StorylineGenerationCharacter[];
  foreshadows: readonly StorylineGenerationForeshadow[];
  chapters: readonly StorylineGenerationChapter[];
  outlines: readonly StorylineGenerationOutline[];
  existingStorylines: readonly StorylineGenerationStoryline[];
};

export type ParsedStorylineDraft = {
  name: string;
  type: StorylineType;
  status: Exclude<StorylineStatus, "archived">;
  startChapter: number | null;
  endChapter: number | null;
  coreGoal: string;
  currentProgress: string;
  notes: string;
  characterIds: string[];
  foreshadowIds: string[];
  chapterIds: string[];
  outlineIds: string[];
  rationale: string;
};

const textMaxLength = 12000;
const mediumTextMaxLength = 3000;
const shortTextMaxLength = 800;
const nameMaxLength = 160;
const maxDraftStorylines = 8;

export function buildStorylineGenerationContext(input: StorylineGenerationInput) {
  const projectTitle = stringValue(input.project.title) || "未命名项目";
  const activeCharacterCount = input.characters.length;
  const chapterCount = input.chapters.length;
  const existingStorylineCount = input.existingStorylines.length;

  return {
    inputContextSummary: `${projectTitle} 故事线草案生成；角色 ${activeCharacterCount} 个；章节 ${chapterCount} 个；已有故事线 ${existingStorylineCount} 条`,
    inputJson: {
      project: {
        title: stringValue(input.project.title),
        genre: stringValue(input.project.genre),
        targetAudience: stringValue(input.project.targetAudience),
        platform: stringValue(input.project.platform),
        description: clipText(stringValue(input.project.description), 1200),
      },
      setting: compactSetting(input.setting),
      existingStorylines: input.existingStorylines.map(compactStoryline),
      characters: input.characters.map(compactCharacter),
      foreshadows: input.foreshadows.map(compactForeshadow),
      chapters: input.chapters.map(compactChapter),
      outlines: input.outlines.map(compactOutline),
      allowedValues: {
        type: storylineTypeOptions.map((option) => option.value),
        status: storylineStatusOptions
          .map((option) => option.value)
          .filter((status) => status !== "archived"),
      },
    },
    inputText: [
      "# 项目基础",
      `标题：${projectTitle}`,
      `题材：${stringValue(input.project.genre) || "未设置"}`,
      `目标读者：${stringValue(input.project.targetAudience) || "未设置"}`,
      `平台：${stringValue(input.project.platform) || "未设置"}`,
      `简介：${clipText(stringValue(input.project.description), 1200) || "未设置"}`,
      "",
      "# 项目设定摘要",
      formatSetting(input.setting) || "暂无项目设定。",
      "",
      "# 已有正式故事线（不要重复生成）",
      formatStorylines(input.existingStorylines) || "暂无正式故事线。",
      "",
      "# 可关联角色（只能引用这些 id）",
      formatCharacters(input.characters) || "暂无角色。",
      "",
      "# 可关联伏笔（只能引用这些 id）",
      formatForeshadows(input.foreshadows) || "暂无伏笔。",
      "",
      "# 可关联章节（只能引用这些 id）",
      formatChapters(input.chapters) || "暂无章节。",
      "",
      "# 可关联大纲（只能引用这些 id）",
      formatOutlines(input.outlines) || "暂无大纲。",
      "",
      "# 输出要求",
      "只输出 JSON 对象，不要输出 Markdown 或解释文字。",
      "顶层字段必须是 storylines 数组，建议输出 3-6 条最值得作者确认的故事线候选。",
      "每条故事线必须包含 name、type、status、coreGoal、currentProgress。",
      "type 只能使用：mainline, subplot, character_arc, business_line, antagonist_line, foreshadow_line, world_line, other。",
      "status 只能使用：planned, active, paused, completed。不要输出 archived。",
      "关联字段只能引用上方列表里真实存在的 id，不要发明角色、伏笔、章节或大纲 id。",
      "避免重复已有正式故事线；如果已有故事线已经覆盖，只能提出补充角度更清晰的候选。",
      "这些只是供作者审阅的候选，不得宣称已经写入正式故事线。",
      "JSON 示例：",
      JSON.stringify(
        {
          storylines: [
            {
              name: "县城第一桶金主线",
              type: "mainline",
              status: "active",
              startChapter: 1,
              endChapter: 30,
              coreGoal: "陈远在县城用技术和信息差拿到第一桶金。",
              currentProgress: "已完成培训班切入和本地竞争压力建立。",
              notes: "后续重点跟踪供货渠道、网吧机会和母亲态度变化。",
              characterIds: ["character_id"],
              foreshadowIds: ["foreshadow_id"],
              chapterIds: ["chapter_id"],
              outlineIds: ["outline_id"],
              rationale: "这条线连接章节目标、大纲和主要商业冲突。",
            },
          ],
        },
        null,
        2,
      ),
    ].join("\n"),
  };
}

export function parseStorylineGenerationOutput(
  output?: string | null,
): ParsedStorylineDraft[] {
  const parsed = parseJsonLikeObject(output);
  const rawStorylines = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed)
      ? parsed.storylines ?? parsed.candidates ?? parsed.suggestions
      : undefined;

  if (!Array.isArray(rawStorylines)) {
    return [];
  }

  return rawStorylines
    .map(parseStorylineDraftItem)
    .filter((draft): draft is ParsedStorylineDraft => Boolean(draft?.name))
    .slice(0, maxDraftStorylines);
}

function parseStorylineDraftItem(item: unknown): ParsedStorylineDraft | null {
  if (!isRecord(item)) {
    return null;
  }

  const status = normalizeStorylineStatus(stringifyDraftValue(item.status));

  return {
    name: clipText(
      stringifyDraftValue(item.name ?? item.title),
      nameMaxLength,
    ),
    type: normalizeStorylineType(stringifyDraftValue(item.type)),
    status: status === "archived" ? "planned" : status,
    startChapter: firstNumber(item.startChapter, item.start_chapter),
    endChapter: firstNumber(item.endChapter, item.end_chapter),
    coreGoal: clipText(
      stringifyDraftValue(item.coreGoal ?? item.goal ?? item.core_goal),
      mediumTextMaxLength,
    ),
    currentProgress: clipText(
      stringifyDraftValue(
        item.currentProgress ?? item.progress ?? item.current_progress,
      ),
      mediumTextMaxLength,
    ),
    notes: clipText(stringifyDraftValue(item.notes), mediumTextMaxLength),
    characterIds: uniqueTextList(
      item.characterIds ?? item.relatedCharacterIds ?? item.characters,
    ),
    foreshadowIds: uniqueTextList(
      item.foreshadowIds ?? item.relatedForeshadowIds ?? item.foreshadows,
    ),
    chapterIds: uniqueTextList(
      item.chapterIds ?? item.relatedChapterIds ?? item.chapters,
    ),
    outlineIds: uniqueTextList(
      item.outlineIds ?? item.relatedOutlineIds ?? item.outlines,
    ),
    rationale: clipText(
      stringifyDraftValue(item.rationale ?? item.reason),
      shortTextMaxLength,
    ),
  };
}

function compactSetting(setting: StorylineGenerationSetting) {
  if (!setting) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(setting)
      .map(([key, value]) => [key, clipText(stringValue(value), 1500)] as const)
      .filter(([, value]) => Boolean(value)),
  );
}

function compactStoryline(storyline: StorylineGenerationStoryline) {
  return {
    id: stringValue(storyline.id),
    name: stringValue(storyline.name),
    type: stringValue(storyline.type),
    status: stringValue(storyline.status),
    range: chapterRange(storyline),
    coreGoal: clipText(stringValue(storyline.coreGoal), 1000),
    currentProgress: clipText(stringValue(storyline.currentProgress), 1000),
  };
}

function compactCharacter(character: StorylineGenerationCharacter) {
  return {
    id: stringValue(character.id),
    name: stringValue(character.name),
    status: stringValue(character.status),
    roleInStory: clipText(stringValue(character.roleInStory), 500),
    identity: clipText(stringValue(character.identity), 500),
    characterArc: clipText(stringValue(character.characterArc), 800),
    latestAppearance: clipText(stringValue(character.latestAppearance), 300),
  };
}

function compactForeshadow(foreshadow: StorylineGenerationForeshadow) {
  return {
    id: stringValue(foreshadow.id),
    content: clipText(stringValue(foreshadow.content), 1000),
    status: stringValue(foreshadow.status),
    importance: stringValue(foreshadow.importance),
    expectedResolveChapter: numberValue(foreshadow.expectedResolveChapter),
  };
}

function compactChapter(chapter: StorylineGenerationChapter) {
  return {
    id: stringValue(chapter.id),
    chapterNumber: numberValue(chapter.chapterNumber),
    title: stringValue(chapter.title),
    status: stringValue(chapter.status),
    goal: clipText(stringValue(chapter.goal), 1000),
    summaryOutput: clipText(stringValue(chapter.summaryOutput), 1500),
  };
}

function compactOutline(outline: StorylineGenerationOutline) {
  return {
    id: stringValue(outline.id),
    level: stringValue(outline.level),
    title: stringValue(outline.title),
    status: stringValue(outline.status),
    range: chapterRange(outline),
    goal: clipText(stringValue(outline.goal), 1000),
    mainlineProgression: clipText(stringValue(outline.mainlineProgression), 800),
    coreEvents: clipText(stringValue(outline.coreEvents), 800),
    characterChanges: clipText(stringValue(outline.characterChanges), 800),
    foreshadow: clipText(stringValue(outline.foreshadow), 800),
    resolvedForeshadow: clipText(stringValue(outline.resolvedForeshadow), 800),
  };
}

function formatSetting(setting: StorylineGenerationSetting) {
  if (!setting) {
    return "";
  }

  return Object.entries(compactSetting(setting))
    .map(([key, value]) => `## ${key}\n${value}`)
    .join("\n\n");
}

function formatStorylines(storylines: readonly StorylineGenerationStoryline[]) {
  return storylines
    .map((storyline) => {
      const item = compactStoryline(storyline);

      return item.name
        ? [
            `- ${item.name}（id:${item.id || "未设置"}）`,
            `类型：${item.type || "未设置"}`,
            `状态：${item.status || "未设置"}`,
            `范围：${item.range || "未设置"}`,
            item.coreGoal ? `目标：${item.coreGoal}` : "",
            item.currentProgress ? `进展：${item.currentProgress}` : "",
          ]
            .filter(Boolean)
            .join("；")
        : "";
    })
    .filter(Boolean)
    .join("\n");
}

function formatCharacters(characters: readonly StorylineGenerationCharacter[]) {
  return characters
    .map((character) => {
      const item = compactCharacter(character);

      return item.id && item.name
        ? [
            `- ${item.name}（id:${item.id}）`,
            item.roleInStory ? `定位：${item.roleInStory}` : "",
            item.identity ? `身份：${item.identity}` : "",
            item.characterArc ? `角色弧：${item.characterArc}` : "",
          ]
            .filter(Boolean)
            .join("；")
        : "";
    })
    .filter(Boolean)
    .join("\n");
}

function formatForeshadows(
  foreshadows: readonly StorylineGenerationForeshadow[],
) {
  return foreshadows
    .map((foreshadow) => {
      const item = compactForeshadow(foreshadow);

      return item.id && item.content
        ? [
            `- ${item.content}（id:${item.id}）`,
            `状态：${item.status || "未设置"}`,
            `重要度：${item.importance || "未设置"}`,
            item.expectedResolveChapter
              ? `预计回收：第 ${item.expectedResolveChapter} 章`
              : "",
          ]
            .filter(Boolean)
            .join("；")
        : "";
    })
    .filter(Boolean)
    .join("\n");
}

function formatChapters(chapters: readonly StorylineGenerationChapter[]) {
  return chapters
    .map((chapter) => {
      const item = compactChapter(chapter);

      return item.id
        ? [
            `## 第 ${item.chapterNumber ?? "?"} 章《${item.title || "未命名"}》（id:${item.id}）`,
            `状态：${item.status || "未设置"}`,
            item.goal ? `目标：${item.goal}` : "",
            item.summaryOutput ? `摘要任务输出：${item.summaryOutput}` : "",
          ]
            .filter(Boolean)
            .join("\n")
        : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function formatOutlines(outlines: readonly StorylineGenerationOutline[]) {
  return outlines
    .map((outline) => {
      const item = compactOutline(outline);

      return item.id
        ? [
            `## ${item.title || "未命名大纲"}（id:${item.id}）`,
            `层级：${item.level || "未设置"}`,
            `状态：${item.status || "未设置"}`,
            `范围：${item.range || "未设置"}`,
            item.goal ? `目标：${item.goal}` : "",
            item.coreEvents ? `核心事件：${item.coreEvents}` : "",
            item.characterChanges ? `人物变化：${item.characterChanges}` : "",
            item.foreshadow ? `埋设伏笔：${item.foreshadow}` : "",
          ]
            .filter(Boolean)
            .join("\n")
        : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function chapterRange(item: {
  chapterNumber?: Scalar;
  startChapter?: Scalar;
  endChapter?: Scalar;
}) {
  const chapterNumber = numberValue(item.chapterNumber);
  const startChapter = numberValue(item.startChapter);
  const endChapter = numberValue(item.endChapter);

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
    return `至第 ${endChapter} 章`;
  }

  return "";
}

function parseJsonLikeObject(output?: string | null): unknown {
  const text = output?.trim();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);

    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1].trim());
      } catch {
        return null;
      }
    }

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }

    return null;
  }
}

function uniqueTextList(value: unknown) {
  const rawItems = Array.isArray(value) ? value : value ? [value] : [];

  return Array.from(
    new Set(
      rawItems
        .flatMap((item) =>
          isRecord(item)
            ? [
                item.id,
                item.characterId,
                item.foreshadowId,
                item.chapterId,
                item.outlineId,
              ]
            : [item],
        )
        .map((item) => stringifyDraftValue(item))
        .filter(Boolean),
    ),
  ).slice(0, 20);
}

function stringifyDraftValue(value: unknown) {
  if (value == null) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    const parsed = numberValue(value as Scalar);

    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function stringValue(value: Scalar) {
  if (value == null) {
    return "";
  }

  return value instanceof Date ? value.toISOString() : String(value).trim();
}

function numberValue(value: Scalar) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function clipText(value: string, maxLength: number) {
  const normalized = value.trim().replace(/\r\n/g, "\n");

  return normalized.length > maxLength
    ? normalized.slice(0, maxLength).trimEnd()
    : normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

import { projectSettingFields } from "../project-setting-fields";
import {
  outlineLevelLabel,
  outlineRangeLabel,
  type OutlineLevel,
  type OutlineLike,
} from "../outline-fields";

export type OutlineGenerationProjectContext = {
  title: string;
  genre?: string | null;
  targetAudience?: string | null;
  platform?: string | null;
  totalWordTarget?: number | null;
  chapterWordMin?: number | null;
  chapterWordMax?: number | null;
  description?: string | null;
  wechatPositioning?: string | null;
};

export type OutlineGenerationSettingContext = Partial<
  Record<(typeof projectSettingFields)[number]["name"], string | null>
>;

export type OutlineGenerationCharacterContext = {
  name: string;
  roleInStory?: string | null;
  identity?: string | null;
  characterArc?: string | null;
  behaviorRules?: string | null;
};

export type OutlineGenerationChapterContext = {
  chapterNumber: number;
  title: string;
  goal?: string | null;
  beats?: string | null;
  finalText?: string | null;
  notes?: string | null;
};

export type OutlineGenerationRequest = {
  targetLevel: OutlineLevel;
  chapterCount?: number | null;
};

export type OutlineGenerationContextInput = {
  project: OutlineGenerationProjectContext;
  setting?: OutlineGenerationSettingContext | null;
  outlines: readonly OutlineLike[];
  characters: readonly OutlineGenerationCharacterContext[];
  recentChapters: readonly OutlineGenerationChapterContext[];
  request: OutlineGenerationRequest;
};

export type BuiltOutlineGenerationContext = {
  inputText: string;
  inputJson: Record<string, unknown>;
  inputContextSummary: string;
};

const FIELD_MAX_LENGTH = 1200;

const settingFieldLabels = new Map(
  projectSettingFields.map((field) => [field.name, field.label]),
);

export function buildOutlineGenerationContext(
  input: OutlineGenerationContextInput,
): BuiltOutlineGenerationContext {
  const settingItems = buildSettingItems(input.setting);
  const outlineItems = input.outlines.map(buildOutlineLine);
  const characterItems = input.characters.map(buildCharacterLine);
  const chapterItems = input.recentChapters.map(buildRecentChapterLine);
  const targetLabel = outlineLevelLabel(input.request.targetLevel);
  const chapterCount =
    input.request.targetLevel === "chapter"
      ? (input.request.chapterCount ?? 10)
      : input.request.chapterCount;

  const inputJson = {
    project: {
      title: input.project.title,
      genre: clean(input.project.genre),
      targetAudience: clean(input.project.targetAudience),
      platform: clean(input.project.platform),
      totalWordTarget: input.project.totalWordTarget ?? null,
      chapterWordMin: input.project.chapterWordMin ?? null,
      chapterWordMax: input.project.chapterWordMax ?? null,
      description: clipText(input.project.description),
      wechatPositioning: clipText(input.project.wechatPositioning),
    },
    request: {
      targetLevel: input.request.targetLevel,
      chapterCount,
    },
    setting: Object.fromEntries(settingItems),
    existingOutlines: outlineItems,
    characters: characterItems,
    recentChapters: chapterItems,
  };

  const inputText = [
    "# 任务",
    `为《${input.project.title}》生成${targetLabel}草案。`,
    "输出只作为作者审核和手动整理的大纲建议，不得宣称已经写入正式大纲或正式故事记忆。",
    chapterCount ? `本次优先生成 ${chapterCount} 个章节级条目。` : "",
    "",
    "# 项目基础信息",
    lines([
      ["项目", input.project.title],
      ["题材", input.project.genre],
      ["目标读者", input.project.targetAudience],
      ["连载平台", input.project.platform],
      ["总字数目标", input.project.totalWordTarget],
      ["单章字数下限", input.project.chapterWordMin],
      ["单章字数上限", input.project.chapterWordMax],
      ["简介", input.project.description],
      ["公众号定位", input.project.wechatPositioning],
    ]),
    "",
    "# 项目设定摘要",
    settingItems.length > 0
      ? settingItems
          .map(([name, value]) => `- ${settingFieldLabels.get(name) ?? name}: ${value}`)
          .join("\n")
      : "未填写项目设定。",
    "",
    "# 已有大纲",
    outlineItems.length > 0 ? outlineItems.join("\n") : "暂无已有大纲。",
    "",
    "# 主要角色",
    characterItems.length > 0 ? characterItems.join("\n") : "暂无角色资料。",
    "",
    "# 已有章节",
    chapterItems.length > 0
      ? chapterItems.join("\n")
      : "暂无已完成章节，可从开篇规划开始。",
    "",
    "# 输出要求",
    "- 使用 Markdown 输出。",
    "- 保持三层结构清晰：卷大纲、剧情单元大纲、章节大纲。",
    "- 不要直接修改正式设定、角色、世界规则、时间线或伏笔。",
    "- 给出可复制到大纲表单的字段：标题、目标、章节范围、核心事件、冲突、爽点、伏笔和章末钩子。",
  ]
    .filter((item) => item !== "")
    .join("\n");

  return {
    inputText,
    inputJson,
    inputContextSummary: buildOutlineGenerationContextSummary(input),
  };
}

export function buildOutlineGenerationContextSummary(
  input: OutlineGenerationContextInput,
) {
  const targetLabel = outlineLevelLabel(input.request.targetLevel);
  const count =
    input.request.targetLevel === "chapter"
      ? `；目标 ${input.request.chapterCount ?? 10} 个章节条目`
      : "";

  return [
    `《${input.project.title}》${targetLabel}生成`,
    `已有大纲 ${input.outlines.length} 条`,
    `角色 ${input.characters.length} 个`,
    `已有章节 ${input.recentChapters.length} 个${count}`,
  ].join("；");
}

function buildSettingItems(setting?: OutlineGenerationSettingContext | null) {
  if (!setting) {
    return [];
  }

  return projectSettingFields
    .map((field) => [field.name, clipText(setting[field.name])] as const)
    .filter(([, value]) => Boolean(value));
}

function buildOutlineLine(outline: OutlineLike) {
  return `- ${outlineLevelLabel(outline.level)} ${outlineRangeLabel(outline)}《${clean(
    outline.title,
  ) || "未命名"}》：${compact([
    outline.goal ? `目标：${clipText(outline.goal, 500)}` : "",
    outline.mainConflict ? `冲突：${clipText(outline.mainConflict, 400)}` : "",
    outline.coreEvents ? `事件：${clipText(outline.coreEvents, 500)}` : "",
    outline.endingHook ? `钩子：${clipText(outline.endingHook, 300)}` : "",
  ]).join("；") || "暂无摘要"}`;
}

function buildCharacterLine(character: OutlineGenerationCharacterContext) {
  return `- ${character.name}：${compact([
    character.roleInStory,
    character.identity,
    character.characterArc ? `人物弧线：${character.characterArc}` : "",
    character.behaviorRules ? `行为规则：${character.behaviorRules}` : "",
  ])
    .map((value) => clipText(value, 400))
    .join("；") || "暂无补充"}`;
}

function buildRecentChapterLine(chapter: OutlineGenerationChapterContext) {
  return `- 第 ${chapter.chapterNumber} 章《${chapter.title}》：${compact([
    chapter.goal ? `目标：${clipText(chapter.goal, 300)}` : "",
    chapter.beats ? `节拍：${clipText(chapter.beats, 500)}` : "",
    chapter.notes ? `备注：${clipText(chapter.notes, 300)}` : "",
  ]).join("；") || "暂无摘要"}`;
}

function lines(items: readonly (readonly [string, string | number | null | undefined])[]) {
  return items
    .map(([label, value]) => `- ${label}: ${clean(String(value ?? "")) || "未填写"}`)
    .join("\n");
}

function compact(values: readonly (string | null | undefined)[]) {
  return values.map(clean).filter(Boolean);
}

function clipText(value?: string | null, maxLength = FIELD_MAX_LENGTH) {
  const cleaned = clean(value);

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength)}...`;
}

function clean(value?: string | null) {
  return value?.trim().replace(/\n{3,}/g, "\n\n") ?? "";
}

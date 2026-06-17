import { clipText } from "./chapter-beats";
import {
  projectSettingFields,
  type ProjectSettingFieldName,
} from "../project-setting-fields";

export type ChapterSummaryProjectContext = {
  title: string;
  genre?: string | null;
  targetAudience?: string | null;
  platform?: string | null;
  description?: string | null;
  wechatPositioning?: string | null;
};

export type ChapterSummarySettingContext = Partial<
  Record<ProjectSettingFieldName, string | null>
>;

export type ChapterSummaryCharacterContext = {
  name: string;
  roleInStory?: string | null;
  identity?: string | null;
  latestAppearance?: string | null;
  behaviorRules?: string | null;
};

export type ChapterSummaryChapterContext = {
  chapterNumber: number;
  title: string;
  goal?: string | null;
  beats?: string | null;
  draftText?: string | null;
  finalText?: string | null;
  notes?: string | null;
};

export type ChapterSummaryContextInput = {
  project: ChapterSummaryProjectContext;
  setting?: ChapterSummarySettingContext | null;
  chapter: ChapterSummaryChapterContext;
  characters: readonly ChapterSummaryCharacterContext[];
};

export type BuiltChapterSummaryContext = {
  inputText: string;
  inputJson: Record<string, unknown>;
  inputContextSummary: string;
};

const finalTextPreviewMaxLength = 1200;

export function buildChapterSummaryContext(
  input: ChapterSummaryContextInput,
): BuiltChapterSummaryContext {
  const sourceText = confirmedChapterText(input.chapter);
  const settingItems = buildSettingItems(input.setting);
  const characterItems = input.characters.map(buildCharacterLine).filter(Boolean);

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
    },
    setting: Object.fromEntries(settingItems),
    characters: characterItems,
    outputRequirements: [
      "只输出 JSON，不要输出 Markdown 说明。",
      "只提取定稿正文中明确出现的信息。",
      "不得根据草稿、设定脑补或未来剧情推测。",
      "不要直接修改正式设定、人物、时间线或伏笔。",
    ],
  };

  const inputText = [
    "# 任务",
    `从第 ${input.chapter.chapterNumber} 章《${input.chapter.title}》定稿正文中提取结构化章节摘要。`,
    "输出只作为作者审阅的 AI 任务结果，不得视为已写入正式故事记忆。",
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
    "# 当前项目设定摘要",
    settingItems.length > 0
      ? settingItems
          .map(([name, value]) => `- ${settingLabel(name)}: ${value}`)
          .join("\n")
      : "未填写项目设定。",
    "",
    "# 角色名表",
    characterItems.length > 0 ? characterItems.join("\n") : "暂无角色资料。",
    "",
    "# 当前章节元信息",
    lines([
      ["章节目标", input.chapter.goal],
      ["章节节拍", input.chapter.beats],
      ["作者备注", input.chapter.notes],
    ]),
    "",
    "# 定稿正文",
    sourceText || "未填写定稿正文。禁止基于草稿正文生成章节摘要。",
    "",
    "# 输出 JSON 字段",
    "- shortSummary: 1-3 句短摘要。",
    "- mainEvents: 本章明确发生的主要事件数组。",
    "- characterChanges: 角色状态、关系、认知或处境变化数组。",
    "- newForeshadows: 新埋下或明显推进的伏笔数组。",
    "- newSettings: 新出现的设定、规则或事实数组。",
    "- timelineEvents: 可进入时间线的事件数组。",
    "- continuityRisks: 可能影响后续连续性的风险数组。",
  ].join("\n");

  return {
    inputText,
    inputJson,
    inputContextSummary: buildChapterSummaryContextSummary(input),
  };
}

export function buildChapterSummaryContextSummary(
  input: ChapterSummaryContextInput,
) {
  const sourceText = confirmedChapterText(input.chapter);

  return [
    `第 ${input.chapter.chapterNumber} 章《${input.chapter.title}》章节摘要提取`,
    sourceText ? `定稿 ${sourceText.length} 字` : "缺少定稿正文",
    `角色 ${input.characters.length} 个`,
    input.setting ? "包含项目设定" : "无项目设定",
  ].join("；");
}

export function hasConfirmedChapterText(chapter: ChapterSummaryChapterContext) {
  return Boolean(confirmedChapterText(chapter));
}

export function confirmedChapterText(chapter: ChapterSummaryChapterContext) {
  return clean(chapter.finalText);
}

function buildSettingItems(setting?: ChapterSummarySettingContext | null) {
  if (!setting) {
    return [];
  }

  return projectSettingFields
    .map((field) => [field.name, clipText(setting[field.name])] as const)
    .filter(([, value]) => Boolean(value));
}

function buildCharacterLine(character: ChapterSummaryCharacterContext) {
  const details = [
    character.roleInStory,
    character.identity,
    character.latestAppearance ? `最近出场：${character.latestAppearance}` : "",
    character.behaviorRules ? `行为规则：${character.behaviorRules}` : "",
  ]
    .map(clean)
    .filter(Boolean)
    .map((value) => clipText(value, 400))
    .join("；");

  return `- ${character.name}${details ? `：${details}` : ""}`;
}

function lines(items: readonly (readonly [string, string | number | null | undefined])[]) {
  return items
    .map(([label, value]) => `- ${label}: ${clean(String(value ?? "")) || "未填写"}`)
    .join("\n");
}

function settingLabel(name: ProjectSettingFieldName) {
  return projectSettingFields.find((field) => field.name === name)?.label ?? name;
}

function clean(value?: string | null) {
  return value?.trim().replace(/\n{3,}/g, "\n\n") ?? "";
}

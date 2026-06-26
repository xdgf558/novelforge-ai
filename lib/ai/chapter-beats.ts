import { formatWordRange } from "../format";
import { outlineLevelLabel, outlineRangeLabel, type OutlineLike } from "../outline-fields";
import { projectSettingFields } from "../project-setting-fields";
import {
  formatReaderFeedbackSignals,
  readerFeedbackSignalsToJson,
  type ReaderFeedbackSignal,
} from "./reader-feedback-context";

export type ChapterBeatProjectContext = {
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

export type ChapterBeatSettingContext = Partial<
  Record<(typeof projectSettingFields)[number]["name"], string | null>
>;

export type ChapterBeatCharacterContext = {
  name: string;
  roleInStory?: string | null;
  identity?: string | null;
  speakingStyle?: string | null;
  desire?: string | null;
  fear?: string | null;
  secret?: string | null;
  relationToProtagonist?: string | null;
  relationToAntagonist?: string | null;
  abilityBoundary?: string | null;
  behaviorRules?: string | null;
  characterArc?: string | null;
  latestAppearance?: string | null;
  notes?: string | null;
};

export type ChapterBeatChapterContext = {
  chapterNumber: number;
  title: string;
  goal?: string | null;
  beats?: string | null;
  draftText?: string | null;
  polishedText?: string | null;
  finalText?: string | null;
  notes?: string | null;
};

export type ChapterBeatContextInput = {
  project: ChapterBeatProjectContext;
  setting?: ChapterBeatSettingContext | null;
  chapter: ChapterBeatChapterContext;
  outlines?: readonly OutlineLike[];
  characters: readonly ChapterBeatCharacterContext[];
  recentChapters: readonly ChapterBeatChapterContext[];
  previousChapter?: ChapterBeatChapterContext | null;
  readerFeedback?: readonly ReaderFeedbackSignal[];
};

export type BuiltChapterBeatContext = {
  inputText: string;
  inputJson: Record<string, unknown>;
  inputContextSummary: string;
};

const PREVIOUS_ENDING_MAX_LENGTH = 1200;
const FIELD_MAX_LENGTH = 1200;

const settingFieldLabels = new Map(
  projectSettingFields.map((field) => [field.name, field.label]),
);

export function buildChapterBeatContext(
  input: ChapterBeatContextInput,
): BuiltChapterBeatContext {
  const previousChapterEnding = input.previousChapter
    ? excerptChapterEnding(input.previousChapter)
    : "";
  const settingItems = buildSettingItems(input.setting);
  const outlineItems = (input.outlines ?? []).map(buildOutlineLine);
  const characterItems = input.characters
    .map((character) => buildCharacterLine(character))
    .filter(Boolean);
  const recentChapterItems = input.recentChapters.map(buildRecentChapterLine);
  const readerFeedback = input.readerFeedback ?? [];
  const readerFeedbackText = formatReaderFeedbackSignals(readerFeedback);
  const forbiddenItems = compact([
    input.setting?.forbiddenItems,
    input.setting?.sensitiveContentRules,
  ]).join("\n");
  const wordRange = formatWordRange(
    input.project.chapterWordMin,
    input.project.chapterWordMax,
  );

  const inputJson = {
    project: normalizeProject(input.project),
    setting: Object.fromEntries(settingItems),
    chapter: {
      chapterNumber: input.chapter.chapterNumber,
      title: input.chapter.title,
      goal: clean(input.chapter.goal),
      notes: clean(input.chapter.notes),
      existingBeats: clean(input.chapter.beats),
    },
    outlines: outlineItems,
    characters: characterItems,
    recentChapters: recentChapterItems,
    readerFeedback: readerFeedbackSignalsToJson(readerFeedback),
    previousChapterEnding,
    forbiddenItems,
    outputRequirements: [
      "使用 Markdown 输出。",
      "按顺序给出 8-12 个章节节拍。",
      "包含开场钩子、关键事件、情绪转折、章末钩子。",
      "读者反馈只作为节奏、钩子、角色权重和爽点补强参考，不得改写已确认事实。",
      "不要宣称已经修改正式设定或角色记忆。",
    ],
  };

  const inputText = [
    "# 任务",
    `为第 ${input.chapter.chapterNumber} 章《${input.chapter.title}》生成章节节拍。`,
    "输出只作为作者审核草案，不得视为已写入正式故事记忆。",
    "",
    "# 当前章节",
    lines([
      ["章节目标", input.chapter.goal],
      ["作者备注", input.chapter.notes],
      ["已有节拍", input.chapter.beats],
    ]),
    "",
    "# 项目基础信息",
    lines([
      ["项目", input.project.title],
      ["题材", input.project.genre],
      ["目标读者", input.project.targetAudience],
      ["平台", input.project.platform],
      ["单章字数", wordRange],
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
    "# 当前大纲",
    outlineItems.length > 0
      ? outlineItems.join("\n")
      : "暂无匹配当前章节的卷、剧情单元或章节大纲。",
    "",
    "# 相关角色",
    characterItems.length > 0 ? characterItems.join("\n") : "暂无角色资料。",
    "",
    "# 最近章节",
    recentChapterItems.length > 0
      ? recentChapterItems.join("\n")
      : "暂无已保存的前序章节。",
    "",
    "# 读者反馈信号",
    readerFeedbackText,
    "",
    "# 上一章结尾",
    previousChapterEnding || "暂无上一章正文结尾。",
    "",
    "# 禁写事项",
    forbiddenItems || "未设置。",
    "",
    "# 输出要求",
    "- 使用 Markdown。",
    "- 给出 8-12 个顺序节拍，每个节拍包含剧情动作和情绪作用。",
    "- 明确标出开场钩子、关键转折、章末钩子。",
    "- 如有读者反馈，优先用它调整下一章开场推进、章末钩子、角色出场权重和信息解释密度；不得把读者反馈当作已经生效的正式设定。",
    "- 保持既有设定与角色边界，不新增未经作者确认的正式设定。",
  ].join("\n");

  return {
    inputText,
    inputJson,
    inputContextSummary: buildChapterBeatContextSummary(input),
  };
}

export function buildChapterBeatContextSummary(input: ChapterBeatContextInput) {
  return [
    `第 ${input.chapter.chapterNumber} 章《${input.chapter.title}》章节节拍生成`,
    `大纲 ${(input.outlines ?? []).length} 条`,
    `角色 ${input.characters.length} 个`,
    `最近章节 ${input.recentChapters.length} 个`,
    input.readerFeedback?.length ? `读者反馈 ${input.readerFeedback.length} 条` : "无读者反馈",
    input.previousChapter ? "包含上一章结尾" : "无上一章结尾",
  ].join("；");
}

export function excerptChapterEnding(chapter: ChapterBeatChapterContext) {
  const source =
    clean(chapter.finalText) ||
    clean(chapter.polishedText) ||
    clean(chapter.draftText);

  if (!source) {
    return "";
  }

  return clipText(source, PREVIOUS_ENDING_MAX_LENGTH, "end");
}

export function clipText(
  value?: string | null,
  maxLength = FIELD_MAX_LENGTH,
  direction: "start" | "end" = "start",
) {
  const cleaned = clean(value);

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  if (direction === "end") {
    return `...${cleaned.slice(-maxLength)}`;
  }

  return `${cleaned.slice(0, maxLength)}...`;
}

function normalizeProject(project: ChapterBeatProjectContext) {
  return {
    title: project.title,
    genre: clean(project.genre),
    targetAudience: clean(project.targetAudience),
    platform: clean(project.platform),
    totalWordTarget: project.totalWordTarget ?? null,
    chapterWordRange: formatWordRange(project.chapterWordMin, project.chapterWordMax),
    description: clipText(project.description),
    wechatPositioning: clipText(project.wechatPositioning),
  };
}

function buildSettingItems(setting?: ChapterBeatSettingContext | null) {
  if (!setting) {
    return [];
  }

  return projectSettingFields
    .map((field) => [field.name, clipText(setting[field.name])] as const)
    .filter(([, value]) => Boolean(value));
}

function buildCharacterLine(character: ChapterBeatCharacterContext) {
  const details = compact([
    character.roleInStory,
    character.identity,
    character.desire ? `欲望：${character.desire}` : "",
    character.fear ? `恐惧：${character.fear}` : "",
    character.relationToProtagonist
      ? `与主角：${character.relationToProtagonist}`
      : "",
    character.relationToAntagonist
      ? `与反派：${character.relationToAntagonist}`
      : "",
    character.abilityBoundary ? `能力边界：${character.abilityBoundary}` : "",
    character.behaviorRules ? `行为规则：${character.behaviorRules}` : "",
    character.speakingStyle ? `说话风格：${character.speakingStyle}` : "",
    character.characterArc ? `人物弧线：${character.characterArc}` : "",
    character.latestAppearance ? `最近出场：${character.latestAppearance}` : "",
    character.notes ? `备注：${character.notes}` : "",
  ])
    .map((value) => clipText(value, 400))
    .join("；");

  return `- ${character.name}${details ? `：${details}` : ""}`;
}

function buildOutlineLine(outline: OutlineLike) {
  return `- ${outlineLevelLabel(outline.level)} ${outlineRangeLabel(outline)}《${clean(
    outline.title,
  ) || "未命名"}》：${compact([
    outline.goal ? `目标：${clipText(outline.goal, 500)}` : "",
    outline.mainConflict ? `冲突：${clipText(outline.mainConflict, 400)}` : "",
    outline.coreEvents ? `事件：${clipText(outline.coreEvents, 500)}` : "",
    outline.chapterConflict ? `章节冲突：${clipText(outline.chapterConflict, 400)}` : "",
    outline.chapterPleasurePoint
      ? `章节爽点：${clipText(outline.chapterPleasurePoint, 400)}`
      : "",
    outline.endingHook ? `钩子：${clipText(outline.endingHook, 300)}` : "",
  ]).join("；") || "暂无摘要"}`;
}

function buildRecentChapterLine(chapter: ChapterBeatChapterContext) {
  return `- 第 ${chapter.chapterNumber} 章《${chapter.title}》：${compact([
    chapter.goal ? `目标：${chapter.goal}` : "",
    chapter.beats ? `节拍：${clipText(chapter.beats, 600)}` : "",
    chapter.notes ? `备注：${clipText(chapter.notes, 400)}` : "",
  ]).join("；") || "暂无摘要信息"}`;
}

function lines(items: readonly (readonly [string, string | number | null | undefined])[]) {
  return items
    .map(([label, value]) => `- ${label}: ${clean(String(value ?? "")) || "未填写"}`)
    .join("\n");
}

function compact(values: readonly (string | null | undefined)[]) {
  return values.map(clean).filter(Boolean);
}

function clean(value?: string | null) {
  return value?.trim().replace(/\n{3,}/g, "\n\n") ?? "";
}

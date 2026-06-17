import { clipText, excerptChapterEnding } from "./chapter-beats";
import { formatWordRange } from "../format";

export type ChapterDraftProjectContext = {
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

export type ChapterDraftSettingContext = {
  sellingPoint?: string | null;
  mainConflict?: string | null;
  worldviewRules?: string | null;
  protagonistDesire?: string | null;
  protagonistFlaw?: string | null;
  villainLogic?: string | null;
  supportingCharacters?: string | null;
  factions?: string | null;
  timeline?: string | null;
  pleasureMechanism?: string | null;
  styleSample?: string | null;
  emotionalTone?: string | null;
  readerExpectation?: string | null;
  commercialHook?: string | null;
  forbiddenItems?: string | null;
  sensitiveContentRules?: string | null;
};

export type ChapterDraftCharacterContext = {
  name: string;
  roleInStory?: string | null;
  identity?: string | null;
  speakingStyle?: string | null;
  desire?: string | null;
  fear?: string | null;
  relationToProtagonist?: string | null;
  abilityBoundary?: string | null;
  behaviorRules?: string | null;
  latestAppearance?: string | null;
};

export type ChapterDraftChapterContext = {
  chapterNumber: number;
  title: string;
  goal?: string | null;
  beats?: string | null;
  draftText?: string | null;
  finalText?: string | null;
  notes?: string | null;
};

export type ChapterDraftContextInput = {
  project: ChapterDraftProjectContext;
  setting?: ChapterDraftSettingContext | null;
  chapter: ChapterDraftChapterContext;
  characters: readonly ChapterDraftCharacterContext[];
  previousChapter?: ChapterDraftChapterContext | null;
};

export type BuiltChapterDraftContext = {
  inputText: string;
  inputJson: Record<string, unknown>;
  inputContextSummary: string;
};

export function buildChapterDraftContext(
  input: ChapterDraftContextInput,
): BuiltChapterDraftContext {
  const confirmedBeats = clean(input.chapter.beats);
  const previousChapterEnding = input.previousChapter
    ? excerptChapterEnding(input.previousChapter)
    : "";
  const characterRules = input.characters
    .map(buildCharacterRuleLine)
    .filter(Boolean);
  const styleConstraints = compact([
    input.setting?.styleSample ? `文风样例：${clipText(input.setting.styleSample)}` : "",
    input.setting?.emotionalTone ? `情绪基调：${input.setting.emotionalTone}` : "",
    input.setting?.readerExpectation
      ? `读者期待：${input.setting.readerExpectation}`
      : "",
    input.setting?.commercialHook ? `商业钩子：${input.setting.commercialHook}` : "",
    input.project.wechatPositioning
      ? `公众号定位：${input.project.wechatPositioning}`
      : "",
  ]);
  const worldConstraints = compact([
    input.setting?.sellingPoint ? `卖点：${input.setting.sellingPoint}` : "",
    input.setting?.mainConflict ? `主线矛盾：${input.setting.mainConflict}` : "",
    input.setting?.worldviewRules
      ? `世界观规则：${input.setting.worldviewRules}`
      : "",
    input.setting?.protagonistDesire
      ? `主角欲望：${input.setting.protagonistDesire}`
      : "",
    input.setting?.protagonistFlaw
      ? `主角缺陷：${input.setting.protagonistFlaw}`
      : "",
    input.setting?.villainLogic ? `反派逻辑：${input.setting.villainLogic}` : "",
    input.setting?.pleasureMechanism
      ? `爽点机制：${input.setting.pleasureMechanism}`
      : "",
  ]).map((value) => clipText(value));
  const forbiddenItems = compact([
    input.setting?.forbiddenItems,
    input.setting?.sensitiveContentRules,
  ]).join("\n");
  const wordRange = formatWordRange(
    input.project.chapterWordMin,
    input.project.chapterWordMax,
  );

  const inputJson = {
    project: {
      title: input.project.title,
      genre: clean(input.project.genre),
      targetAudience: clean(input.project.targetAudience),
      platform: clean(input.project.platform),
      chapterWordRange: wordRange,
      description: clipText(input.project.description),
    },
    chapter: {
      chapterNumber: input.chapter.chapterNumber,
      title: input.chapter.title,
      goal: clean(input.chapter.goal),
      confirmedBeats,
      notes: clean(input.chapter.notes),
    },
    styleConstraints,
    characterRules,
    worldConstraints,
    previousChapterEnding,
    forbiddenItems,
    outputRequirements: [
      "输出完整章节草稿正文。",
      "严格遵循已确认章节节拍。",
      "保持角色说话规则和世界观边界。",
      "不得宣称已经修改正式设定或正式章节。",
    ],
  };

  const inputText = [
    "# 任务",
    `根据已确认节拍，为第 ${input.chapter.chapterNumber} 章《${input.chapter.title}》生成章节草稿正文。`,
    "输出只作为作者审核草稿，不得视为已写入正式章节。",
    "",
    "# 当前章节",
    lines([
      ["章节目标", input.chapter.goal],
      ["目标字数", wordRange],
      ["作者备注", input.chapter.notes],
    ]),
    "",
    "# 已确认章节节拍",
    confirmedBeats || "未填写已确认节拍。禁止在没有节拍时自由生成正文。",
    "",
    "# 文风与发布约束",
    styleConstraints.length > 0 ? styleConstraints.join("\n") : "未设置。",
    "",
    "# 角色说话与行为规则",
    characterRules.length > 0 ? characterRules.join("\n") : "暂无角色资料。",
    "",
    "# 世界观与剧情约束",
    worldConstraints.length > 0 ? worldConstraints.join("\n") : "未设置。",
    "",
    "# 上一章结尾",
    previousChapterEnding || "暂无上一章正文结尾。",
    "",
    "# 禁写事项",
    forbiddenItems || "未设置。",
    "",
    "# 输出要求",
    "- 直接输出章节草稿正文，不要输出分析过程。",
    "- 按已确认节拍推进，不要新增未经作者确认的核心设定。",
    "- 保持人物语气、行动边界、世界观规则和禁写事项。",
    "- 使用适合连载阅读的开场推进、段落节奏和章末钩子。",
  ].join("\n");

  return {
    inputText,
    inputJson,
    inputContextSummary: buildChapterDraftContextSummary(input),
  };
}

export function buildChapterDraftContextSummary(
  input: ChapterDraftContextInput,
) {
  return [
    `第 ${input.chapter.chapterNumber} 章《${input.chapter.title}》章节草稿生成`,
    clean(input.chapter.beats) ? "包含已确认节拍" : "缺少已确认节拍",
    `角色 ${input.characters.length} 个`,
    input.previousChapter ? "包含上一章结尾" : "无上一章结尾",
  ].join("；");
}

export function hasConfirmedChapterBeats(chapter: ChapterDraftChapterContext) {
  return Boolean(clean(chapter.beats));
}

function buildCharacterRuleLine(character: ChapterDraftCharacterContext) {
  const details = compact([
    character.roleInStory,
    character.identity,
    character.speakingStyle ? `说话风格：${character.speakingStyle}` : "",
    character.behaviorRules ? `行为规则：${character.behaviorRules}` : "",
    character.desire ? `欲望：${character.desire}` : "",
    character.fear ? `恐惧：${character.fear}` : "",
    character.relationToProtagonist
      ? `与主角：${character.relationToProtagonist}`
      : "",
    character.abilityBoundary ? `能力边界：${character.abilityBoundary}` : "",
    character.latestAppearance ? `最近出场：${character.latestAppearance}` : "",
  ])
    .map((value) => clipText(value, 400))
    .join("；");

  return `- ${character.name}${details ? `：${details}` : ""}`;
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

import { clipText, excerptChapterEnding } from "./chapter-beats";
import { formatWordRange } from "../format";
import { outlineLevelLabel, outlineRangeLabel, type OutlineLike } from "../outline-fields";
import type { ProjectSettingFieldName } from "../project-setting-fields";
import {
  formatReaderFeedbackSignals,
  readerFeedbackSignalsToJson,
  type ReaderFeedbackSignal,
} from "./reader-feedback-context";
import { proseStyleGuardrails } from "./prose-style-guardrails";
import {
  buildChapterPlatformTemplateContext,
  type ChapterPlatformTemplate,
} from "./chapter-platform-templates";

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

export type ChapterDraftSettingContext = Partial<
  Record<ProjectSettingFieldName, string | null>
>;

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
  polishedText?: string | null;
  finalText?: string | null;
  notes?: string | null;
};

export type ChapterDraftContextInput = {
  project: ChapterDraftProjectContext;
  setting?: ChapterDraftSettingContext | null;
  chapter: ChapterDraftChapterContext;
  outlines?: readonly OutlineLike[];
  characters: readonly ChapterDraftCharacterContext[];
  previousChapter?: ChapterDraftChapterContext | null;
  readerFeedback?: readonly ReaderFeedbackSignal[];
};

export type BuiltChapterDraftContext = {
  inputText: string;
  inputJson: Record<string, unknown>;
  inputContextSummary: string;
};

export type BuildChapterDraftContextOptions = {
  platformTemplate?: ChapterPlatformTemplate;
};

type DraftSettingField = readonly [ProjectSettingFieldName, string];

const draftStyleSettingFields = [
  ["styleSample", "文风样例"],
  ["emotionalTone", "情绪基调"],
  ["readerExpectation", "读者期待"],
  ["commercialHook", "商业钩子"],
] as const satisfies readonly DraftSettingField[];

const draftWorldSettingFields = [
  ["sellingPoint", "卖点"],
  ["mainConflict", "主线矛盾"],
  ["worldviewRules", "世界观规则"],
  ["protagonistDesire", "主角欲望"],
  ["protagonistFlaw", "主角缺陷"],
  ["villainLogic", "反派逻辑"],
  ["pleasureMechanism", "爽点机制"],
] as const satisfies readonly DraftSettingField[];

const draftForbiddenSettingFields = [
  "forbiddenItems",
  "sensitiveContentRules",
] as const satisfies readonly ProjectSettingFieldName[];

export function buildChapterDraftContext(
  input: ChapterDraftContextInput,
  options: BuildChapterDraftContextOptions = {},
): BuiltChapterDraftContext {
  const confirmedBeats = clean(input.chapter.beats);
  const platformTemplate = buildChapterPlatformTemplateContext({
    task: "draft",
    template: options.platformTemplate,
  });
  const outlineItems = (input.outlines ?? []).map(buildOutlineLine);
  const previousChapterEnding = input.previousChapter
    ? excerptChapterEnding(input.previousChapter)
    : "";
  const readerFeedback = input.readerFeedback ?? [];
  const readerFeedbackText = formatReaderFeedbackSignals(readerFeedback);
  const characterRules = input.characters
    .map(buildCharacterRuleLine)
    .filter(Boolean);
  const styleConstraints = [
    ...buildLabeledSettingLines(input.setting, draftStyleSettingFields),
    input.project.wechatPositioning
      ? `公众号定位：${input.project.wechatPositioning}`
      : "",
    ...proseStyleGuardrails,
  ].filter(Boolean);
  const worldConstraints = buildLabeledSettingLines(
    input.setting,
    draftWorldSettingFields,
  );
  const forbiddenItems = buildSettingValues(
    input.setting,
    draftForbiddenSettingFields,
  ).join("\n");
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
    outlines: outlineItems,
    styleConstraints,
    characterRules,
    worldConstraints,
    readerFeedback: readerFeedbackSignalsToJson(readerFeedback),
    platformTemplate: {
      value: platformTemplate.template,
      label: platformTemplate.label,
      instructions: platformTemplate.instructions,
    },
    previousChapterEnding,
    forbiddenItems,
    outputRequirements: [
      "输出完整章节草稿正文。",
      "严格遵循已确认章节节拍。",
      "读者反馈只作为段落节奏、钩子强度、角色出场权重和信息解释密度参考。",
      "保持角色说话规则和世界观边界。",
      "硬性压低模板腔：全章“不是……而是……”/“不是……是……”二元对照表达最多保留 1 处，输出前必须自检并改写多余句式。",
      "硬性避免逐日流水账：不要把正文写成第一天、第二天、第三天或早中晚日程；跳过没有新信息的过渡日。",
      "每个场景都要推进至少一种有效信息：冲突、线索、选择、代价、人物关系、风险升级或伏笔回收。",
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
    "# 当前大纲",
    outlineItems.length > 0
      ? outlineItems.join("\n")
      : "暂无匹配当前章节的卷、剧情单元或章节大纲。",
    "",
    "# 文风与发布约束",
    styleConstraints.length > 0 ? styleConstraints.join("\n") : "未设置。",
    "",
    ...(platformTemplate.instructions.length > 0
      ? [
          "# 目标平台模板",
          `平台模板：${platformTemplate.label}`,
          platformTemplate.instructions.join("\n"),
          "",
        ]
      : []),
    "# 角色说话与行为规则",
    characterRules.length > 0 ? characterRules.join("\n") : "暂无角色资料。",
    "",
    "# 世界观与剧情约束",
    worldConstraints.length > 0 ? worldConstraints.join("\n") : "未设置。",
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
    "- 直接输出章节草稿正文，不要输出分析过程。",
    "- 按已确认节拍推进，不要新增未经作者确认的核心设定。",
    "- 如有读者反馈，落实为更清晰的开场推进、段落节奏、追更钩子和读者关注角色的戏份分配；不要直接在正文中提到数据、指标或读者反馈。",
    "- 保持人物语气、行动边界、世界观规则和禁写事项。",
    "- 使用适合连载阅读的开场推进、段落节奏和章末钩子。",
    "- 反模板腔硬性自检：全章“不是……而是……”“不是因为……而是因为……”“真正的……不是……而是……”和“不是……是……”这类二元对照表达最多保留 1 处；如果草稿中出现多处，必须先改成动作、细节、人物反应、台词或因果推进，再输出正文。",
    "- 反流水账硬性自检：不要按“第一天/第二天/第三天”或“早上/中午/晚上”逐日打卡推进；只有倒计时、证据矛盾、人物错位或压力升级依赖具体时间时才写清日期。",
    "- 跳过无冲突过渡日：吃饭、赶路、等待、常规训练、日常整理等没有新线索、新阻碍、新选择、新代价、关系变化、风险升级或伏笔回收的内容，要压缩为一句转场或直接切到下一场有效冲突。",
  ].join("\n");

  return {
    inputText,
    inputJson,
    inputContextSummary: buildChapterDraftContextSummary(input, options),
  };
}

export function buildChapterDraftContextSummary(
  input: ChapterDraftContextInput,
  options: BuildChapterDraftContextOptions = {},
) {
  const platformTemplate = buildChapterPlatformTemplateContext({
    task: "draft",
    template: options.platformTemplate,
  });

  return [
    `第 ${input.chapter.chapterNumber} 章《${input.chapter.title}》章节草稿生成`,
    clean(input.chapter.beats) ? "包含已确认节拍" : "缺少已确认节拍",
    `大纲 ${(input.outlines ?? []).length} 条`,
    `角色 ${input.characters.length} 个`,
    input.readerFeedback?.length ? `读者反馈 ${input.readerFeedback.length} 条` : "无读者反馈",
    input.previousChapter ? "包含上一章结尾" : "无上一章结尾",
    platformTemplate.template === "fanqie"
      ? `平台模板：${platformTemplate.label}`
      : "",
  ]
    .filter(Boolean)
    .join("；");
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
    outline.foreshadow ? `伏笔：${clipText(outline.foreshadow, 300)}` : "",
    outline.endingHook ? `钩子：${clipText(outline.endingHook, 300)}` : "",
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

function buildLabeledSettingLines(
  setting: ChapterDraftSettingContext | null | undefined,
  fields: readonly DraftSettingField[],
) {
  if (!setting) {
    return [];
  }

  return fields
    .map(([name, label]) => {
      const value = clipText(setting[name]);
      return value ? `${label}：${value}` : "";
    })
    .filter(Boolean);
}

function buildSettingValues(
  setting: ChapterDraftSettingContext | null | undefined,
  fields: readonly ProjectSettingFieldName[],
) {
  if (!setting) {
    return [];
  }

  return fields.map((name) => clipText(setting[name])).filter(Boolean);
}

function clean(value?: string | null) {
  return value?.trim().replace(/\n{3,}/g, "\n\n") ?? "";
}

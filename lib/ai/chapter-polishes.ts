import { clipText } from "./chapter-beats";
import { formatWordRange } from "../format";
import type { ProjectSettingFieldName } from "../project-setting-fields";

export type ChapterPolishProjectContext = {
  title: string;
  genre?: string | null;
  targetAudience?: string | null;
  platform?: string | null;
  chapterWordMin?: number | null;
  chapterWordMax?: number | null;
  description?: string | null;
  wechatPositioning?: string | null;
};

export type ChapterPolishSettingContext = Partial<
  Record<ProjectSettingFieldName, string | null>
>;

export type ChapterPolishCharacterContext = {
  name: string;
  roleInStory?: string | null;
  identity?: string | null;
  speakingStyle?: string | null;
  behaviorRules?: string | null;
  latestAppearance?: string | null;
};

export type ChapterPolishChapterContext = {
  chapterNumber: number;
  title: string;
  goal?: string | null;
  beats?: string | null;
  draftText?: string | null;
  polishedText?: string | null;
  finalText?: string | null;
  notes?: string | null;
};

export type ChapterPolishContextInput = {
  project: ChapterPolishProjectContext;
  setting?: ChapterPolishSettingContext | null;
  chapter: ChapterPolishChapterContext;
  characters: readonly ChapterPolishCharacterContext[];
};

export type BuiltChapterPolishContext = {
  inputText: string;
  inputJson: Record<string, unknown>;
  inputContextSummary: string;
};

type PolishSettingField = readonly [ProjectSettingFieldName, string];

const polishStyleSettingFields = [
  ["styleSample", "文风样例"],
  ["emotionalTone", "情绪基调"],
  ["readerExpectation", "读者期待"],
  ["commercialHook", "商业钩子"],
] as const satisfies readonly PolishSettingField[];

const polishStorySettingFields = [
  ["sellingPoint", "卖点"],
  ["mainConflict", "主线矛盾"],
  ["worldviewRules", "世界观规则"],
  ["protagonistDesire", "主角欲望"],
  ["protagonistFlaw", "主角缺陷"],
  ["pleasureMechanism", "爽点机制"],
] as const satisfies readonly PolishSettingField[];

const polishForbiddenSettingFields = [
  "forbiddenItems",
  "sensitiveContentRules",
] as const satisfies readonly ProjectSettingFieldName[];

export function buildChapterPolishContext(
  input: ChapterPolishContextInput,
): BuiltChapterPolishContext {
  const sourceText = polishableChapterText(input.chapter);
  const sourceKind = polishableChapterTextSource(input.chapter);
  const styleConstraints = [
    ...buildLabeledSettingLines(input.setting, polishStyleSettingFields),
    input.project.wechatPositioning
      ? `公众号定位：${input.project.wechatPositioning}`
      : "",
  ].filter(Boolean);
  const storyConstraints = buildLabeledSettingLines(
    input.setting,
    polishStorySettingFields,
  );
  const forbiddenItems = buildSettingValues(
    input.setting,
    polishForbiddenSettingFields,
  ).join("\n");
  const characterRules = input.characters
    .map(buildCharacterRuleLine)
    .filter(Boolean);
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
      beats: clipText(input.chapter.beats),
      notes: clean(input.chapter.notes),
      sourceKind,
      sourceTextLength: sourceText.length,
      sourceTextPreview: clipText(sourceText, 1200),
    },
    styleConstraints,
    storyConstraints,
    characterRules,
    forbiddenItems,
    outputRequirements: [
      "输出完整精修正文，不要输出分析过程。",
      "保留原剧情事实、人物关系、关键台词含义和章节结尾钩子。",
      "删除创作过程标题，例如“开场钩子”“节拍1”“情绪作用”等。",
      "只做表达、节奏、段落和连贯性精修，不新增正式设定。",
      "不得宣称已经写入定稿或正式故事记忆。",
    ],
  };

  const inputText = [
    "# 任务",
    `精修第 ${input.chapter.chapterNumber} 章《${input.chapter.title}》正文。`,
    "输出只作为作者审阅的精修稿，不得视为已写入定稿正文。",
    "",
    "# 当前章节",
    lines([
      ["章节目标", input.chapter.goal],
      ["目标字数", wordRange],
      ["作者备注", input.chapter.notes],
      ["正文来源", sourceKind],
    ]),
    "",
    "# 已确认章节节拍",
    clean(input.chapter.beats) || "未填写章节节拍。",
    "",
    "# 文风与读者约束",
    styleConstraints.length > 0 ? styleConstraints.join("\n") : "未设置。",
    "",
    "# 角色说话与行为规则",
    characterRules.length > 0 ? characterRules.join("\n") : "暂无角色资料。",
    "",
    "# 世界观与剧情边界",
    storyConstraints.length > 0 ? storyConstraints.join("\n") : "未设置。",
    "",
    "# 禁写事项",
    forbiddenItems || "未设置。",
    "",
    "# 待精修正文",
    sourceText || "未填写可精修正文。禁止凭空生成。",
    "",
    "# 输出要求",
    "- 直接输出完整精修正文，不要输出解释、提纲、修改清单或 JSON。",
    "- 删除“【开场钩子】”“节拍1”“情绪作用”等写作过程标记，让正文变成读者可直接阅读的章节。",
    "- 不改变主要剧情事实、人物关系、关键伏笔、章节目标和结尾钩子。",
    "- 优化句子节奏、段落衔接、人物台词自然度、场景细节密度和连载阅读爽点。",
    "- 保持作者已有语气，不要把小说改成说明书或创作分析。",
  ].join("\n");

  return {
    inputText,
    inputJson,
    inputContextSummary: buildChapterPolishContextSummary(input),
  };
}

export function buildChapterPolishContextSummary(
  input: ChapterPolishContextInput,
) {
  const sourceText = polishableChapterText(input.chapter);
  const sourceKind = polishableChapterTextSource(input.chapter);

  return [
    `第 ${input.chapter.chapterNumber} 章《${input.chapter.title}》正文精修`,
    sourceText ? `${sourceKind} ${sourceText.length} 字` : "缺少可精修正文",
    `角色 ${input.characters.length} 个`,
    input.setting ? "包含项目设定" : "无项目设定",
  ].join("；");
}

export function hasPolishableChapterText(chapter: ChapterPolishChapterContext) {
  return Boolean(polishableChapterText(chapter));
}

export function polishableChapterText(chapter: ChapterPolishChapterContext) {
  return (
    clean(chapter.draftText) ||
    clean(chapter.polishedText) ||
    clean(chapter.finalText)
  );
}

export function polishableChapterTextSource(chapter: ChapterPolishChapterContext) {
  if (clean(chapter.draftText)) {
    return "草稿正文";
  }

  if (clean(chapter.polishedText)) {
    return "精修正文";
  }

  if (clean(chapter.finalText)) {
    return "定稿正文";
  }

  return "无正文";
}

function buildCharacterRuleLine(character: ChapterPolishCharacterContext) {
  const details = compact([
    character.roleInStory,
    character.identity,
    character.speakingStyle ? `说话风格：${character.speakingStyle}` : "",
    character.behaviorRules ? `行为规则：${character.behaviorRules}` : "",
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

function buildLabeledSettingLines(
  setting: ChapterPolishSettingContext | null | undefined,
  fields: readonly PolishSettingField[],
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
  setting: ChapterPolishSettingContext | null | undefined,
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

import { createHash } from "node:crypto";
import { clipText } from "./chapter-beats";
import {
  buildChapterPlatformTemplateContext,
  type ChapterPlatformTemplate,
} from "./chapter-platform-templates";
import { proseStyleGuardrails } from "./prose-style-guardrails";
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

export type BuildChapterPolishContextOptions = {
  platformTemplate?: ChapterPlatformTemplate;
};

export type ChapterPolishSegment = {
  index: number;
  count: number;
  text: string;
  sourceTextLength: number;
  previousTail: string;
  nextHead: string;
};

export type BuiltChapterPolishSegmentContext = {
  segment: ChapterPolishSegment;
  inputText: string;
  inputJson: Record<string, unknown>;
};

export type BuiltSegmentedChapterPolishContext = {
  segments: BuiltChapterPolishSegmentContext[];
  inputJson: Record<string, unknown>;
  inputContextSummary: string;
};

type PolishSettingField = readonly [ProjectSettingFieldName, string];
type PolishPromptSourceText = {
  text: string;
  wasExcerpted: boolean;
  sourceLength: number;
  promptLength: number;
  maxLength: number;
};

const polishPromptMaxLength = 18000;
export const polishSegmentSourceMaxLength = 9000;

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
  options: BuildChapterPolishContextOptions = {},
): BuiltChapterPolishContext {
  const shared = buildChapterPolishSharedContext(input, options);
  const sourceText = shared.sourceText;
  const sourceKind = shared.sourceKind;
  const promptSourceText = buildPolishPromptSourceText(sourceText);

  const inputJson = {
    project: shared.projectJson,
    chapter: {
      chapterNumber: input.chapter.chapterNumber,
      title: input.chapter.title,
      goal: clean(input.chapter.goal),
      beats: clipText(input.chapter.beats),
      notes: clean(input.chapter.notes),
      sourceKind,
      sourceTextLength: sourceText.length,
      sourceTextPromptLength: promptSourceText.promptLength,
      sourceTextPromptWasExcerpted: promptSourceText.wasExcerpted,
      sourceTextPreview: clipText(sourceText, 1200),
    },
    styleConstraints: shared.styleConstraints,
    platformTemplate: {
      value: shared.platformTemplate.template,
      label: shared.platformTemplate.label,
      instructions: shared.platformTemplate.instructions,
    },
    storyConstraints: shared.storyConstraints,
    characterRules: shared.characterRules,
    forbiddenItems: shared.forbiddenItems,
    outputRequirements: [
      promptSourceText.wasExcerpted
        ? "正文超过精修输入预算，当前只对首/中/尾摘录提供精修；必须提示作者拆章或分段精修完整正文。"
        : "输出完整精修正文，不要输出分析过程。",
      "保留原剧情事实、人物关系、关键台词含义和章节结尾钩子。",
      "删除创作过程标题，例如“开场钩子”“节拍1”“情绪作用”等。",
      "只做表达、节奏、段落和连贯性精修，不新增正式设定。",
      "硬性压低模板腔：全章“不是……而是……”/“不是……是……”二元对照表达最多保留 1 处，输出前必须自检并改写多余句式。",
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
      ["目标字数", shared.wordRange],
      ["作者备注", input.chapter.notes],
      ["正文来源", sourceKind],
    ]),
    "",
    "# 已确认章节节拍",
    clean(input.chapter.beats) || "未填写章节节拍。",
    "",
    "# 文风与读者约束",
    shared.styleConstraints.length > 0
      ? shared.styleConstraints.join("\n")
      : "未设置。",
    "",
    ...(shared.platformTemplate.instructions.length > 0
      ? [
          "# 目标平台模板",
          `平台模板：${shared.platformTemplate.label}`,
          shared.platformTemplate.instructions.join("\n"),
          "",
        ]
      : []),
    "# 角色说话与行为规则",
    shared.characterRules.length > 0
      ? shared.characterRules.join("\n")
      : "暂无角色资料。",
    "",
    "# 世界观与剧情边界",
    shared.storyConstraints.length > 0
      ? shared.storyConstraints.join("\n")
      : "未设置。",
    "",
    "# 禁写事项",
    shared.forbiddenItems || "未设置。",
    "",
    "# 待精修正文",
    promptSourceText.text || "未填写可精修正文。禁止凭空生成。",
    "",
    "# 输出要求",
    promptSourceText.wasExcerpted
      ? "- 当前章节正文过长，只能看到首/中/尾摘录。请只精修提供的摘录，并在开头用一句话提示作者需要拆章或分段精修完整正文。"
      : "- 直接输出完整精修正文，不要输出解释、提纲、修改清单或 JSON。",
    "- 删除“【开场钩子】”“节拍1”“情绪作用”等写作过程标记，让正文变成读者可直接阅读的章节。",
    "- 不改变主要剧情事实、人物关系、关键伏笔、章节目标和结尾钩子。",
    "- 优化句子节奏、段落衔接、人物台词自然度、场景细节密度和连载阅读爽点。",
    "- 保持作者已有语气，不要把小说改成说明书或创作分析。",
    "- 反模板腔硬性自检：全章“不是……而是……”“不是因为……而是因为……”“真正的……不是……而是……”和“不是……是……”这类二元对照表达最多保留 1 处；如果原文有多处，必须先改成更自然的动作、细节、台词或因果推进，再输出正文。",
  ].join("\n");

  return {
    inputText,
    inputJson,
    inputContextSummary: buildChapterPolishContextSummary(input, options),
  };
}

export function shouldSegmentChapterPolish(input: ChapterPolishContextInput) {
  return polishableChapterText(input.chapter).length > polishPromptMaxLength;
}

export function buildSegmentedChapterPolishContext(
  input: ChapterPolishContextInput,
  options: BuildChapterPolishContextOptions = {},
): BuiltSegmentedChapterPolishContext {
  const shared = buildChapterPolishSharedContext(input, options);
  const rawSegments = splitChapterPolishSourceText(shared.sourceText);
  const segments = rawSegments.map((segment) =>
    buildChapterPolishSegmentContext(input, shared, segment),
  );

  return {
    segments,
    inputJson: {
      project: shared.projectJson,
      chapter: {
        chapterNumber: input.chapter.chapterNumber,
        title: input.chapter.title,
        goal: clean(input.chapter.goal),
        beats: clipText(input.chapter.beats),
        notes: clean(input.chapter.notes),
        sourceKind: shared.sourceKind,
        sourceTextLength: shared.sourceText.length,
        sourceTextHash: hashText(shared.sourceText),
        sourceTextPromptLength: shared.sourceText.length,
        sourceTextPromptWasExcerpted: false,
        sourceTextPromptWasSegmented: true,
        segmentCount: rawSegments.length,
        segmentMaxLength: polishSegmentSourceMaxLength,
        sourceTextPreview: clipText(shared.sourceText, 1200),
      },
      styleConstraints: shared.styleConstraints,
      platformTemplate: {
        value: shared.platformTemplate.template,
        label: shared.platformTemplate.label,
        instructions: shared.platformTemplate.instructions,
      },
      storyConstraints: shared.storyConstraints,
      characterRules: shared.characterRules,
      forbiddenItems: shared.forbiddenItems,
      outputRequirements: [
        "正文超过单次精修预算，系统已自动按段完整精修；只有全部分段成功后才允许采用。",
        "每段只输出本段精修正文，不输出分析过程、分段说明或 JSON。",
        "最终输出会按原顺序拼接为完整精修正文。",
        "保留原剧情事实、人物关系、关键台词含义和章节结尾钩子。",
        "删除创作过程标题，例如“开场钩子”“节拍1”“情绪作用”等。",
        "只做表达、节奏、段落和连贯性精修，不新增正式设定。",
        "硬性压低模板腔：每个精修分段的“不是……而是……”/“不是……是……”二元对照表达最多保留 1 处，输出前必须自检并改写多余句式。",
      ],
    },
    inputContextSummary: buildSegmentedChapterPolishContextSummary(
      input,
      options,
    ),
  };
}

export function buildChapterPolishContextSummary(
  input: ChapterPolishContextInput,
  options: BuildChapterPolishContextOptions = {},
) {
  const sourceText = polishableChapterText(input.chapter);
  const sourceKind = polishableChapterTextSource(input.chapter);
  const promptSourceText = buildPolishPromptSourceText(sourceText);
  const platformTemplate = buildChapterPlatformTemplateContext({
    task: "polish",
    template: options.platformTemplate,
  });

  return [
    `第 ${input.chapter.chapterNumber} 章《${input.chapter.title}》正文精修`,
    sourceText
      ? promptSourceText.wasExcerpted
        ? `${sourceKind} ${sourceText.length} 字，模型输入首/中/尾摘录 ${promptSourceText.promptLength} 字`
        : `${sourceKind} ${sourceText.length} 字`
      : "缺少可精修正文",
    `角色 ${input.characters.length} 个`,
    input.setting ? "包含项目设定" : "无项目设定",
    platformTemplate.template === "fanqie"
      ? `平台模板：${platformTemplate.label}`
      : "",
  ]
    .filter(Boolean)
    .join("；");
}

export function buildSegmentedChapterPolishContextSummary(
  input: ChapterPolishContextInput,
  options: BuildChapterPolishContextOptions = {},
) {
  const sourceText = polishableChapterText(input.chapter);
  const sourceKind = polishableChapterTextSource(input.chapter);
  const segmentCount = splitChapterPolishSourceText(sourceText).length;
  const platformTemplate = buildChapterPlatformTemplateContext({
    task: "polish",
    template: options.platformTemplate,
  });

  return [
    `第 ${input.chapter.chapterNumber} 章《${input.chapter.title}》正文精修`,
    sourceText
      ? `${sourceKind} ${sourceText.length} 字，自动分段精修 ${segmentCount} 段`
      : "缺少可精修正文",
    `角色 ${input.characters.length} 个`,
    input.setting ? "包含项目设定" : "无项目设定",
    platformTemplate.template === "fanqie"
      ? `平台模板：${platformTemplate.label}`
      : "",
  ]
    .filter(Boolean)
    .join("；");
}

export function hasPolishableChapterText(chapter: ChapterPolishChapterContext) {
  return Boolean(polishableChapterText(chapter));
}

export function polishableChapterText(chapter: ChapterPolishChapterContext) {
  return (
    clean(chapter.polishedText) ||
    clean(chapter.finalText) ||
    clean(chapter.draftText)
  );
}

export function polishableChapterTextSource(chapter: ChapterPolishChapterContext) {
  if (clean(chapter.polishedText)) {
    return "精修正文";
  }

  if (clean(chapter.finalText)) {
    return "定稿正文";
  }

  if (clean(chapter.draftText)) {
    return "草稿正文";
  }

  return "无正文";
}

export function hashText(text: string) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function buildPolishPromptSourceText(
  sourceText: string,
): PolishPromptSourceText {
  if (sourceText.length <= polishPromptMaxLength) {
    return {
      text: sourceText,
      wasExcerpted: false,
      sourceLength: sourceText.length,
      promptLength: sourceText.length,
      maxLength: polishPromptMaxLength,
    };
  }

  const sectionLength = Math.floor(polishPromptMaxLength / 3);
  const middleStart = Math.max(
    sectionLength,
    Math.floor(sourceText.length / 2 - sectionLength / 2),
  );
  const head = sourceText.slice(0, sectionLength).trim();
  const middle = sourceText
    .slice(middleStart, middleStart + sectionLength)
    .trim();
  const tail = sourceText.slice(-sectionLength).trim();
  const text = [
    `【超长正文提示】原文 ${sourceText.length} 字，超过单次精修输入预算 ${polishPromptMaxLength} 字。以下仅提供首/中/尾摘录，禁止假装已经完整精修全章。`,
    "",
    "【开头摘录】",
    head,
    "",
    "【中段摘录】",
    middle,
    "",
    "【结尾摘录】",
    tail,
  ].join("\n");

  return {
    text,
    wasExcerpted: true,
    sourceLength: sourceText.length,
    promptLength: text.length,
    maxLength: polishPromptMaxLength,
  };
}

export function splitChapterPolishSourceText(
  sourceText: string,
  maxSegmentLength = polishSegmentSourceMaxLength,
): ChapterPolishSegment[] {
  const cleanedSourceText = clean(sourceText);

  if (!cleanedSourceText) {
    return [];
  }

  const segments: string[] = [];
  let current = "";
  const flushCurrent = () => {
    const text = current.trim();

    if (text) {
      segments.push(text);
    }

    current = "";
  };

  for (const paragraph of cleanedSourceText
    .split(/\n{2,}/)
    .map((value) => value.trim())
    .filter(Boolean)) {
    if (paragraph.length > maxSegmentLength) {
      flushCurrent();

      for (let index = 0; index < paragraph.length; index += maxSegmentLength) {
        segments.push(paragraph.slice(index, index + maxSegmentLength).trim());
      }

      continue;
    }

    const next = current ? `${current}\n\n${paragraph}` : paragraph;

    if (next.length > maxSegmentLength) {
      flushCurrent();
      current = paragraph;
    } else {
      current = next;
    }
  }

  flushCurrent();

  const count = segments.length;

  return segments.map((text, index) => ({
    index: index + 1,
    count,
    text,
    sourceTextLength: text.length,
    previousTail: index > 0 ? clipTextFromEnd(segments[index - 1], 800) : "",
    nextHead: index < count - 1 ? clipText(segments[index + 1], 800) : "",
  }));
}

export function isExcerptedChapterPolishInputJson(inputJson?: string | null) {
  if (!inputJson) {
    return false;
  }

  try {
    const parsed = JSON.parse(inputJson) as {
      chapter?: {
        sourceTextPromptWasExcerpted?: unknown;
      };
    };

    return parsed.chapter?.sourceTextPromptWasExcerpted === true;
  } catch {
    return false;
  }
}

export function isSegmentedChapterPolishInputJson(inputJson?: string | null) {
  if (!inputJson) {
    return false;
  }

  try {
    const parsed = JSON.parse(inputJson) as {
      chapter?: {
        sourceTextPromptWasSegmented?: unknown;
      };
    };

    return parsed.chapter?.sourceTextPromptWasSegmented === true;
  } catch {
    return false;
  }
}

function buildChapterPolishSegmentContext(
  input: ChapterPolishContextInput,
  shared: ChapterPolishSharedContext,
  segment: ChapterPolishSegment,
): BuiltChapterPolishSegmentContext {
  const inputJson = {
    project: shared.projectJson,
    chapter: {
      chapterNumber: input.chapter.chapterNumber,
      title: input.chapter.title,
      goal: clean(input.chapter.goal),
      beats: clipText(input.chapter.beats),
      notes: clean(input.chapter.notes),
      sourceKind: shared.sourceKind,
      sourceTextLength: shared.sourceText.length,
      sourceTextPromptWasSegmented: true,
      segmentIndex: segment.index,
      segmentCount: segment.count,
      segmentSourceLength: segment.sourceTextLength,
      segmentPreview: clipText(segment.text, 800),
    },
  };
  const inputText = [
    "# 任务",
    `精修第 ${input.chapter.chapterNumber} 章《${input.chapter.title}》正文。`,
    `这是自动分段精修的第 ${segment.index} / ${segment.count} 段。`,
    "只输出本段精修正文，不要输出分析、说明、分段标题或 JSON。",
    "",
    "# 当前章节",
    lines([
      ["章节目标", input.chapter.goal],
      ["目标字数", shared.wordRange],
      ["作者备注", input.chapter.notes],
      ["正文来源", shared.sourceKind],
      ["全章原文字数", shared.sourceText.length],
      ["本段原文字数", segment.sourceTextLength],
    ]),
    "",
    "# 已确认章节节拍",
    clean(input.chapter.beats) || "未填写章节节拍。",
    "",
    "# 文风与读者约束",
    shared.styleConstraints.length > 0
      ? shared.styleConstraints.join("\n")
      : "未设置。",
    "",
    ...(shared.platformTemplate.instructions.length > 0
      ? [
          "# 目标平台模板",
          `平台模板：${shared.platformTemplate.label}`,
          shared.platformTemplate.instructions.join("\n"),
          "",
        ]
      : []),
    "# 角色说话与行为规则",
    shared.characterRules.length > 0
      ? shared.characterRules.join("\n")
      : "暂无角色资料。",
    "",
    "# 世界观与剧情边界",
    shared.storyConstraints.length > 0
      ? shared.storyConstraints.join("\n")
      : "未设置。",
    "",
    "# 禁写事项",
    shared.forbiddenItems || "未设置。",
    "",
    "# 段落衔接参考",
    segment.previousTail
      ? `上一段末尾，仅用于保持衔接，不要重复输出：\n${segment.previousTail}`
      : "这是第一段，没有上一段。",
    "",
    segment.nextHead
      ? `下一段开头，仅用于保持衔接，不要提前输出：\n${segment.nextHead}`
      : "这是最后一段，没有下一段。",
    "",
    "# 待精修正文（本段）",
    segment.text,
    "",
    "# 输出要求",
    "- 直接输出本段精修后的正文，可与其他分段按顺序拼接。",
    "- 删除“【开场钩子】”“节拍1”“情绪作用”等写作过程标记，让正文变成读者可直接阅读的章节。",
    "- 不改变主要剧情事实、人物关系、关键伏笔、章节目标和结尾钩子。",
    "- 优化句子节奏、段落衔接、人物台词自然度、场景细节密度和连载阅读爽点。",
    "- 保持作者已有语气，不要把小说改成说明书或创作分析。",
    "- 反模板腔硬性自检：本段“不是……而是……”“不是因为……而是因为……”“真正的……不是……而是……”和“不是……是……”这类二元对照表达最多保留 1 处；如果本段有多处，必须先改成更自然的动作、细节、台词或因果推进，再输出正文。",
    "- 不要输出“本段精修如下”“第 X 段”等说明文字。",
  ].join("\n");

  return {
    segment,
    inputText,
    inputJson,
  };
}

type ChapterPolishSharedContext = {
  sourceText: string;
  sourceKind: string;
  wordRange: string;
  projectJson: Record<string, unknown>;
  styleConstraints: string[];
  platformTemplate: ReturnType<typeof buildChapterPlatformTemplateContext>;
  storyConstraints: string[];
  characterRules: string[];
  forbiddenItems: string;
};

function buildChapterPolishSharedContext(
  input: ChapterPolishContextInput,
  options: BuildChapterPolishContextOptions = {},
): ChapterPolishSharedContext {
  const sourceText = polishableChapterText(input.chapter);
  const sourceKind = polishableChapterTextSource(input.chapter);
  const platformTemplate = buildChapterPlatformTemplateContext({
    task: "polish",
    template: options.platformTemplate,
  });
  const wordRange = formatWordRange(
    input.project.chapterWordMin,
    input.project.chapterWordMax,
  );
  const styleConstraints = [
    ...buildLabeledSettingLines(input.setting, polishStyleSettingFields),
    input.project.wechatPositioning
      ? `公众号定位：${input.project.wechatPositioning}`
      : "",
    ...proseStyleGuardrails,
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

  return {
    sourceText,
    sourceKind,
    wordRange,
    projectJson: {
      title: input.project.title,
      genre: clean(input.project.genre),
      targetAudience: clean(input.project.targetAudience),
      platform: clean(input.project.platform),
      chapterWordRange: wordRange,
      description: clipText(input.project.description),
    },
    styleConstraints,
    platformTemplate,
    storyConstraints,
    characterRules,
    forbiddenItems,
  };
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

function clipTextFromEnd(value: string, maxLength: number) {
  const cleaned = clean(value);

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `...${cleaned.slice(-maxLength)}`;
}

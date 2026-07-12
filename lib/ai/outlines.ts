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

export type OutlineGenerationPreviousChapterContext = {
  chapterNumber: number;
  title: string;
  endingText: string;
};

export type OutlineGenerationRequest = {
  targetLevel: OutlineLevel;
  chapterCount?: number | null;
  targetChapterNumber?: number | null;
};

export type OutlineGenerationContextInput = {
  project: OutlineGenerationProjectContext;
  setting?: OutlineGenerationSettingContext | null;
  outlines: readonly OutlineLike[];
  characters: readonly OutlineGenerationCharacterContext[];
  recentChapters: readonly OutlineGenerationChapterContext[];
  previousChapter?: OutlineGenerationPreviousChapterContext | null;
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
      ? 1
      : null;
  const targetChapterNumber =
    input.request.targetLevel === "volume"
      ? null
      : (input.request.targetChapterNumber ?? null);
  const previousChapter =
    input.request.targetLevel !== "volume" && input.previousChapter
      ? {
          chapterNumber: input.previousChapter.chapterNumber,
          title: input.previousChapter.title,
          endingText: clipText(input.previousChapter.endingText, 1800),
        }
      : null;
  const previousChapterSection =
    input.request.targetLevel !== "volume" && targetChapterNumber
      ? [
          "",
          "# 必须承接的上一章结尾",
          previousChapter
            ? [
                `目标章节的上一章是第 ${previousChapter.chapterNumber} 章《${previousChapter.title}》。`,
                input.request.targetLevel === "chapter"
                  ? "请让本次章节大纲直接承接下面这段结尾里的最后事件、人物状态和章末钩子，不要跳回更早事件，也不要因为新增角色而另起一条与上一章脱节的线。"
                  : `请让从第 ${targetChapterNumber} 章开始的下一剧情单元直接承接下面这段结尾，延续人物状态、未完成行动和当前压力，不要重复开篇或另起脱节支线。`,
                previousChapter.endingText,
              ].join("\n")
            : "未找到起始章节的上一章正文结尾；请根据已有章节目标和大纲保持顺序衔接。",
        ]
      : [];

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
      targetChapterNumber,
    },
    setting: Object.fromEntries(settingItems),
    existingOutlines: outlineItems,
    characters: characterItems,
    recentChapters: chapterItems,
    previousChapter,
  };

  const inputText = [
    "# 任务",
    `为《${input.project.title}》生成${targetLabel}草案。`,
    "输出只作为作者审核和手动整理的大纲建议，不得宣称已经写入正式大纲或正式故事记忆。",
    input.request.targetLevel === "chapter"
      ? targetChapterNumber
        ? `本次只生成第 ${targetChapterNumber} 章的一条章节大纲，不要生成其他章节。`
        : "本次只生成下一章的一条章节大纲，不要生成连续多章。"
      : input.request.targetLevel === "unit" && targetChapterNumber
        ? `本次只规划一个从第 ${targetChapterNumber} 章开始的下一剧情单元。请根据总目标、已有卷大纲和最近章节建议合理的结束章节，不要覆盖已有剧情单元。`
      : "",
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
    ...previousChapterSection,
    "",
    "# 输出要求",
    "- 使用 Markdown 输出。",
    "- 保持三层结构清晰：卷大纲、剧情单元大纲、章节大纲。",
    "- 不要直接修改正式设定、角色、世界规则、时间线或伏笔。",
    "- 如果任务是章节大纲，只输出目标章节这一章，不要输出连续章节列表。",
    "- 如果任务是章节大纲，开篇必须承接上一章最后事件和章末钩子；新增人物只能服务这个承接，不要替换主线衔接。",
    "- 如果任务是下一剧情单元，必须从指定起始章节承接最近正文，并给出不与已有单元重叠的建议结束章节。",
    "- 给出可复制到大纲表单的字段：标题、目标、章节范围、核心事件、冲突、爽点、伏笔和章末钩子。",
    "- 可复制字段必须使用独立行式标签，例如 `**标题：** ...`、`**目标：** ...`、`**章节范围：** 第1章-第10章`；不要只把关键字段放进 Markdown 表格。",
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
      ? input.request.targetChapterNumber
        ? `；目标第 ${input.request.targetChapterNumber} 章；固定 1 条章节大纲`
        : "；固定 1 条章节大纲"
      : input.request.targetLevel === "unit" &&
          input.request.targetChapterNumber
        ? `；建议起始第 ${input.request.targetChapterNumber} 章`
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

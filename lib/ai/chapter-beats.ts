import { formatWordRange } from "../format";
import { foreshadowRecoveryReason } from "../foreshadows/recovery-reason";
import { outlineLevelLabel, outlineRangeLabel, type OutlineLike } from "../outline-fields";
import { projectSettingFields } from "../project-setting-fields";
import {
  foreshadowImportanceLabel,
  foreshadowStatusLabel,
} from "../story-memory-fields";
import { proseStyleGuardrails } from "./prose-style-guardrails";
import {
  formatShortStoryBlueprintForContext,
  shortStoryBlueprintValuesFromRecord,
  type ShortStoryBlueprintFieldName,
} from "../short-stories/blueprint-fields";

export type ChapterBeatProjectContext = {
  title: string;
  workType?: string | null;
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
  unitSceneMovement?: string | null;
  unitConflict?: string | null;
  unitTurn?: string | null;
  unitPayoffMovement?: string | null;
  unitWordTarget?: number | null;
  draftText?: string | null;
  polishedText?: string | null;
  finalText?: string | null;
  notes?: string | null;
};

export type ChapterBeatForeshadowContext = {
  id?: string | null;
  content: string;
  status?: string | null;
  importance?: string | null;
  expectedResolveChapter?: number | null;
  relatedCharacters?: string | null;
  relatedLocations?: string | null;
  relatedFactions?: string | null;
  plantedChapter?: {
    chapterNumber: number;
    title: string;
  } | null;
};

export type ChapterBeatContextInput = {
  project: ChapterBeatProjectContext;
  blueprint?: Partial<
    Record<ShortStoryBlueprintFieldName, string | null>
  > | null;
  setting?: ChapterBeatSettingContext | null;
  chapter: ChapterBeatChapterContext;
  outlines?: readonly OutlineLike[];
  characters: readonly ChapterBeatCharacterContext[];
  recentChapters: readonly ChapterBeatChapterContext[];
  previousChapter?: ChapterBeatChapterContext | null;
  dueForeshadows?: readonly ChapterBeatForeshadowContext[];
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
  const shortStoryProject = input.project.workType === "short_story";
  const openingShortStoryUnit =
    shortStoryProject && input.chapter.chapterNumber === 1;
  const unitLabel = shortStoryProject ? "写作单元" : "章节";
  const blueprint = shortStoryBlueprintValuesFromRecord(input.blueprint);
  const blueprintText = formatShortStoryBlueprintForContext(input.blueprint);
  const previousChapterEnding = input.previousChapter
    ? excerptChapterEnding(input.previousChapter)
    : "";
  const settingItems = buildSettingItems(input.setting);
  const outlineItems = (input.outlines ?? []).map(buildOutlineLine);
  const characterItems = input.characters
    .map((character) => buildCharacterLine(character))
    .filter(Boolean);
  const recentChapterItems = input.recentChapters.map((chapter) =>
    buildRecentChapterLine(chapter, shortStoryProject),
  );
  const dueForeshadowItems = (input.dueForeshadows ?? []).map((foreshadow) =>
    buildDueForeshadowLine(foreshadow, input.chapter.chapterNumber),
  );
  const forbiddenItems = compact([
    input.setting?.forbiddenItems,
    input.setting?.sensitiveContentRules,
  ]).join("\n");
  const wordRange =
    shortStoryProject && (input.chapter.unitWordTarget ?? 0) > 0
      ? `约 ${input.chapter.unitWordTarget?.toLocaleString("zh-CN")} 字`
      : formatWordRange(
          input.project.chapterWordMin,
          input.project.chapterWordMax,
        );

  const inputJson = {
    project: normalizeProject(input.project),
    blueprint: shortStoryProject ? blueprint : null,
    setting: Object.fromEntries(settingItems),
    chapter: {
      chapterNumber: input.chapter.chapterNumber,
      title: input.chapter.title,
      goal: clean(input.chapter.goal),
      notes: clean(input.chapter.notes),
      existingBeats: clean(input.chapter.beats),
      unitPlan: shortStoryProject
        ? {
            sceneMovement: clean(input.chapter.unitSceneMovement),
            conflict: clean(input.chapter.unitConflict),
            turn: clean(input.chapter.unitTurn),
            payoffMovement: clean(input.chapter.unitPayoffMovement),
            wordTarget: input.chapter.unitWordTarget ?? 0,
          }
        : null,
    },
    outlines: outlineItems,
    characters: characterItems,
    recentChapters: recentChapterItems,
    dueForeshadows: (input.dueForeshadows ?? []).map((foreshadow) =>
      compactDueForeshadow(foreshadow, input.chapter.chapterNumber),
    ),
    previousChapterEnding,
    forbiddenItems,
    outputRequirements: [
      "使用 Markdown 输出。",
      shortStoryProject
        ? "按顺序给出 5-8 个写作单元节拍。"
        : "按顺序给出 8-12 个章节节拍。",
      shortStoryProject
        ? openingShortStoryUnit
          ? "建立故事开篇，落实正式蓝图的开篇钩子，并启动核心冲突。"
          : "承接前序单元，包含场景推进、冲突升级、关键转折和兑现推进。"
        : "包含开场钩子、关键事件、情绪转折、章末钩子。",
      "节拍草案也要避免模板腔，不要反复使用“不是……而是……”这类二元对照句式。",
      "不要按第一天、第二天、第三天或早中晚打卡式推进；只有时间压力本身是冲突时才保留明确日期。",
      "每个节拍都必须提供新线索、新阻碍、新选择、新代价、关系变化、风险升级或伏笔回收；无功能的过渡日要合并或跳过。",
      `如果本${shortStoryProject ? "单元" : "章"}建议处理伏笔列表有条目，节拍中必须安排回收、推进或说明暂缓理由；不得直接标记正式伏笔状态。`,
      "不要宣称已经修改正式设定或角色记忆。",
      ...(shortStoryProject
        ? [
            openingShortStoryUnit
              ? "第一个单元必须建立正式蓝图的开篇钩子、主角压力和核心冲突。"
              : "不得重复故事开篇、背景介绍或角色首次登场说明。",
            openingShortStoryUnit
              ? "只交代启动当前冲突所必需的背景与角色信息，避免集中设定说明。"
              : "不得回顾上一单元已清楚呈现的信息，直接从行动后果或新压力继续。",
            "单元结尾服从整篇节奏，不得为了内部切分强造独立章末追读钩子。",
            "必须推进正式蓝图的反转链、情绪曲线或必须兑现事项，不能另开无关支线。",
          ]
        : []),
    ],
    proseStyleGuardrails,
  };

  const inputText = [
    "# 任务",
    shortStoryProject
      ? `为写作单元 ${input.chapter.chapterNumber}《${input.chapter.title}》生成单元节拍。`
      : `为第 ${input.chapter.chapterNumber} 章《${input.chapter.title}》生成章节节拍。`,
    "输出只作为作者审核草案，不得视为已写入正式故事记忆。",
    "",
    `# 当前${unitLabel}`,
    lines([
      [`${shortStoryProject ? "单元" : "章节"}目标`, input.chapter.goal],
      ["场景推进", input.chapter.unitSceneMovement],
      ["核心冲突", input.chapter.unitConflict],
      ["关键转折", input.chapter.unitTurn],
      ["兑现推进", input.chapter.unitPayoffMovement],
      ["目标字数", wordRange],
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
      [shortStoryProject ? "单元字数" : "单章字数", wordRange],
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
    ...(shortStoryProject
      ? ["# 正式短故事蓝图", blueprintText || "尚未建立正式蓝图。"]
      : [
          "# 当前大纲",
          outlineItems.length > 0
            ? outlineItems.join("\n")
            : "暂无匹配当前章节的卷、剧情单元或章节大纲。",
        ]),
    "",
    "# 相关角色",
    characterItems.length > 0 ? characterItems.join("\n") : "暂无角色资料。",
    "",
    `# 最近${shortStoryProject ? "写作单元" : "章节"}`,
    recentChapterItems.length > 0
      ? recentChapterItems.join("\n")
      : `暂无已保存的前序${shortStoryProject ? "写作单元" : "章节"}。`,
    "",
    `# 本${shortStoryProject ? "单元" : "章"}建议处理伏笔`,
    dueForeshadowItems.length > 0
      ? dueForeshadowItems.join("\n")
      : "暂无到期或需要处理的伏笔。",
    "",
    `# 上一${shortStoryProject ? "单元" : "章"}结尾`,
    previousChapterEnding ||
      `暂无上一${shortStoryProject ? "单元" : "章"}正文结尾。`,
    "",
    "# 禁写事项",
    forbiddenItems || "未设置。",
    "",
    "# 输出要求",
    "- 使用 Markdown。",
    shortStoryProject
      ? "- 给出 5-8 个顺序节拍，每个节拍包含剧情动作、压力变化和蓝图兑现作用。"
      : "- 给出 8-12 个顺序节拍，每个节拍包含剧情动作和情绪作用。",
    shortStoryProject
      ? openingShortStoryUnit
        ? "- 建立故事开篇，优先落实正式蓝图的开篇钩子、主角压力和核心冲突；必要背景随行动呈现。"
        : "- 直接承接前序单元，不重复开篇、背景说明、角色介绍或已呈现的信息；结尾只保留整篇需要的自然转折。"
      : "- 明确标出开场钩子、关键转折、章末钩子。",
    "- 保持既有设定与角色边界，不新增未经作者确认的正式设定。",
    "- 节拍草案也要避免模板腔，少用“不是……而是……”这类二元对照句式；能用具体行动、选择和后果表达，就不要用抽象总结。",
    `- 反流水账硬性自检：不要把本${shortStoryProject ? "单元" : "章"}规划成“第一天/第二天/第三天”或“早上/中午/晚上”的日程表；除非倒计时、证据矛盾或人物错位依赖明确时间，否则跳过无冲突过渡日。`,
    "- 每个节拍必须至少承担一个叙事功能：新线索、新阻碍、新选择、新代价、关系变化、风险升级或伏笔回收；只有时间流逝但没有事件功能的节拍必须合并或删除。",
    `- 如果“本${shortStoryProject ? "单元" : "章"}建议处理伏笔”列出条目，必须在节拍中安排合理回收、阶段性推进或明确暂缓理由；这只是节拍规划，不得宣称已修改伏笔池状态。`,
    ...(shortStoryProject
      ? [
          "- 必须落实正式蓝图的反转链、情绪曲线和必须兑现事项，不得另开与单篇闭环无关的支线。",
          "- 内部单元不是公开章节：禁止为了切分而添加重复标题、总结段、下回预告或人工追读钩子。",
        ]
      : []),
  ].join("\n");

  return {
    inputText,
    inputJson,
    inputContextSummary: buildChapterBeatContextSummary(input),
  };
}

export function buildChapterBeatContextSummary(input: ChapterBeatContextInput) {
  const shortStoryProject = input.project.workType === "short_story";
  return [
    shortStoryProject
      ? `写作单元 ${input.chapter.chapterNumber}《${input.chapter.title}》节拍生成`
      : `第 ${input.chapter.chapterNumber} 章《${input.chapter.title}》章节节拍生成`,
    shortStoryProject
      ? `蓝图 ${input.blueprint ? "已建立" : "未建立"}`
      : `大纲 ${(input.outlines ?? []).length} 条`,
    `角色 ${input.characters.length} 个`,
    `最近${shortStoryProject ? "单元" : "章节"} ${input.recentChapters.length} 个`,
    input.dueForeshadows?.length
      ? `建议处理伏笔 ${input.dueForeshadows.length} 条`
      : "无到期伏笔",
    input.previousChapter
      ? `包含上一${shortStoryProject ? "单元" : "章"}结尾`
      : `无上一${shortStoryProject ? "单元" : "章"}结尾`,
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
    workType: clean(project.workType),
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

function buildRecentChapterLine(
  chapter: ChapterBeatChapterContext,
  shortStoryProject: boolean,
) {
  const prefix = shortStoryProject
    ? `写作单元 ${chapter.chapterNumber}`
    : `第 ${chapter.chapterNumber} 章`;
  return `- ${prefix}《${chapter.title}》：${compact([
    chapter.goal ? `目标：${chapter.goal}` : "",
    chapter.beats ? `节拍：${clipText(chapter.beats, 600)}` : "",
    chapter.notes ? `备注：${clipText(chapter.notes, 400)}` : "",
  ]).join("；") || "暂无摘要信息"}`;
}

function buildDueForeshadowLine(
  foreshadow: ChapterBeatForeshadowContext,
  currentChapterNumber: number,
) {
  const details = compact([
    `处理提示：${foreshadowRecoveryReason(foreshadow, currentChapterNumber)}`,
    `重要度：${foreshadowImportanceLabel(foreshadow.importance)}`,
    `状态：${foreshadowStatusLabel(foreshadow.status)}`,
    foreshadow.expectedResolveChapter
      ? `预计回收：第 ${foreshadow.expectedResolveChapter} 章`
      : "",
    foreshadow.plantedChapter
      ? `埋设：第 ${foreshadow.plantedChapter.chapterNumber} 章《${foreshadow.plantedChapter.title}》`
      : "",
    foreshadow.relatedCharacters
      ? `相关人物：${clipText(foreshadow.relatedCharacters, 180)}`
      : "",
    foreshadow.relatedLocations
      ? `相关地点：${clipText(foreshadow.relatedLocations, 180)}`
      : "",
    foreshadow.relatedFactions
      ? `相关势力：${clipText(foreshadow.relatedFactions, 180)}`
      : "",
  ]).join("；");

  return `- ${clipText(foreshadow.content, 500)}${
    details ? `（${details}）` : ""
  }`;
}

function compactDueForeshadow(
  foreshadow: ChapterBeatForeshadowContext,
  currentChapterNumber: number,
) {
  return {
    id: clean(foreshadow.id),
    content: clipText(foreshadow.content, 500),
    status: clean(foreshadow.status),
    statusLabel: foreshadowStatusLabel(foreshadow.status),
    importance: clean(foreshadow.importance),
    importanceLabel: foreshadowImportanceLabel(foreshadow.importance),
    recoveryReason: foreshadowRecoveryReason(foreshadow, currentChapterNumber),
    expectedResolveChapter: foreshadow.expectedResolveChapter ?? null,
    relatedCharacters: clipText(foreshadow.relatedCharacters, 240),
    relatedLocations: clipText(foreshadow.relatedLocations, 240),
    relatedFactions: clipText(foreshadow.relatedFactions, 240),
    plantedChapter: foreshadow.plantedChapter
      ? {
          chapterNumber: foreshadow.plantedChapter.chapterNumber,
          title: foreshadow.plantedChapter.title,
        }
      : null,
  };
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

import { outlineLevelLabel, outlineRangeLabel, type OutlineLike } from "../outline-fields";
import {
  calculateOutlineProgress,
  resolveOutlineLifecycleStatus,
} from "../outline-progress";

export const endingPlanningTaskType = "ending_planning_generation";

export type EndingPlanningProjectContext = {
  title: string;
  genre?: string | null;
  targetAudience?: string | null;
  totalWordTarget?: number | null;
  chapterWordMin?: number | null;
  chapterWordMax?: number | null;
  description?: string | null;
};

export type EndingPlanningSettingContext = {
  mainConflict?: string | null;
  protagonistDesire?: string | null;
  protagonistFlaw?: string | null;
  villainLogic?: string | null;
  longTermForeshadowing?: string | null;
  endingDirection?: string | null;
  forbiddenItems?: string | null;
  emotionalTone?: string | null;
};

export type EndingPlanningChapterContext = {
  chapterNumber: number;
  title: string;
  status: string;
  goal?: string | null;
  wordCount?: number | null;
};

export type EndingPlanningForeshadowContext = {
  content: string;
  status: string;
  importance: string;
  expectedResolveChapter?: number | null;
  plantedChapter?: { chapterNumber: number; title: string } | null;
  resolvedChapter?: { chapterNumber: number; title: string } | null;
};

export type EndingPlanningCharacterContext = {
  name: string;
  roleInStory?: string | null;
  characterArc?: string | null;
  status?: string | null;
};

export type EndingPlanningTimelineContext = {
  title: string;
  storyTime?: string | null;
  chapter?: { chapterNumber: number; title: string } | null;
};

export type EndingPlanningContextInput = {
  project: EndingPlanningProjectContext;
  setting?: EndingPlanningSettingContext | null;
  chapters: readonly EndingPlanningChapterContext[];
  outlines: readonly OutlineLike[];
  foreshadows: readonly EndingPlanningForeshadowContext[];
  characters: readonly EndingPlanningCharacterContext[];
  timelineEvents: readonly EndingPlanningTimelineContext[];
};

export type EndingReadinessStage =
  | "missing_target"
  | "continue_expansion"
  | "prepare_closure"
  | "tighten_threads"
  | "enter_endgame"
  | "ready_to_finish";

export type EndingReadinessSnapshot = {
  currentWords: number;
  targetWords: number | null;
  progressPercent: number | null;
  chapterCount: number;
  finalChapterCount: number;
  publishedChapterCount: number;
  unresolvedForeshadowCount: number;
  highImportanceUnresolvedForeshadowCount: number;
  activeOutlineCount: number;
  completedOutlineCount: number;
  stage: EndingReadinessStage;
  recommendation: string;
};

export type BuiltEndingPlanningContext = {
  inputText: string;
  inputJson: Record<string, unknown>;
  inputContextSummary: string;
  readiness: EndingReadinessSnapshot;
};

const FIELD_MAX_LENGTH = 1000;
const LIST_ITEM_MAX_LENGTH = 500;

export function calculateEndingReadiness(
  input: Pick<EndingPlanningContextInput, "project" | "chapters" | "outlines" | "foreshadows">,
): EndingReadinessSnapshot {
  const currentWords = input.chapters.reduce(
    (sum, chapter) => sum + Math.max(0, chapter.wordCount ?? 0),
    0,
  );
  const targetWords =
    input.project.totalWordTarget && input.project.totalWordTarget > 0
      ? input.project.totalWordTarget
      : null;
  const progressPercent =
    targetWords && targetWords > 0
      ? Math.round((currentWords / targetWords) * 100)
      : null;
  const unresolvedForeshadows = input.foreshadows.filter((foreshadow) =>
    isUnresolvedForeshadowStatus(foreshadow.status),
  );
  const highImportanceUnresolvedForeshadowCount = unresolvedForeshadows.filter(
    (foreshadow) => foreshadow.importance === "high",
  ).length;
  const chapterCount = input.chapters.length;
  const finalChapterCount = input.chapters.filter((chapter) =>
    isFinalChapterStatus(chapter.status),
  ).length;
  const publishedChapterCount = input.chapters.filter(
    (chapter) => chapter.status === "published",
  ).length;
  const outlineStatuses = input.outlines.map((outline) =>
    resolveOutlineLifecycleStatus(
      outline,
      calculateOutlineProgress(outline, input.chapters),
    ),
  );
  const activeOutlineCount = outlineStatuses.filter(
    (status) => status === "active",
  ).length;
  const completedOutlineCount = outlineStatuses.filter(
    (status) => status === "completed",
  ).length;
  const stage = resolveEndingStage({
    progressPercent,
    unresolvedForeshadowCount: unresolvedForeshadows.length,
    highImportanceUnresolvedForeshadowCount,
  });

  return {
    currentWords,
    targetWords,
    progressPercent,
    chapterCount,
    finalChapterCount,
    publishedChapterCount,
    unresolvedForeshadowCount: unresolvedForeshadows.length,
    highImportanceUnresolvedForeshadowCount,
    activeOutlineCount,
    completedOutlineCount,
    stage,
    recommendation: endingStageRecommendation(stage),
  };
}

export function buildEndingPlanningContext(
  input: EndingPlanningContextInput,
): BuiltEndingPlanningContext {
  const readiness = calculateEndingReadiness(input);
  const unresolvedForeshadows = input.foreshadows.filter((foreshadow) =>
    isUnresolvedForeshadowStatus(foreshadow.status),
  );
  const highForeshadows = unresolvedForeshadows.filter(
    (foreshadow) => foreshadow.importance === "high",
  );
  const recentChapters = input.chapters.slice(-8);
  const latestTimelineEvents = input.timelineEvents.slice(-8);
  const activeOutlines = input.outlines
    .filter((outline) => outline.status !== "archived")
    .map((outline) => ({
      ...outline,
      status: resolveOutlineLifecycleStatus(
        outline,
        calculateOutlineProgress(outline, input.chapters),
      ),
    }));

  const inputJson = {
    project: {
      title: input.project.title,
      genre: clean(input.project.genre),
      targetAudience: clean(input.project.targetAudience),
      totalWordTarget: input.project.totalWordTarget ?? null,
      chapterWordMin: input.project.chapterWordMin ?? null,
      chapterWordMax: input.project.chapterWordMax ?? null,
      description: clipText(input.project.description),
    },
    readiness,
    setting: {
      mainConflict: clipText(input.setting?.mainConflict),
      protagonistDesire: clipText(input.setting?.protagonistDesire),
      protagonistFlaw: clipText(input.setting?.protagonistFlaw),
      villainLogic: clipText(input.setting?.villainLogic),
      longTermForeshadowing: clipText(input.setting?.longTermForeshadowing),
      endingDirection: clipText(input.setting?.endingDirection),
      forbiddenItems: clipText(input.setting?.forbiddenItems),
      emotionalTone: clipText(input.setting?.emotionalTone),
    },
    outlines: activeOutlines.map((outline) => ({
      level: outline.level,
      status: outline.status,
      title: clean(outline.title),
      range: outlineRangeLabel(outline),
      goal: clipText(outline.goal, LIST_ITEM_MAX_LENGTH),
      climax: clipText(outline.climax, LIST_ITEM_MAX_LENGTH),
      endingHook: clipText(outline.endingHook, LIST_ITEM_MAX_LENGTH),
      resolvedForeshadow: clipText(
        outline.resolvedForeshadow,
        LIST_ITEM_MAX_LENGTH,
      ),
    })),
    unresolvedForeshadows: unresolvedForeshadows.map(buildForeshadowJson),
    highImportanceForeshadows: highForeshadows.map(buildForeshadowJson),
    characters: input.characters.map((character) => ({
      name: clean(character.name),
      roleInStory: clipText(character.roleInStory, 300),
      status: clean(character.status),
      characterArc: clipText(character.characterArc, LIST_ITEM_MAX_LENGTH),
    })),
    recentChapters: recentChapters.map((chapter) => ({
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,
      status: chapter.status,
      wordCount: chapter.wordCount ?? 0,
      goal: clipText(chapter.goal, LIST_ITEM_MAX_LENGTH),
    })),
    timelineEvents: latestTimelineEvents.map((event) => ({
      title: clipText(event.title, LIST_ITEM_MAX_LENGTH),
      storyTime: clean(event.storyTime),
      chapter: event.chapter
        ? `第 ${event.chapter.chapterNumber} 章《${event.chapter.title}》`
        : null,
    })),
  };

  const inputText = [
    "# 任务",
    `为《${input.project.title}》生成一份终局规划 / 收尾检查草案。`,
    "这是一份供作者审核的大纲规划建议，不得宣称已经写入正式大纲、正式伏笔池、正式时间线或正式故事记忆。",
    "不得自动把任何伏笔标记为已回收或废弃；只能列出建议和证据需求，等待作者确认。",
    "",
    "# 当前收尾信号",
    lines([
      ["当前总字数", readiness.currentWords],
      ["目标总字数", readiness.targetWords ?? "未设置"],
      [
        "目标进度",
        readiness.progressPercent == null
          ? "未设置"
          : `${readiness.progressPercent}%`,
      ],
      ["章节数", readiness.chapterCount],
      ["已定稿章节", readiness.finalChapterCount],
      ["已发布章节", readiness.publishedChapterCount],
      ["未回收或推进中伏笔", readiness.unresolvedForeshadowCount],
      ["高重要度未回收伏笔", readiness.highImportanceUnresolvedForeshadowCount],
      ["本地建议", readiness.recommendation],
    ]),
    "",
    "# 总设定与结局方向",
    lines([
      ["主线矛盾", input.setting?.mainConflict],
      ["主角欲望", input.setting?.protagonistDesire],
      ["主角缺陷", input.setting?.protagonistFlaw],
      ["反派逻辑", input.setting?.villainLogic],
      ["长期伏笔方向", input.setting?.longTermForeshadowing],
      ["结局方向", input.setting?.endingDirection],
      ["情绪基调", input.setting?.emotionalTone],
      ["禁写事项", input.setting?.forbiddenItems],
    ]),
    "",
    "# 已有大纲",
    activeOutlines.length > 0
      ? activeOutlines.map(buildOutlineLine).join("\n")
      : "暂无正式大纲。",
    "",
    "# 未回收 / 推进中伏笔",
    unresolvedForeshadows.length > 0
      ? unresolvedForeshadows.map(buildForeshadowLine).join("\n")
      : "当前没有未回收或推进中的伏笔。",
    "",
    "# 主要角色弧线",
    input.characters.length > 0
      ? input.characters.map(buildCharacterLine).join("\n")
      : "暂无角色资料。",
    "",
    "# 最近章节",
    recentChapters.length > 0
      ? recentChapters.map(buildChapterLine).join("\n")
      : "暂无章节。",
    "",
    "# 最近时间线事件",
    latestTimelineEvents.length > 0
      ? latestTimelineEvents.map(buildTimelineLine).join("\n")
      : "暂无时间线事件。",
    "",
    "# 输出要求",
    "- 使用 Markdown 输出。",
    "- 先判断当前是否适合开始收束；如果目标字数不足，要明确建议延长或压缩。",
    "- 输出剩余建议章节数、终局卷目标、最后 2-4 个剧情单元、必须回收伏笔、可淡化伏笔、角色结局清单、主线矛盾解决顺序和大结局风格。",
    "- 不要新增大量新支线；如果确实需要新增，只能列为风险提示。",
    "- 不要直接写完整大结局正文，只做规划。",
    "- 每个建议都要尽量关联已有大纲、伏笔、角色或章节事实。",
  ].join("\n");

  return {
    inputText,
    inputJson,
    inputContextSummary: buildEndingPlanningContextSummary(input, readiness),
    readiness,
  };
}

export function buildEndingPlanningContextSummary(
  input: EndingPlanningContextInput,
  readiness = calculateEndingReadiness(input),
) {
  const progressText =
    readiness.progressPercent == null
      ? "未设置目标字数"
      : `目标进度 ${readiness.progressPercent}%`;

  return [
    `《${input.project.title}》终局规划`,
    progressText,
    `章节 ${readiness.chapterCount} 个`,
    `未回收伏笔 ${readiness.unresolvedForeshadowCount} 条`,
    `阶段：${endingStageLabel(readiness.stage)}`,
  ].join("；");
}

export function endingStageLabel(stage: EndingReadinessStage) {
  switch (stage) {
    case "missing_target":
      return "缺少目标字数";
    case "continue_expansion":
      return "继续展开";
    case "prepare_closure":
      return "收束准备";
    case "tighten_threads":
      return "线索收紧";
    case "enter_endgame":
      return "进入终局";
    case "ready_to_finish":
      return "可以完结";
  }
}

function resolveEndingStage({
  progressPercent,
  unresolvedForeshadowCount,
  highImportanceUnresolvedForeshadowCount,
}: {
  progressPercent: number | null;
  unresolvedForeshadowCount: number;
  highImportanceUnresolvedForeshadowCount: number;
}): EndingReadinessStage {
  if (progressPercent == null) {
    return "missing_target";
  }

  if (progressPercent < 70) {
    return "continue_expansion";
  }

  if (progressPercent < 80) {
    return "prepare_closure";
  }

  if (progressPercent < 90) {
    return "tighten_threads";
  }

  if (
    progressPercent >= 95 &&
    unresolvedForeshadowCount <= 2 &&
    highImportanceUnresolvedForeshadowCount === 0
  ) {
    return "ready_to_finish";
  }

  return "enter_endgame";
}

function endingStageRecommendation(stage: EndingReadinessStage) {
  switch (stage) {
    case "missing_target":
      return "建议先在项目设置里填写总目标字数，再让 AI 判断收尾节奏。";
    case "continue_expansion":
      return "当前仍适合展开主线和阶段性支线，但应避免新增无法回收的大伏笔。";
    case "prepare_closure":
      return "建议开始收束准备：减少新支线，列出必须回收的伏笔和角色弧线。";
    case "tighten_threads":
      return "建议进入线索收紧期：优先推进未回收伏笔、反派压力和核心角色选择。";
    case "enter_endgame":
      return "建议规划终局卷或最后几个剧情单元，避免继续铺开新主线。";
    case "ready_to_finish":
      return "可以准备完结规划：聚焦主线矛盾解决、角色落点和大结局余味。";
  }
}

function buildOutlineLine(outline: OutlineLike) {
  return `- ${outlineLevelLabel(outline.level)} ${outlineRangeLabel(outline)}《${clean(
    outline.title,
  ) || "未命名"}》（${outline.status || "未设置"}）：${compact([
    outline.goal ? `目标：${clipText(outline.goal, 350)}` : "",
    outline.climax ? `高潮：${clipText(outline.climax, 300)}` : "",
    outline.endingHook ? `钩子：${clipText(outline.endingHook, 250)}` : "",
    outline.resolvedForeshadow
      ? `回收：${clipText(outline.resolvedForeshadow, 250)}`
      : "",
  ]).join("；") || "暂无摘要"}`;
}

function buildForeshadowLine(foreshadow: EndingPlanningForeshadowContext) {
  return `- [${foreshadow.importance}/${foreshadow.status}] ${clipText(
    foreshadow.content,
    LIST_ITEM_MAX_LENGTH,
  )}（埋设：${chapterRef(foreshadow.plantedChapter)}；预计回收：${
    foreshadow.expectedResolveChapter ?? "未指定"
  }）`;
}

function buildForeshadowJson(foreshadow: EndingPlanningForeshadowContext) {
  return {
    content: clipText(foreshadow.content, LIST_ITEM_MAX_LENGTH),
    status: foreshadow.status,
    importance: foreshadow.importance,
    expectedResolveChapter: foreshadow.expectedResolveChapter ?? null,
    plantedChapter: chapterRef(foreshadow.plantedChapter),
    resolvedChapter: chapterRef(foreshadow.resolvedChapter),
  };
}

function buildCharacterLine(character: EndingPlanningCharacterContext) {
  return `- ${character.name}：${compact([
    character.roleInStory,
    character.characterArc ? `弧线：${clipText(character.characterArc, 450)}` : "",
  ]).join("；") || "暂无弧线"}`;
}

function buildChapterLine(chapter: EndingPlanningChapterContext) {
  return `- 第 ${chapter.chapterNumber} 章《${chapter.title}》（${chapter.status}，${
    chapter.wordCount ?? 0
  } 字）：${clipText(chapter.goal, 350) || "暂无目标"}`;
}

function buildTimelineLine(event: EndingPlanningTimelineContext) {
  return `- ${event.storyTime ? `${event.storyTime}：` : ""}${clipText(
    event.title,
    LIST_ITEM_MAX_LENGTH,
  )}${event.chapter ? `（${chapterRef(event.chapter)}）` : ""}`;
}

function isUnresolvedForeshadowStatus(status?: string | null) {
  return status === "planted" || status === "advancing" || status === "needs_attention";
}

function isFinalChapterStatus(status?: string | null) {
  return status === "final" || status === "published";
}

function chapterRef(chapter?: { chapterNumber: number; title: string } | null) {
  return chapter ? `第 ${chapter.chapterNumber} 章《${chapter.title}》` : "未指定";
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

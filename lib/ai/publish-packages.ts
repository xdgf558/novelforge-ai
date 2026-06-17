import { clipText } from "./chapter-beats";
import { confirmedChapterText } from "./chapter-summaries";
import { buildPublishMarkdown } from "../publish-packages";
import {
  projectSettingFields,
  type ProjectSettingFieldName,
} from "../project-setting-fields";

export type PublishPackageProjectContext = {
  title: string;
  genre?: string | null;
  targetAudience?: string | null;
  platform?: string | null;
  description?: string | null;
  wechatPositioning?: string | null;
};

export type PublishPackageSettingContext = Partial<
  Record<ProjectSettingFieldName, string | null>
>;

export type PublishPackageChapterContext = {
  chapterNumber: number;
  title: string;
  goal?: string | null;
  finalText?: string | null;
  notes?: string | null;
};

export type PublishPackageSummaryTaskContext = {
  id: string;
  inputContextSummary: string;
  outputText?: string | null;
  completedAt?: Date | null;
};

export type RecentPublishTitleContext = {
  selectedTitle?: string | null;
  titleCandidatesJson?: string | null;
};

export type PublishPackageContextInput = {
  project: PublishPackageProjectContext;
  setting?: PublishPackageSettingContext | null;
  chapter: PublishPackageChapterContext;
  latestSummaryTask?: PublishPackageSummaryTaskContext | null;
  recentPublishPackages: readonly RecentPublishTitleContext[];
};

export type BuiltPublishPackageContext = {
  inputText: string;
  inputJson: Record<string, unknown>;
  inputContextSummary: string;
};

export type PublishPackageSuggestion = {
  titleCandidates: string[];
  selectedTitle?: string;
  openingGuide?: string;
  chapterSummary?: string;
  endingQuestion?: string;
  nextChapterPreview?: string;
  commentGuide?: string;
  collectionTitle?: string;
  coverPrompt?: string;
  markdownBody: string;
  checklist: string[];
  payload: Record<string, unknown>;
};

const finalTextPreviewMaxLength = 1200;

export function buildPublishPackageContext(
  input: PublishPackageContextInput,
): BuiltPublishPackageContext {
  const sourceText = confirmedChapterText(input.chapter);
  const settingItems = buildSettingItems(input.setting);
  const summaryOutput = clean(input.latestSummaryTask?.outputText);
  const recentTitles = collectRecentTitles(input.recentPublishPackages);

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
      notes: clean(input.chapter.notes),
      finalTextLength: sourceText.length,
      finalTextPreview: clipText(sourceText, finalTextPreviewMaxLength),
    },
    latestSummaryTask: input.latestSummaryTask
      ? {
          id: input.latestSummaryTask.id,
          inputContextSummary: input.latestSummaryTask.inputContextSummary,
          outputText: clipText(summaryOutput, 2000),
        }
      : null,
    setting: Object.fromEntries(settingItems),
    recentTitles,
    outputRequirements: [
      "只输出 JSON，不要输出 Markdown 说明。",
      "标题候选给 10 个，适合微信公众号读者。",
      "开头引导语不能剧透核心反转。",
      "Markdown 发布版必须基于作者确认的 finalText。",
      "不要自动发布到微信公众号。",
    ],
  };

  const inputText = [
    "# 任务",
    `为第 ${input.chapter.chapterNumber} 章《${input.chapter.title}》生成微信公众号发布包装。`,
    "你只生成可复制/导出的发布材料，不得宣称已经自动发布。",
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
    "# 当前设定中与发布相关的信息",
    settingItems.length > 0
      ? settingItems
          .map(([name, value]) => `- ${settingLabel(name)}(${name}): ${value}`)
          .join("\n")
      : "未填写项目设定。",
    "",
    "# 本章摘要任务输出",
    summaryOutput || "暂无章节摘要任务输出。请从最终正文中提炼不剧透的摘要。",
    "",
    "# 最近 5 个已发布标题风格",
    recentTitles.length > 0
      ? recentTitles.map((title) => `- ${title}`).join("\n")
      : "暂无历史发布标题。",
    "",
    "# 本章元信息",
    lines([
      ["章节目标", input.chapter.goal],
      ["作者备注", input.chapter.notes],
    ]),
    "",
    "# 作者确认的最终正文",
    sourceText || "未填写最终正文。禁止基于草稿正文生成发布包装。",
    "",
    "# 输出 JSON 字段",
    "- title_candidates: 标题候选 10 个。",
    "- opening_guide: 开头引导语，不能剧透核心反转。",
    "- chapter_summary: 面向读者的本章简短摘要。",
    "- ending_question: 章节末尾互动问题。",
    "- next_chapter_preview: 下章预告。",
    "- comment_guide: 评论区引导。",
    "- collection_title: 合集标题建议。",
    "- cover_prompt: 封面图提示词。",
    "- markdown_body: 可直接复制到公众号编辑器的 Markdown 发布版。",
    "- checklist: 发布前检查清单。",
  ].join("\n");

  return {
    inputText,
    inputJson,
    inputContextSummary: buildPublishPackageContextSummary(input),
  };
}

export function buildPublishPackageContextSummary(
  input: PublishPackageContextInput,
) {
  const sourceText = confirmedChapterText(input.chapter);
  const recentTitles = collectRecentTitles(input.recentPublishPackages);

  return [
    `第 ${input.chapter.chapterNumber} 章《${input.chapter.title}》公众号发布包装`,
    sourceText ? `定稿 ${sourceText.length} 字` : "缺少定稿正文",
    input.latestSummaryTask ? "包含章节摘要任务" : "无章节摘要任务",
    `历史标题 ${recentTitles.length} 个`,
  ].join("；");
}

export function parsePublishPackageOutput(
  outputText?: string | null,
  fallback?: {
    chapterTitle?: string | null;
    finalText?: string | null;
  },
): PublishPackageSuggestion | null {
  const parsed = parseJsonPayload(outputText);

  if (!isRecord(parsed)) {
    return null;
  }

  const titleCandidates = arrayValue(
    parsed.title_candidates ?? parsed.titleCandidates ?? parsed.titles,
  )
    .map((value) => clean(String(value)))
    .filter(Boolean);
  const selectedTitle =
    clean(
      stringValue(parsed.selectedTitle) ??
        stringValue(parsed.selected_title) ??
        stringValue(parsed.title),
    ) ||
    titleCandidates[0] ||
    clean(fallback?.chapterTitle);
  const openingGuide = clean(
    stringValue(parsed.opening_guide) ??
      stringValue(parsed.openingGuide) ??
      stringValue(parsed.intro),
  );
  const chapterSummary = clean(
    stringValue(parsed.chapter_summary) ??
      stringValue(parsed.chapterSummary) ??
      stringValue(parsed.summary),
  );
  const endingQuestion = clean(
    stringValue(parsed.ending_question) ??
      stringValue(parsed.endingQuestion) ??
      stringValue(parsed.interactionQuestion),
  );
  const nextChapterPreview = clean(
    stringValue(parsed.next_chapter_preview) ??
      stringValue(parsed.nextChapterPreview) ??
      stringValue(parsed.preview),
  );
  const commentGuide = clean(
    stringValue(parsed.comment_guide) ??
      stringValue(parsed.commentGuide) ??
      stringValue(parsed.commentPrompt),
  );
  const collectionTitle = clean(
    stringValue(parsed.collection_title) ?? stringValue(parsed.collectionTitle),
  );
  const coverPrompt = clean(
    stringValue(parsed.cover_prompt) ??
      stringValue(parsed.coverPrompt) ??
      stringValue(parsed.coverImagePrompt),
  );
  const checklist = arrayValue(parsed.checklist ?? parsed.publish_checklist)
    .map((value) => clean(String(value)))
    .filter(Boolean);
  const markdownBody =
    clean(
      stringValue(parsed.markdown_body) ??
        stringValue(parsed.markdownBody) ??
        stringValue(parsed.markdown),
    ) ||
    buildPublishMarkdown({
      selectedTitle,
      openingGuide,
      chapterSummary,
      finalText: fallback?.finalText,
      endingQuestion,
      nextChapterPreview,
      commentGuide,
    });

  if (!markdownBody && titleCandidates.length === 0) {
    return null;
  }

  return {
    titleCandidates,
    selectedTitle: selectedTitle || undefined,
    openingGuide: openingGuide || undefined,
    chapterSummary: chapterSummary || undefined,
    endingQuestion: endingQuestion || undefined,
    nextChapterPreview: nextChapterPreview || undefined,
    commentGuide: commentGuide || undefined,
    collectionTitle: collectionTitle || undefined,
    coverPrompt: coverPrompt || undefined,
    markdownBody,
    checklist,
    payload: parsed,
  };
}

function collectRecentTitles(packages: readonly RecentPublishTitleContext[]) {
  const titles: string[] = [];

  for (const item of packages) {
    const selectedTitle = clean(item.selectedTitle);

    if (selectedTitle) {
      titles.push(selectedTitle);
      continue;
    }

    for (const title of parseTitleCandidates(item.titleCandidatesJson)) {
      titles.push(title);
    }
  }

  return [...new Set(titles)].slice(0, 5);
}

function parseTitleCandidates(value?: string | null) {
  const cleaned = clean(value);

  if (!cleaned) {
    return [];
  }

  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed)
      ? parsed.map((item) => clean(String(item))).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function buildSettingItems(setting?: PublishPackageSettingContext | null) {
  if (!setting) {
    return [];
  }

  const publishRelevantFields: ProjectSettingFieldName[] = [
    "targetAudience",
    "sellingPoint",
    "pleasureMechanism",
    "forbiddenItems",
    "styleSample",
    "wechatPositioning",
    "emotionalTone",
    "readerExpectation",
    "commercialHook",
    "sensitiveContentRules",
  ];

  return publishRelevantFields
    .map((fieldName) => [fieldName, clipText(setting[fieldName])] as const)
    .filter(([, value]) => Boolean(value));
}

function lines(items: readonly (readonly [string, string | number | null | undefined])[]) {
  return items
    .map(([label, value]) => `- ${label}: ${clean(String(value ?? "")) || "未填写"}`)
    .join("\n");
}

function settingLabel(name: ProjectSettingFieldName) {
  return projectSettingFields.find((field) => field.name === name)?.label ?? name;
}

function parseJsonPayload(value?: string | null) {
  const cleaned = clean(value);

  if (!cleaned) {
    return null;
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);

    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[1].trim());
    } catch {
      return null;
    }
  }
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function clean(value?: string | null) {
  return value?.trim().replace(/\n{3,}/g, "\n\n") ?? "";
}

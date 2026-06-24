import { clipText } from "./chapter-beats";
import {
  normalizeWechatChapterBody,
  selectWechatLayoutSource,
  type WechatLayoutChapter,
  type WechatLayoutSource,
} from "@/lib/wechat-layout-export";
import {
  projectSettingFields,
  type ProjectSettingFieldName,
} from "@/lib/project-setting-fields";

export const wechatLayoutCandidateTemplateKey =
  "wechat_layout_candidate_generation";
export const wechatLayoutCandidateTaskType =
  "wechat_layout_candidate_generation";

export type WechatLayoutCandidateProjectContext = {
  title: string;
  genre?: string | null;
  targetAudience?: string | null;
  platform?: string | null;
  description?: string | null;
  wechatPositioning?: string | null;
};

export type WechatLayoutCandidateSettingContext = Partial<
  Record<ProjectSettingFieldName, string | null>
>;

export type WechatLayoutCandidateChapterContext = WechatLayoutChapter & {
  chapterNumber: number | null;
  goal?: string | null;
  notes?: string | null;
};

export type WechatLayoutCandidateContextInput = {
  chapter: WechatLayoutCandidateChapterContext;
  project: WechatLayoutCandidateProjectContext;
  setting?: WechatLayoutCandidateSettingContext | null;
};

export type WechatLayoutCandidateContext = {
  inputContextSummary: string;
  inputJson: {
    chapter: {
      id: string;
      chapterNumber: number | null;
      sourceKind: WechatLayoutSource["kind"];
      sourceLength: number;
      sourcePreviewWasClipped: boolean;
      title: string;
    };
    project: WechatLayoutCandidateProjectContext;
    setting: Record<string, string>;
  };
  inputText: string;
};

export type WechatLayoutCandidateSuggestion = {
  commentGuide: string;
  endingFollowHook: string;
  interactionQuestion: string;
  nextChapterPreview: string;
  openingGuide: string;
  selectedTitle: string;
  titleCandidates: string[];
};

const sourcePreviewMaxLength = 6000;

export function buildWechatLayoutCandidateContext(
  input: WechatLayoutCandidateContextInput,
): WechatLayoutCandidateContext | null {
  const source = selectWechatLayoutSource(input.chapter);

  if (!source) {
    return null;
  }

  const normalizedBody = normalizeWechatChapterBody(
    source.text,
    input.chapter,
  );
  const sourcePreview = clipText(normalizedBody, sourcePreviewMaxLength);
  const setting = compactSetting(input.setting);
  const chapterLabel = input.chapter.chapterNumber
    ? `第 ${input.chapter.chapterNumber} 章《${input.chapter.title}》`
    : `《${input.chapter.title}》`;
  const inputJson = {
    project: input.project,
    setting,
    chapter: {
      id: input.chapter.id,
      chapterNumber: input.chapter.chapterNumber,
      title: input.chapter.title,
      sourceKind: source.kind,
      sourceLength: normalizedBody.length,
      sourcePreviewWasClipped: normalizedBody.length > sourcePreviewMaxLength,
    },
  };

  return {
    inputContextSummary: `${input.project.title} ${chapterLabel} 公众号排版开头/结尾候选；来源 ${source.label} ${normalizedBody.length} 字`,
    inputJson,
    inputText: [
      `# 任务：生成公众号排版开头/结尾候选`,
      "",
      `请为《${input.project.title}》${chapterLabel}生成可审阅的公众号排版候选。`,
      "",
      "## 硬性规则",
      "- 默认模式是“只排版，不改文”。",
      "- 只生成标题、开头引导语和结尾追更钩子等候选，不重写正文。",
      "- 不要宣称已经发布、已经写入正文或已经修改正式故事记忆。",
      "- 输出必须是 JSON，不要包裹 Markdown 代码块。",
      "",
      "## 输出 JSON 字段",
      "- title_candidates: 3-5 个公众号标题候选。",
      "- selected_title: 你推荐默认填入表单的标题。",
      "- opening_guide: 适合放在正文前的一小段引导语，避免剧透过重。",
      "- ending_follow_hook: 适合放在正文后的追更钩子，鼓励关注下一章。",
      "- interaction_question: 可选互动问题。",
      "- next_chapter_preview: 可选下章预告。",
      "- comment_guide: 可选评论引导。",
      "",
      "## 项目信息",
      formatRecord(input.project),
      "",
      "## 总设定摘要",
      formatRecord(setting),
      "",
      "## 章节信息",
      formatRecord({
        chapterNumber: input.chapter.chapterNumber,
        title: input.chapter.title,
        goal: input.chapter.goal,
        notes: input.chapter.notes,
        source: source.label,
      }),
      "",
      "## 正文预览",
      sourcePreview,
    ].join("\n"),
  };
}

export function parseWechatLayoutCandidateOutput(
  outputText?: string | null,
): WechatLayoutCandidateSuggestion | null {
  const payload = parseJsonObject(outputText);

  if (!payload) {
    return null;
  }

  const titleCandidates = stringArray(
    payload.title_candidates ?? payload.titleCandidates,
  ).slice(0, 5);
  const selectedTitle = stringValue(
    payload.selected_title ?? payload.selectedTitle ?? titleCandidates[0],
  );
  const openingGuide = stringValue(
    payload.opening_guide ?? payload.openingGuide,
  );
  const interactionQuestion = stringValue(
    payload.interaction_question ??
      payload.interactionQuestion ??
      payload.ending_question ??
      payload.endingQuestion,
  );
  const nextChapterPreview = stringValue(
    payload.next_chapter_preview ??
      payload.nextChapterPreview ??
      payload.preview,
  );
  const commentGuide = stringValue(payload.comment_guide ?? payload.commentGuide);
  const endingFollowHook =
    stringValue(payload.ending_follow_hook ?? payload.endingFollowHook) ||
    [interactionQuestion, nextChapterPreview, commentGuide]
      .filter(Boolean)
      .join("\n\n");

  if (!selectedTitle && !openingGuide && !endingFollowHook) {
    return null;
  }

  return {
    commentGuide,
    endingFollowHook,
    interactionQuestion,
    nextChapterPreview,
    openingGuide,
    selectedTitle,
    titleCandidates,
  };
}

function compactSetting(
  setting?: WechatLayoutCandidateSettingContext | null,
): Record<string, string> {
  if (!setting) {
    return {};
  }

  return Object.fromEntries(
    projectSettingFields
      .map((field) => [field.name, clipText(setting[field.name], 700)] as const)
      .filter(([, value]) => Boolean(value)),
  );
}

function formatRecord(record: Record<string, unknown>) {
  const lines = Object.entries(record)
    .map(([key, value]) => {
      const text = stringValue(value);
      return text ? `- ${key}: ${text}` : "";
    })
    .filter(Boolean);

  return lines.length > 0 ? lines.join("\n") : "未设置";
}

function parseJsonObject(value?: string | null): Record<string, unknown> | null {
  const cleaned = stringValue(value);

  if (!cleaned) {
    return null;
  }

  const candidates = [
    cleaned,
    cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, ""),
    cleaned.slice(cleaned.indexOf("{"), cleaned.lastIndexOf("}") + 1),
  ].filter((candidate) => candidate.trim().startsWith("{"));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(stringValue).filter(Boolean);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

import { createHash } from "node:crypto";
import {
  buildProjectCoverPayload,
  type ProjectCoverPayload,
} from "./project-cover-assets";
import type { ProjectExportData } from "./project-export";

export const publishPlatformOptions = [
  {
    value: "station_cat",
    label: "Station Cat 个人网站",
    defaultName: "Station Cat 作品后台",
  },
  {
    value: "wechat",
    label: "微信公众号",
    defaultName: "微信公众号手动发布",
  },
] as const;

export const publishModeOptions = [
  { value: "draft", label: "导入为草稿" },
  { value: "publish", label: "直接发布" },
] as const;

export type PublishMode = (typeof publishModeOptions)[number]["value"];

export const publishUploadScopeOptions = [
  { value: "all", label: "全部变更" },
  { value: "chapter", label: "指定章节" },
] as const;

export type PublishUploadScope =
  (typeof publishUploadScopeOptions)[number]["value"];

export type StandardPublishChapter = {
  id: string;
  chapterNumber: number | null;
  title: string;
  status: string;
  wordCount: number;
  body: string;
  updatedAt: string | null;
};

export type StandardPublishPackage = {
  format: "novelforge-standard-publish-package";
  version: 1;
  generatedAt: string;
  project: {
    id: string;
    title: string;
    genre: string;
    targetAudience: string;
    platform: string;
    description: string;
    status: string;
    totalWordTarget: number | null;
  };
  chapters: StandardPublishChapter[];
  cover: ProjectCoverPayload;
  pricingSuggestion: {
    strategy: "free_serial_first" | "paid_archive_ready";
    currency: "CNY";
    suggestedPriceCents: number | null;
    notes: string;
  };
};

export type PublishSyncItem = {
  localType: "project" | "cover" | "chapter";
  localId: string;
  label: string;
  contentHash: string;
  payload: unknown;
};

export type PreviousPublishSyncState = {
  localType: string;
  localId: string;
  contentHash: string;
  remoteId?: string | null;
};

export type PublishChangedItem = PublishSyncItem & {
  remoteId?: string | null;
  changeType: "create" | "update";
};

export function platformLabel(value?: string | null) {
  return (
    publishPlatformOptions.find((option) => option.value === value)?.label ??
    "自定义网站"
  );
}

export function publishModeLabel(value?: string | null) {
  return (
    publishModeOptions.find((option) => option.value === value)?.label ??
    "导入为草稿"
  );
}

export function normalizePublishMode(value?: string | null): PublishMode {
  return value === "publish" ? "publish" : "draft";
}

export function normalizePublishUploadScope(
  value?: string | null,
): PublishUploadScope {
  return value === "chapter" ? "chapter" : "all";
}

export function publishUploadScopeLabel(value?: string | null) {
  return (
    publishUploadScopeOptions.find((option) => option.value === value)?.label ??
    "全部变更"
  );
}

export function maskPublishToken(token?: string | null) {
  const cleanToken = token?.trim() ?? "";

  if (!cleanToken) {
    return "未保存";
  }

  if (cleanToken.length <= 8) {
    return `${cleanToken.slice(0, 2)}...${cleanToken.slice(-2)}`;
  }

  return `${cleanToken.slice(0, 6)}...${cleanToken.slice(-4)}`;
}

export function buildStandardPublishPackage(
  data: ProjectExportData,
  options: { generatedAt?: string } = {},
): StandardPublishPackage {
  const chapters = (data.chapters ?? []).map((chapter) => {
    const chapterNumber = numberValue(chapter.chapterNumber);
    const title = stringValue(chapter.title) || "未命名章节";
    const body = cleanChapterBodyForPublish(stringValue(chapter.finalText), {
      chapterNumber,
      title,
    });

    return {
      id: stringValue(chapter.id) || `chapter-${stringValue(chapter.chapterNumber)}`,
      chapterNumber,
      title,
      status: stringValue(chapter.status) || "draft",
      wordCount: numberValue(chapter.wordCount) ?? countTextWords(body),
      body,
      updatedAt: dateString(chapter.updatedAt),
    };
  });
  const confirmedChapters = chapters.filter((chapter) => chapter.body);
  const totalWords = confirmedChapters.reduce(
    (sum, chapter) => sum + chapter.wordCount,
    0,
  );

  return {
    format: "novelforge-standard-publish-package",
    version: 1,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    project: {
      id: stringValue(data.project.id),
      title: stringValue(data.project.title) || "未命名项目",
      genre: stringValue(data.project.genre),
      targetAudience: stringValue(data.project.targetAudience),
      platform: stringValue(data.project.platform),
      description: stringValue(data.project.description),
      status: stringValue(data.project.status) || "active",
      totalWordTarget: numberValue(data.project.totalWordTarget),
    },
    chapters,
    cover: buildProjectCoverPayload(
      data.project,
      latestCoverPrompt(data.publishPackages),
    ),
    pricingSuggestion: buildPricingSuggestion({
      chapterCount: confirmedChapters.length,
      totalWords,
    }),
  };
}

export function buildPublishSyncItems(
  publishPackage: StandardPublishPackage,
): PublishSyncItem[] {
  const projectPayload = {
    ...publishPackage.project,
    pricingSuggestion: publishPackage.pricingSuggestion,
  };

  return [
    {
      localType: "project",
      localId: publishPackage.project.id || "project",
      label: `小说元信息：${publishPackage.project.title}`,
      contentHash: hashPublishPayload(projectPayload),
      payload: projectPayload,
    },
    {
      localType: "cover",
      localId: `${publishPackage.project.id || "project"}:cover`,
      label: "封面图与封面提示词",
      contentHash: hashPublishPayload(publishPackage.cover),
      payload: publishPackage.cover,
    },
    ...publishPackage.chapters.map((chapter) => ({
      localType: "chapter" as const,
      localId: chapter.id,
      label: `第 ${chapter.chapterNumber ?? "?"} 章：${chapter.title}`,
      contentHash: hashPublishPayload(chapter),
      payload: chapter,
    })),
  ];
}

export function diffPublishSyncItems(
  items: readonly PublishSyncItem[],
  previousStates: readonly PreviousPublishSyncState[],
): PublishChangedItem[] {
  const stateByKey = new Map(
    previousStates.map((state) => [
      syncKey(state.localType, state.localId),
      state,
    ]),
  );

  return items.flatMap((item) => {
    const previousState = stateByKey.get(syncKey(item.localType, item.localId));

    if (previousState?.contentHash === item.contentHash) {
      return [];
    }

    return [
      {
        ...item,
        remoteId: previousState?.remoteId ?? null,
        changeType: previousState ? "update" : "create",
      },
    ];
  });
}

export function filterPublishChangedItemsByUploadScope(
  items: readonly PublishChangedItem[],
  scope: PublishUploadScope,
  chapterId?: string | null,
): PublishChangedItem[] {
  if (scope !== "chapter") {
    return [...items];
  }

  const cleanChapterId = chapterId?.trim();

  if (!cleanChapterId) {
    return [];
  }

  return items.filter(
    (item) => item.localType === "chapter" && item.localId === cleanChapterId,
  );
}

export function stringifyStandardPublishPackage(
  publishPackage: StandardPublishPackage,
) {
  return `${stableStringify(publishPackage)}\n`;
}

export function cleanChapterBodyForPublish(
  value: string,
  chapter: {
    chapterNumber?: number | null;
    title?: string | null;
  } = {},
) {
  const lines = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const cleanedLines = stripLeadingChapterDecorations(lines, chapter).filter(
    (line) => !isBeatStructureHeading(line),
  );

  return collapseExcessBlankLines(cleanedLines).join("\n").trim();
}

function stripLeadingChapterDecorations(
  lines: string[],
  chapter: {
    chapterNumber?: number | null;
    title?: string | null;
  },
) {
  const result = [...lines];

  stripLeadingBlankLines(result);

  if (isChapterMarkdownTitle(result[0], chapter)) {
    result.shift();
    stripLeadingBlankLines(result);
  }

  if (isMarkdownDivider(result[0])) {
    result.shift();
    stripLeadingBlankLines(result);
  }

  return result;
}

function stripLeadingBlankLines(lines: string[]) {
  while (lines[0]?.trim() === "") {
    lines.shift();
  }
}

function isChapterMarkdownTitle(
  line: string | undefined,
  chapter: {
    chapterNumber?: number | null;
    title?: string | null;
  },
) {
  const text = line?.trim() ?? "";

  if (!/^#{1,2}\s+/.test(text)) {
    return false;
  }

  const heading = text.replace(/^#{1,2}\s+/, "").trim();
  const title = chapter.title?.trim();
  const chapterNumber = chapter.chapterNumber;

  if (title && heading.includes(title)) {
    return true;
  }

  return chapterNumber != null && heading.includes(`第${chapterNumber}章`);
}

function isMarkdownDivider(line: string | undefined) {
  return /^-{3,}$/.test(line?.trim() ?? "");
}

function isBeatStructureHeading(line: string) {
  const text = line.trim();

  if (!/^#{1,6}\s+/.test(text)) {
    return false;
  }

  const heading = text.replace(/^#{1,6}\s+/, "").trim();

  return /(?:开场钩子|收束钩子|结尾钩子|节拍\s*[\d一二三四五六七八九十]+)/.test(
    heading,
  );
}

function collapseExcessBlankLines(lines: string[]) {
  const result: string[] = [];
  let blankCount = 0;

  for (const line of lines) {
    if (line.trim() === "") {
      blankCount += 1;

      if (blankCount <= 2) {
        result.push(line);
      }

      continue;
    }

    blankCount = 0;
    result.push(line);
  }

  return result;
}

function buildPricingSuggestion({
  chapterCount,
  totalWords,
}: {
  chapterCount: number;
  totalWords: number;
}): StandardPublishPackage["pricingSuggestion"] {
  if (chapterCount >= 30 && totalWords >= 90000) {
    return {
      strategy: "paid_archive_ready",
      currency: "CNY",
      suggestedPriceCents: 990,
      notes: "已有较多定稿内容，可考虑合集/存档付费；连载最新章仍建议先免费积累读者。",
    };
  }

  return {
    strategy: "free_serial_first",
    currency: "CNY",
    suggestedPriceCents: null,
    notes: "当前更适合免费连载导入，优先积累连续阅读和评论反馈，完结或形成合集后再定价。",
  };
}

function latestCoverPrompt(publishPackages?: readonly Record<string, unknown>[]) {
  const latest = publishPackages?.find((item) => stringValue(item.coverPrompt));

  return latest ? stringValue(latest.coverPrompt) : "";
}

export function hashPublishPayload(payload: unknown) {
  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function stableStringify(value: unknown) {
  return JSON.stringify(sortForStableStringify(value), null, 2);
}

function sortForStableStringify(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortForStableStringify);
  }

  if (typeof value === "object" && value !== null && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, entryValue]) => [key, sortForStableStringify(entryValue)]),
    );
  }

  return value instanceof Date ? value.toISOString() : value;
}

function syncKey(localType: string, localId: string) {
  return `${localType}:${localId}`;
}

function stringValue(value: unknown) {
  if (value == null) {
    return "";
  }

  if (
    Array.isArray(value) ||
    (typeof value === "object" && !(value instanceof Date))
  ) {
    return "";
  }

  return value instanceof Date ? value.toISOString() : String(value).trim();
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function dateString(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return stringValue(value) || null;
}

function countTextWords(value: unknown) {
  return stringValue(value).replace(/\s/g, "").length;
}

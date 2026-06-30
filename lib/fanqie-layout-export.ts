export const fanqieLayoutTemplateOptions = [
  {
    value: "body",
    label: "番茄正文粘贴版",
    description: "不含章节标题，适合直接粘贴到番茄章节正文。",
  },
  {
    value: "split_txt",
    label: "番茄分章 TXT 包",
    description: "按目标字数拆分为多个 TXT，适合长章拆上传。",
  },
] as const;

export type FanqieLayoutTemplate =
  (typeof fanqieLayoutTemplateOptions)[number]["value"];

export type FanqieSourceKind = "auto" | "polished" | "final" | "draft";

export type FanqieLayoutChapter = {
  id: string;
  chapterNumber: number | null;
  title: string;
  draftText?: string | null;
  finalText?: string | null;
  polishedText?: string | null;
};

export type FanqieLayoutSource = {
  kind: Exclude<FanqieSourceKind, "auto">;
  label: string;
  text: string;
};

export type FanqieLayoutExportInput = {
  chapter: FanqieLayoutChapter;
  includeTitle?: boolean;
  projectTitle: string;
  sourceKind?: FanqieSourceKind;
  targetWordCount?: number;
  template: FanqieLayoutTemplate;
};

export type FanqieLayoutExport = {
  body: string;
  filenameBase: string;
  manifest: string;
  plainText: string;
  source: FanqieLayoutSource | null;
  splitParts: FanqieSplitPart[];
  title: string;
  validation: FanqieExportValidation;
  wordCount: number;
};

export type FanqieSplitOptions = {
  chapter: Pick<FanqieLayoutChapter, "chapterNumber" | "title">;
  includeTitleInBody?: boolean;
  projectTitle?: string | null;
  targetWordCount?: number;
};

export type FanqieSplitPart = {
  body: string;
  chapterNumber: number;
  fileName: string;
  title: string;
  wordCount: number;
};

export type FanqieExportValidation = {
  exceedsTargetWordCount: boolean;
  hasChapterTitle: boolean;
  hasCompletionMarker: boolean;
  hasMarkdownArtifacts: boolean;
  hasWebTail: boolean;
  isBelowSuggestedWordCount: boolean;
  messages: string[];
  sourceLabel: string;
  splitCount: number;
  wordCount: number;
};

const defaultTargetWordCount = 4000;
const targetWordCountMin = 500;
const targetWordCountMax = 20000;
const chineseSectionPrefix =
  "(?:[一二三四五六七八九十百]+|[0-9]+)[、.．]";

export function selectFanqieLayoutSource(
  chapter: FanqieLayoutChapter,
  sourceKind: FanqieSourceKind = "auto",
): FanqieLayoutSource | null {
  if (sourceKind !== "auto") {
    return sourceByKind(chapter, sourceKind);
  }

  return (
    sourceByKind(chapter, "polished") ??
    sourceByKind(chapter, "final") ??
    sourceByKind(chapter, "draft")
  );
}

export function buildFanqieLayoutExport(
  input: FanqieLayoutExportInput,
): FanqieLayoutExport {
  const source = selectFanqieLayoutSource(
    input.chapter,
    input.sourceKind ?? "auto",
  );
  const targetWordCount = normalizeTargetWordCount(input.targetWordCount);
  const body = source
    ? normalizeFanqieChapterBody(source.text, input.chapter, {
        includeTitle: Boolean(input.includeTitle),
      })
    : "";
  const splitParts =
    input.template === "split_txt" && body
      ? splitFanqieChapterText(body, {
          chapter: input.chapter,
          includeTitleInBody: Boolean(input.includeTitle),
          projectTitle: input.projectTitle,
          targetWordCount,
        })
      : [];
  const manifest =
    input.template === "split_txt" && splitParts.length > 0
      ? buildFanqieSplitManifest({
          includeTitleInBody: Boolean(input.includeTitle),
          parts: splitParts,
          projectTitle: input.projectTitle,
        })
      : "";
  const wordCount = countCjkAwareWords(body);
  const validation = validateFanqieExport({
    body,
    chapter: input.chapter,
    rawText: source?.text,
    sourceLabel: source?.label ?? "无正文",
    splitCount: splitParts.length,
    targetWordCount,
  });

  return {
    body,
    filenameBase: safeFilename(
      `${input.projectTitle || "novelforge"}-${
        input.chapter.chapterNumber
          ? `chapter-${input.chapter.chapterNumber}`
          : input.chapter.id || "chapter"
      }-fanqie`,
    ),
    manifest,
    plainText: body,
    source,
    splitParts,
    title: defaultFanqieChapterTitle(input.chapter),
    validation,
    wordCount,
  };
}

export function normalizeFanqieChapterBody(
  value: string,
  chapter: {
    chapterNumber?: number | null;
    title?: string | null;
  } = {},
  options: {
    includeTitle?: boolean;
    removeSectionHeadings?: boolean;
  } = {},
) {
  const lines = value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd());
  const bodyLines = stripLeadingChapterDecorations(lines, chapter)
    .map((line) => normalizeMarkdownLine(line))
    .map((line) => stripInlineCompletionMarker(line))
    .filter((line) => !shouldRemoveFanqieLine(line));
  const normalizedLines = normalizeFanqieSpacing(
    options.removeSectionHeadings
      ? bodyLines.filter((line) => !isSectionHeading(line))
      : bodyLines,
  );
  const body = normalizedLines.join("\n").trim();

  if (!options.includeTitle || !body) {
    return body;
  }

  return [defaultFanqieChapterTitle(chapter), "", body].join("\n");
}

export function splitFanqieChapterText(
  value: string,
  options: FanqieSplitOptions,
): FanqieSplitPart[] {
  const targetWordCount = normalizeTargetWordCount(options.targetWordCount);
  const body = normalizeFanqieChapterBody(value, options.chapter, {
    includeTitle: false,
  });
  const totalWordCount = countCjkAwareWords(body);

  if (!body) {
    return [];
  }

  if (totalWordCount <= Math.ceil(targetWordCount * 1.2)) {
    return [
      buildSplitPart({
        body,
        chapterNumber: options.chapter.chapterNumber ?? 1,
        fallbackTitle: clean(options.chapter.title) || "正文",
        includeTitleInBody: Boolean(options.includeTitleInBody),
      }),
    ];
  }

  const paragraphs = body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const parts: string[][] = [];
  let current: string[] = [];
  let currentCount = 0;
  const lowerBound = Math.floor(targetWordCount * 0.8);
  const upperBound = Math.ceil(targetWordCount * 1.2);

  for (const paragraph of paragraphs) {
    const paragraphCount = countCjkAwareWords(paragraph);
    const nextCount = currentCount + paragraphCount;
    const canClose =
      current.length > 0 &&
      currentCount >= lowerBound &&
      (nextCount > upperBound || isNaturalBreakAfter(lastItem(current) ?? ""));

    if (canClose) {
      parts.push(current);
      current = [];
      currentCount = 0;
    }

    current.push(paragraph);
    currentCount += paragraphCount;

    if (currentCount >= upperBound) {
      parts.push(current);
      current = [];
      currentCount = 0;
    }
  }

  if (current.length > 0) {
    parts.push(current);
  }

  const startChapterNumber = options.chapter.chapterNumber ?? 1;

  return parts.map((part, index) =>
    buildSplitPart({
      body: part.join("\n\n"),
      chapterNumber: startChapterNumber + index,
      fallbackTitle: clean(options.chapter.title) || `第${index + 1}节`,
      includeTitleInBody: Boolean(options.includeTitleInBody),
    }),
  );
}

export function buildFanqieSplitManifest({
  includeTitleInBody = false,
  parts,
  projectTitle,
}: {
  includeTitleInBody?: boolean;
  parts: readonly FanqieSplitPart[];
  projectTitle: string;
}) {
  const project = clean(projectTitle) || "本书";
  const items = parts.map(
    (part) =>
      `- 第${padChapterNumber(part.chapterNumber)}章《${part.title}》：${part.wordCount.toLocaleString()} 字，文件：${part.fileName}`,
  );

  return [
    `# ${project} 番茄版拆分清单`,
    "",
    includeTitleInBody
      ? "说明：正文文件已包含章节标题。上传番茄时，可按后台规则决定是否保留正文内标题。"
      : "说明：正文文件默认不含标题。上传番茄时，把文件名里的标题填到章节标题栏，正文直接复制 TXT 内容。",
    "",
    ...items,
  ]
    .join("\n")
    .trim();
}

export function validateFanqieExport({
  body,
  chapter,
  rawText,
  sourceLabel = "无正文",
  splitCount = 0,
  targetWordCount,
}: {
  body: string;
  chapter?: {
    chapterNumber?: number | null;
    title?: string | null;
  };
  rawText?: string | null;
  sourceLabel?: string;
  splitCount?: number;
  targetWordCount?: number;
}): FanqieExportValidation {
  const target = normalizeTargetWordCount(targetWordCount);
  const textForArtifactCheck = clean(rawText) || body;
  const wordCount = countCjkAwareWords(body);
  const hasChapterTitle = containsChapterTitle(body, chapter);
  const hasMarkdownArtifacts = containsMarkdownArtifacts(textForArtifactCheck);
  const hasCompletionMarker = containsCompletionMarker(textForArtifactCheck);
  const hasWebTail = containsWebTail(textForArtifactCheck);
  const isBelowSuggestedWordCount = wordCount > 0 && wordCount < target * 0.8;
  const exceedsTargetWordCount = wordCount > target * 1.2;
  const messages = [
    hasChapterTitle ? "正文中包含章节标题，确认是否需要在番茄后台正文区保留。" : "",
    hasMarkdownArtifacts ? "源正文包含 Markdown 痕迹，导出时会做确定性清理。" : "",
    hasCompletionMarker ? "源正文包含章节完结标记，导出时会移除。" : "",
    hasWebTail ? "源正文包含网页阅读尾巴，导出时会移除。" : "",
    isBelowSuggestedWordCount ? "当前正文字数低于目标字数的 80%。" : "",
    exceedsTargetWordCount ? "当前正文字数超过目标字数的 120%，可考虑拆分。" : "",
  ].filter(Boolean);

  return {
    exceedsTargetWordCount,
    hasChapterTitle,
    hasCompletionMarker,
    hasMarkdownArtifacts,
    hasWebTail,
    isBelowSuggestedWordCount,
    messages,
    sourceLabel,
    splitCount,
    wordCount,
  };
}

export function countCjkAwareWords(value: string) {
  const cjkCount = (value.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const otherWords = value
    .replace(/[\u4e00-\u9fff]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return cjkCount + otherWords;
}

export function defaultFanqieChapterTitle(
  chapter: {
    chapterNumber?: number | null;
    title?: string | null;
  },
) {
  const title = clean(chapter.title) || "未命名章节";

  if (chapter.chapterNumber == null) {
    return title;
  }

  return `第${chapter.chapterNumber}章 ${title}`;
}

function sourceByKind(
  chapter: FanqieLayoutChapter,
  kind: Exclude<FanqieSourceKind, "auto">,
): FanqieLayoutSource | null {
  const sourceMap = {
    draft: {
      label: "草稿正文",
      text: clean(chapter.draftText),
    },
    final: {
      label: "定稿正文",
      text: clean(chapter.finalText),
    },
    polished: {
      label: "精修正文",
      text: clean(chapter.polishedText),
    },
  } as const;
  const source = sourceMap[kind];

  if (!source.text) {
    return null;
  }

  return {
    kind,
    label: source.label,
    text: source.text,
  };
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

  while (isChapterTitleLine(result[0], chapter) || isMarkdownDivider(result[0])) {
    result.shift();
    stripLeadingBlankLines(result);
  }

  return result;
}

function normalizeMarkdownLine(line: string) {
  const trimmed = line.trim();

  if (/^#{1,6}\s+/.test(trimmed)) {
    return trimmed.replace(/^#{1,6}\s+/, "").trim();
  }

  if (/^\*\*[^*]+\*\*$/.test(trimmed)) {
    return trimmed.replace(/^\*\*/, "").replace(/\*\*$/, "").trim();
  }

  return line;
}

function normalizeFanqieSpacing(lines: string[]) {
  const result: string[] = [];
  let blankCount = 0;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      blankCount += 1;

      if (blankCount <= 1 && result.length > 0) {
        result.push("");
      }

      continue;
    }

    result.push(line.trim());
    blankCount = 0;
  }

  while (lastItem(result) === "") {
    result.pop();
  }

  return result;
}

function shouldRemoveFanqieLine(line: string) {
  const text = line.trim();

  if (!text) {
    return false;
  }

  return (
    isMarkdownDivider(text) ||
    isFanqieStructureHeading(text) ||
    isWebTailLine(text) ||
    isCompletionMarkerLine(text)
  );
}

function stripInlineCompletionMarker(line: string) {
  return line
    .replace(
      /[（(]\s*第\s*[\d一二三四五六七八九十百千万]+\s*章\s*完\s*[）)]\s*$/u,
      "",
    )
    .trimEnd();
}

function stripLeadingBlankLines(lines: string[]) {
  while (lines[0]?.trim() === "") {
    lines.shift();
  }
}

function isChapterTitleLine(
  line: string | undefined,
  chapter: {
    chapterNumber?: number | null;
    title?: string | null;
  },
) {
  const text = normalizeMarkdownLine(line?.trim() ?? "");
  const compactText = text.replace(/\s+/g, "");
  const title = clean(chapter.title);
  const compactTitle = title.replace(/\s+/g, "");
  const chapterNumber = chapter.chapterNumber;

  if (!text) {
    return false;
  }

  if (/[，。！？；：,.!?;:]/.test(text)) {
    return false;
  }

  if (chapterNumber == null) {
    return Boolean(
      compactTitle &&
        [
          `第${compactTitle}章`,
          `第${compactTitle}`,
          compactTitle,
        ].includes(stripTitleDecorations(compactText)),
    );
  }

  const chineseChapterNumber = numberToChineseNumber(chapterNumber);
  const strippedText = stripTitleDecorations(compactText);

  return [String(chapterNumber), chineseChapterNumber]
    .filter(Boolean)
    .some((numberText) => {
      const marker = `第${numberText}章`;

      return (
        strippedText === marker ||
        (compactTitle && strippedText === `${marker}${compactTitle}`)
      );
    });
}

function containsChapterTitle(
  value: string,
  chapter?: {
    chapterNumber?: number | null;
    title?: string | null;
  },
) {
  const lines = value.split("\n").map((line) => line.trim());

  return lines.some((line) => isChapterTitleLine(line, chapter ?? {}));
}

function isMarkdownDivider(line: string | undefined) {
  return /^-{3,}$/.test(line?.trim() ?? "");
}

function containsMarkdownArtifacts(value: string) {
  return value
    .split("\n")
    .some(
      (line) =>
        /^#{1,6}\s+/.test(line.trim()) ||
        /^\*\*[^*]+\*\*$/.test(line.trim()) ||
        isMarkdownDivider(line),
    );
}

function isFanqieStructureHeading(line: string) {
  return /^(?:(?:【?开场钩子】?|【?收束钩子】?|【?结尾钩子】?)(?:\s*节拍\s*[\d一二三四五六七八九十]+)?|节拍\s*[\d一二三四五六七八九十]+|本章目标|剧情动作|核心事件|章节范围|写作要求|精修目标)[：:]/.test(
    line.trim(),
  );
}

function isWebTailLine(line: string) {
  return /^(?:上一章|下一章|上一页|下一页|返回目录|目录|保存书签|加入书架|书签|推荐票|月票|打赏|评论|下载本章|本章未完，请点击下一页继续阅读)[。.!！\s]*$/.test(
    line.trim(),
  );
}

function containsWebTail(value: string) {
  return value.split("\n").some((line) => isWebTailLine(line));
}

function isCompletionMarkerLine(line: string) {
  return /^[（(]?\s*第\s*[\d一二三四五六七八九十百千万]+\s*章\s*完\s*[）)]?\s*[。.!！]?$/.test(
    line.trim(),
  );
}

function containsCompletionMarker(value: string) {
  return value
    .split("\n")
    .some(
      (line) =>
        isCompletionMarkerLine(line) ||
        /[（(]\s*第\s*[\d一二三四五六七八九十百千万]+\s*章\s*完\s*[）)]\s*$/u.test(
          line.trim(),
        ),
    );
}

function isSectionHeading(line: string) {
  const text = line.trim();

  return (
    new RegExp(`^${chineseSectionPrefix}`).test(text) ||
    /^第[一二三四五六七八九十百0-9]+[节幕段]/.test(text)
  );
}

function buildSplitPart({
  body,
  chapterNumber,
  fallbackTitle,
  includeTitleInBody,
}: {
  body: string;
  chapterNumber: number;
  fallbackTitle: string;
  includeTitleInBody: boolean;
}) {
  const title = deriveSplitTitle(body, fallbackTitle);
  const normalizedBody = includeTitleInBody
    ? [`第${chapterNumber}章 ${title}`, "", body].join("\n")
    : body;

  return {
    body: normalizedBody,
    chapterNumber,
    fileName: `第${padChapterNumber(chapterNumber)}章-${safeFilename(title)}.txt`,
    title,
    wordCount: countCjkAwareWords(body),
  };
}

function deriveSplitTitle(body: string, fallbackTitle: string) {
  const firstParagraph =
    body
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .find(Boolean) ?? fallbackTitle;
  const cleaned = firstParagraph
    .replace(/[“”"「」『』]/g, "")
    .replace(/[，。！？、；：,.!?;:\s]+/g, "")
    .slice(0, 12);

  return cleaned || fallbackTitle || "正文";
}

function isNaturalBreakAfter(paragraph: string) {
  const text = paragraph.trim();

  if (!text) {
    return true;
  }

  if (/[：:]$/.test(text) || /[“「『]$/.test(text)) {
    return false;
  }

  return /[。！？!?」』”]$/.test(text);
}

function normalizeTargetWordCount(value?: number | null) {
  if (!Number.isFinite(value ?? NaN)) {
    return defaultTargetWordCount;
  }

  return Math.min(
    targetWordCountMax,
    Math.max(targetWordCountMin, Math.round(value ?? defaultTargetWordCount)),
  );
}

function safeFilename(value: string) {
  const cleaned = value
    .trim()
    .replace(/[\\/:*?"<>|#%&{}$!'@+`=]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || "fanqie-export";
}

function padChapterNumber(value: number) {
  return String(value).padStart(3, "0");
}

function clean(value?: string | null) {
  return value?.trim() ?? "";
}

function stripTitleDecorations(value: string) {
  return value.replace(/[《》【】（）()「」『』"“”]/g, "");
}

function lastItem<T>(items: readonly T[]) {
  return items[items.length - 1];
}

function numberToChineseNumber(value: number): string {
  if (!Number.isInteger(value) || value <= 0 || value >= 10000) {
    return "";
  }

  const digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

  if (value < 10) {
    return digits[value];
  }

  if (value < 100) {
    const tens = Math.floor(value / 10);
    const ones = value % 10;
    const prefix = tens === 1 ? "" : digits[tens];

    return `${prefix}十${ones > 0 ? digits[ones] : ""}`;
  }

  if (value < 1000) {
    const hundreds = Math.floor(value / 100);
    const rest = value % 100;

    if (rest === 0) {
      return `${digits[hundreds]}百`;
    }

    return `${digits[hundreds]}百${
      rest < 10 ? `零${digits[rest]}` : numberToChineseNumber(rest)
    }`;
  }

  const thousands = Math.floor(value / 1000);
  const rest = value % 1000;

  if (rest === 0) {
    return `${digits[thousands]}千`;
  }

  return `${digits[thousands]}千${
    rest < 100 ? `零${numberToChineseNumber(rest)}` : numberToChineseNumber(rest)
  }`;
}

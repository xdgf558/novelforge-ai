export const wechatLayoutTemplateOptions = [
  {
    value: "body",
    label: "微信公众号正文粘贴版",
    description: "不带重复标题和作者，适合直接粘贴到微信编辑器正文区。",
  },
  {
    value: "complete",
    label: "微信公众号完整发布版",
    description: "包含标题、作者、正文和结尾关注语，适合完整留档或二次编辑。",
  },
] as const;

export type WechatLayoutTemplate =
  (typeof wechatLayoutTemplateOptions)[number]["value"];

export type WechatLayoutChapter = {
  id: string;
  chapterNumber: number | null;
  title: string;
  draftText?: string | null;
  finalText?: string | null;
  polishedText?: string | null;
};

export type WechatLayoutSource = {
  kind: "polished" | "final" | "draft";
  label: string;
  text: string;
};

export type WechatLayoutExportInput = {
  authorName?: string | null;
  chapter: WechatLayoutChapter;
  endingFollowHook?: string | null;
  openingGuide?: string | null;
  projectTitle: string;
  publishTitle?: string | null;
  template: WechatLayoutTemplate;
};

export type WechatLayoutExport = {
  body: string;
  html: string;
  markdown: string;
  plainText: string;
  source: WechatLayoutSource | null;
  title: string;
  wordCount: number;
};

const chineseSectionPrefix =
  "(?:[一二三四五六七八九十百]+|[0-9]+)[、.．]";

export function selectWechatLayoutSource(
  chapter: WechatLayoutChapter,
): WechatLayoutSource | null {
  const polishedText = clean(chapter.polishedText);

  if (polishedText) {
    return {
      kind: "polished",
      label: "精修正文",
      text: polishedText,
    };
  }

  const finalText = clean(chapter.finalText);

  if (finalText) {
    return {
      kind: "final",
      label: "定稿正文",
      text: finalText,
    };
  }

  const draftText = clean(chapter.draftText);

  if (draftText) {
    return {
      kind: "draft",
      label: "草稿正文",
      text: draftText,
    };
  }

  return null;
}

export function defaultWechatPublishTitle(chapter: WechatLayoutChapter) {
  const title = clean(chapter.title) || "未命名章节";

  if (chapter.chapterNumber == null) {
    return title;
  }

  return `第 ${chapter.chapterNumber} 章《${title}》`;
}

export function defaultWechatOpeningGuide({
  chapter,
  projectTitle,
}: {
  chapter: WechatLayoutChapter;
  projectTitle: string;
}) {
  const project = clean(projectTitle) || "本书";
  const title = defaultWechatPublishTitle(chapter);

  return `今天继续更新《${project}》${title}。`;
}

export function defaultWechatEndingFollowHook() {
  return "未完待续。喜欢这个故事的话，记得关注，下一章继续。";
}

export function buildWechatLayoutExport(
  input: WechatLayoutExportInput,
): WechatLayoutExport {
  const source = selectWechatLayoutSource(input.chapter);
  const title =
    clean(input.publishTitle) || defaultWechatPublishTitle(input.chapter);
  const authorName = clean(input.authorName) || "未设置";
  const openingGuide = clean(input.openingGuide);
  const endingFollowHook = clean(input.endingFollowHook);
  const body = source
    ? normalizeWechatChapterBody(source.text, input.chapter)
    : "";
  const bodySections = [openingGuide, body, endingFollowHook].filter(Boolean);
  const plainText =
    input.template === "complete"
      ? [
          title,
          `作者：${authorName}`,
          "",
          ...bodySections.flatMap((section) => [section, ""]),
        ]
          .join("\n")
          .trim()
      : bodySections.join("\n\n").trim();
  const markdown =
    input.template === "complete"
      ? [
          `# ${title}`,
          "",
          `作者：${authorName}`,
          "",
          openingGuide ? `> ${openingGuide}` : "",
          body,
          endingFollowHook ? `---\n\n${endingFollowHook}` : "",
        ]
          .filter(Boolean)
          .join("\n\n")
          .trim()
      : [openingGuide ? `> ${openingGuide}` : "", body, endingFollowHook]
          .filter(Boolean)
          .join("\n\n")
          .trim();

  return {
    body,
    html: buildWechatHtml({
      authorName,
      body,
      endingFollowHook,
      openingGuide,
      template: input.template,
      title,
    }),
    markdown,
    plainText,
    source,
    title,
    wordCount: countCjkAwareWords(body),
  };
}

export function normalizeWechatChapterBody(
  value: string,
  chapter: {
    chapterNumber?: number | null;
    title?: string | null;
  } = {},
) {
  const lines = value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd());
  const cleanedLines = stripLeadingChapterDecorations(lines, chapter)
    .map((line) => normalizeMarkdownLine(line))
    .filter((line) => !isBeatStructureHeading(line));

  return normalizeWechatSpacing(cleanedLines).join("\n").trim();
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

  if (isChapterTitleLine(result[0], chapter)) {
    result.shift();
    stripLeadingBlankLines(result);
  }

  if (isMarkdownDivider(result[0])) {
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

function normalizeWechatSpacing(lines: string[]) {
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

    if (isSectionHeading(line) && result.length > 0 && lastLine(result) !== "") {
      result.push("");
    }

    result.push(line.trim());
    blankCount = 0;

    if (isSectionHeading(line)) {
      result.push("");
      blankCount = 1;
    }
  }

  while (lastLine(result) === "") {
    result.pop();
  }

  return result;
}

function buildWechatHtml({
  authorName,
  body,
  endingFollowHook,
  openingGuide,
  template,
  title,
}: {
  authorName: string;
  body: string;
  endingFollowHook: string;
  openingGuide: string;
  template: WechatLayoutTemplate;
  title: string;
}) {
  const bodyHtml = body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) =>
      isSectionHeading(paragraph)
        ? `<h2>${escapeHtml(paragraph)}</h2>`
        : `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`,
    )
    .join("\n");
  const openingHtml = openingGuide
    ? `<p class="wechat-opening">${escapeHtml(openingGuide)}</p>`
    : "";
  const endingHtml = endingFollowHook
    ? `<p class="wechat-ending">${escapeHtml(endingFollowHook)}</p>`
    : "";
  const core = [openingHtml, bodyHtml, endingHtml].filter(Boolean).join("\n");

  if (template === "body") {
    return `${core}\n`;
  }

  return [
    "<article>",
    `<h1>${escapeHtml(title)}</h1>`,
    `<p class="wechat-author">作者：${escapeHtml(authorName)}</p>`,
    core,
    "</article>",
    "",
  ].join("\n");
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

  if (
    compactTitle &&
    compactText.includes(compactTitle) &&
    /第[\d一二三四五六七八九十百千万]+章/.test(compactText)
  ) {
    return true;
  }

  if (chapterNumber == null) {
    return false;
  }

  const chineseChapterNumber = numberToChineseNumber(chapterNumber);

  return [String(chapterNumber), chineseChapterNumber]
    .filter(Boolean)
    .some((numberText) => compactText.includes(`第${numberText}章`));
}

function isMarkdownDivider(line: string | undefined) {
  return /^-{3,}$/.test(line?.trim() ?? "");
}

function isBeatStructureHeading(line: string) {
  const text = line.trim();

  return /^(?:(?:【?开场钩子】?|【?收束钩子】?|【?结尾钩子】?)(?:\s*节拍\s*[\d一二三四五六七八九十]+)?|节拍\s*[\d一二三四五六七八九十]+)[：:]/.test(
    text,
  );
}

function isSectionHeading(line: string) {
  const text = line.trim();

  return (
    new RegExp(`^${chineseSectionPrefix}`).test(text) ||
    /^第[一二三四五六七八九十百0-9]+[节幕段]/.test(text)
  );
}

function countCjkAwareWords(value: string) {
  const cjkCount = (value.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const otherWords = value
    .replace(/[\u4e00-\u9fff]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return cjkCount + otherWords;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clean(value?: string | null) {
  return value?.trim() ?? "";
}

function lastLine(lines: string[]) {
  return lines[lines.length - 1];
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

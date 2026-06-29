import { normalizeOutlineLevel, type OutlineLevel } from "./outline-fields";

export type OutlineDraftCopySuggestion = {
  level: OutlineLevel;
  title: string;
  goal: string;
  startChapter?: number;
  endChapter?: number;
  chapterNumber?: number;
  expectedWords?: number;
  volumeNumber?: number;
};

const labelStopPattern =
  /^(\s*[-*]?\s*)?(卷标题|单元标题|剧情单元标题|章节标题|标题|卷目标|单元目标|剧情单元目标|章节目标|目标|章节范围|范围|核心事件|核心冲突|主线推进|爽点设计|悬念设计|角色变化|章末钩子|章节号|预计字数|预计章节数|所属卷号)\s*[：:]/;

export function parseOutlineDraftCopySuggestion({
  inputContextSummary,
  outputText,
}: {
  inputContextSummary?: string | null;
  outputText?: string | null;
}): OutlineDraftCopySuggestion | null {
  const text = outputText?.trim() ?? "";

  if (!text) {
    return null;
  }

  const level = inferOutlineDraftLevel(inputContextSummary, text);

  if (level === "chapter") {
    return parseChapterSuggestion(text, inputContextSummary);
  }

  if (level === "unit") {
    return parseRangeSuggestion(text, "unit");
  }

  return parseRangeSuggestion(text, "volume");
}

export function inferOutlineDraftLevel(
  inputContextSummary?: string | null,
  outputText?: string | null,
): OutlineLevel {
  const summary = inputContextSummary ?? "";

  if (summary.includes("章节大纲生成")) {
    return "chapter";
  }

  if (summary.includes("剧情单元大纲生成")) {
    return "unit";
  }

  if (summary.includes("卷大纲生成")) {
    return "volume";
  }

  const text = outputText ?? "";

  if (/剧情单元大纲|单元大纲/.test(text)) {
    return "unit";
  }

  if (/章节大纲/.test(text)) {
    return "chapter";
  }

  if (/卷大纲|第[一二三四五六七八九十百\d]+卷/.test(text)) {
    return "volume";
  }

  return normalizeOutlineLevel(null);
}

function parseRangeSuggestion(
  text: string,
  level: "volume" | "unit",
): OutlineDraftCopySuggestion | null {
  const title =
    firstBlockLabel(text, level === "volume" ? ["卷标题", "标题"] : ["剧情单元标题", "单元标题", "标题"]) ||
    headingTitle(text, level) ||
    "";
  const goal =
    firstBlockLabel(text, level === "volume" ? ["卷目标", "目标"] : ["剧情单元目标", "单元目标", "目标"]) ||
    "";
  const range = chapterRangeFromText(firstBlockLabel(text, ["章节范围", "范围"]) || text);
  const volumeNumber =
    level === "unit"
      ? firstPositiveInteger(firstBlockLabel(text, ["所属卷号"]) || "")
      : undefined;

  if (!title && !goal && !range.startChapter && !range.endChapter) {
    return null;
  }

  return {
    level,
    title,
    goal,
    ...range,
    ...(volumeNumber ? { volumeNumber } : {}),
  };
}

function parseChapterSuggestion(
  text: string,
  inputContextSummary?: string | null,
): OutlineDraftCopySuggestion | null {
  const block = firstFutureChapterBlock(text) ?? text;
  const title =
    firstBlockLabel(block, ["章节标题", "标题"]) ||
    firstHeadingSection(block, ["章节标题", "标题"]) ||
    chapterTitleFromHeading(block) ||
    "";
  const goal =
    firstBlockLabel(block, ["章节目标", "目标"]) ||
    firstHeadingSection(block, ["章节目标", "目标"]) ||
    "";
  const chapterNumber =
    firstPositiveInteger(firstBlockLabel(block, ["章节号"]) || "") ||
    arabicChapterNumberFromHeading(block) ||
    targetChapterNumberFromSummary(inputContextSummary);
  const expectedWords = firstPositiveInteger(firstBlockLabel(block, ["预计字数"]) || "");

  if (!title && !goal && !chapterNumber && !expectedWords) {
    return null;
  }

  return {
    level: "chapter",
    title,
    goal,
    ...(chapterNumber ? { chapterNumber } : {}),
    ...(expectedWords ? { expectedWords } : {}),
  };
}

function firstFutureChapterBlock(text: string) {
  const headingMatches = [...text.matchAll(/^#{1,6}\s+(.+)$/gm)].filter(
    (match) => isChapterOutlineHeading(match[1] ?? ""),
  );

  for (let index = 0; index < headingMatches.length; index += 1) {
    const match = headingMatches[index];
    const next = headingMatches[index + 1];
    const start = match.index ?? 0;
    const end = next?.index ?? text.length;
    const block = text.slice(start, end).trim();

    if (!/章/.test(match[1] ?? "")) {
      continue;
    }

    if (/已写章节|已有章节/.test(block)) {
      continue;
    }

    return block;
  }

  return null;
}

function isChapterOutlineHeading(heading: string) {
  const cleaned = cleanInlineText(heading);

  return /第\s*(?:\d+|[一二三四五六七八九十百千万]+)\s*章/.test(cleaned);
}

function firstBlockLabel(text: string, labels: readonly string[]) {
  const lines = text.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const cleanedLine = line.replace(/\*\*/g, "");

    for (const label of labels) {
      const inlineMatch = cleanedLine.match(
        new RegExp(`^\\s*[-*]?\\s*(?:\\*\\*)?${escapeRegExp(label)}(?:\\*\\*)?\\s*[：:]\\s*(.*)$`),
      );

      if (!inlineMatch) {
        continue;
      }

      const collected = [cleanInlineText(inlineMatch[1] ?? "")];

      for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
        const nextLine = lines[nextIndex] ?? "";

        if (!nextLine.trim()) {
          break;
        }

        if (
          /^\s*#{1,6}\s+/.test(nextLine) ||
          labelStopPattern.test(nextLine.replace(/\*\*/g, ""))
        ) {
          break;
        }

        collected.push(cleanInlineText(nextLine));
      }

      return collected.filter(Boolean).join("\n").trim();
    }
  }

  return "";
}

function firstHeadingSection(text: string, labels: readonly string[]) {
  const lines = text.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const heading = lines[index]?.match(/^\s*#{1,6}\s+(.+?)\s*$/)?.[1];

    if (!heading) {
      continue;
    }

    const cleanedHeading = cleanInlineText(heading);

    if (!labels.some((label) => cleanedHeading === label)) {
      continue;
    }

    const collected: string[] = [];

    for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
      const nextLine = lines[nextIndex] ?? "";

      if (/^\s*#{1,6}\s+/.test(nextLine)) {
        break;
      }

      const cleanedLine = cleanInlineText(nextLine);

      if (cleanedLine) {
        collected.push(cleanedLine);
      }
    }

    return collected.join("\n").trim();
  }

  return "";
}

function headingTitle(text: string, level: "volume" | "unit") {
  const heading = text.match(/^##\s+(.+)$/m)?.[1] ?? "";
  const titleFromColon = heading.match(/[：:]\s*([^（(]+)$/)?.[1]?.trim();

  if (titleFromColon) {
    return cleanInlineText(titleFromColon);
  }

  const titleFromBookName = heading.match(/《([^》]+)》/)?.[1]?.trim();

  if (titleFromBookName && !titleFromBookName.includes("离线未来")) {
    return titleFromBookName;
  }

  const titleFromLevel =
    level === "volume"
      ? heading.match(/第[一二三四五六七八九十百\d]+卷[·\s-]*([^（(]+)?/)?.[1]
      : heading.match(/(?:剧情)?单元[·\s-]*([^（(]+)?/)?.[1];

  return cleanInlineText(titleFromLevel ?? "");
}

function chapterTitleFromHeading(text: string) {
  const heading = text.match(/^#{1,6}\s+(.+)$/m)?.[1] ?? "";
  const cleanedHeading = cleanInlineText(heading);

  if (!isChapterOutlineHeading(cleanedHeading)) {
    return "";
  }

  return cleanInlineText(
    cleanedHeading.match(/《([^》]+)》/)?.[1] ??
      cleanedHeading.match(/[：:]\s*([^（(]+)$/)?.[1] ??
      cleanedHeading.replace(
        /^.*第\s*(?:\d+|[一二三四五六七八九十百千万]+)\s*章\s*/,
        "",
      ),
  );
}

function arabicChapterNumberFromHeading(text: string) {
  const heading = text.match(/^#{1,6}\s+(.+)$/m)?.[1] ?? "";

  return firstPositiveInteger(heading.match(/第\s*(\d+)\s*章/)?.[1] ?? "");
}

function targetChapterNumberFromSummary(inputContextSummary?: string | null) {
  return firstPositiveInteger(
    inputContextSummary?.match(/目标第\s*(\d+)\s*章/)?.[1] ?? "",
  );
}

function chapterRangeFromText(text: string) {
  const chapterNumbers = [...text.matchAll(/第\s*(\d+)\s*章/g)].map((match) =>
    Number(match[1]),
  );

  if (chapterNumbers.length >= 2) {
    return {
      startChapter: chapterNumbers[0],
      endChapter: chapterNumbers[1],
    };
  }

  const numericRange = text.match(/(\d+)\s*[-~—至到]+\s*(\d+)\s*章?/);

  if (numericRange) {
    return {
      startChapter: Number(numericRange[1]),
      endChapter: Number(numericRange[2]),
    };
  }

  return {
    startChapter: chapterNumbers[0],
    endChapter: undefined,
  };
}

function firstPositiveInteger(text: string) {
  const match = text.match(/\d+/);

  if (!match) {
    return undefined;
  }

  const value = Number(match[0]);

  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function cleanInlineText(value: string) {
  return value
    .replace(/\*\*/g, "")
    .replace(/^[-*]\s*/, "")
    .replace(/\s*\(.*?预估.*?\)\s*$/g, "")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

import {
  normalizeOutlineLevel,
  outlineNumberFields,
  outlineTextFields,
  type OutlineLevel,
} from "./outline-fields";

export type OutlineDraftCopySuggestion = {
  level: OutlineLevel;
  title: string;
  goal: string;
  startChapter?: number;
  endChapter?: number;
  chapterNumber?: number;
  expectedWords?: number;
  volumeNumber?: number;
  unitNumber?: number;
};

type OutlineDraftCopyRange = Pick<
  OutlineDraftCopySuggestion,
  "startChapter" | "endChapter"
>;

type OutlineDraftCopyInput = {
  inputContextSummary?: string | null;
  outputText?: string | null;
};

export type OutlineDraftCopyParseResult = {
  suggestion: OutlineDraftCopySuggestion | null;
  errorMessage: string;
};

const labelStopLabels = [
  ...outlineTextFields.map((field) => field.label),
  ...outlineNumberFields.map((field) => field.label),
  "卷标题",
  "单元标题",
  "剧情单元标题",
  "章节标题",
  "标题",
  "卷目标",
  "单元目标",
  "剧情单元目标",
  "章节目标",
  "目标",
  "章节范围",
  "章范围",
  "范围",
  "伏笔",
  "所属卷号",
  "剧情单元号",
] as const;
const labelStopPattern = new RegExp(
  `^(\\s*[-*]?\\s*)?(?:${[
    ...new Set(labelStopLabels),
  ].map(escapeRegExp).join("|")})\\s*[：:]`,
);

export function parseOutlineDraftCopySuggestion(
  input: OutlineDraftCopyInput,
): OutlineDraftCopySuggestion | null {
  return parseOutlineDraftCopyResult(input).suggestion;
}

export function parseOutlineDraftCopyResult({
  inputContextSummary,
  outputText,
}: OutlineDraftCopyInput): OutlineDraftCopyParseResult {
  const text = outputText?.trim() ?? "";

  if (!text) {
    return {
      suggestion: null,
      errorMessage: "草稿还没有可复制的输出。",
    };
  }

  const level = inferOutlineDraftLevel(inputContextSummary, text);

  if (level === "chapter") {
    return copyParseResult(
      parseChapterSuggestion(text, inputContextSummary),
    );
  }

  if (level === "unit") {
    const selection = selectUnitSuggestionBlock(text, inputContextSummary);

    if (selection.errorMessage) {
      return {
        suggestion: null,
        errorMessage: selection.errorMessage,
      };
    }

    return copyParseResult(
      parseRangeSuggestion(
        selection.text,
        "unit",
        inputContextSummary,
      ),
    );
  }

  return copyParseResult(
    parseRangeSuggestion(text, "volume", inputContextSummary),
  );
}

function copyParseResult(
  suggestion: OutlineDraftCopySuggestion | null,
): OutlineDraftCopyParseResult {
  return {
    suggestion,
    errorMessage: suggestion ? "" : "没有识别到可填入大纲表单的字段。",
  };
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
  inputContextSummary?: string | null,
): OutlineDraftCopySuggestion | null {
  const titleLabels =
    level === "volume"
      ? ["卷标题", "标题"]
      : ["剧情单元标题", "单元标题", "标题"];
  const goalLabels =
    level === "volume"
      ? ["卷目标", "目标"]
      : ["剧情单元目标", "单元目标", "目标"];
  const title =
    firstBlockLabel(text, titleLabels) ||
    firstTableLabel(text, titleLabels) ||
    headingTitle(text, level) ||
    "";
  const goal =
    firstBlockLabel(text, goalLabels) ||
    firstTableLabel(text, goalLabels) ||
    firstTableLabel(
      text,
      level === "volume" ? ["主线推进", "卷主题"] : ["核心事件"],
    ) ||
    "";
  const rangeText =
    firstBlockLabel(text, ["章节范围", "章范围", "范围"]) ||
    firstTableLabel(
      text,
      level === "volume" ? ["章节范围", "范围"] : ["章节范围", "章范围", "范围"],
    );
  const range: OutlineDraftCopyRange =
    chapterRangeFromText(rangeText) ||
    chapterRangeFromText(
      tableLabels(text, ["章节范围", "章范围", "范围"]).join("\n"),
      {
        useAllRanges: level === "volume",
      },
    ) ||
    {};
  const volumeNumber =
    level === "unit"
      ? firstPositiveInteger(
          firstBlockLabel(text, ["所属卷号"]) ||
            firstTableLabel(text, ["所属卷号"]) ||
            "",
        )
      : undefined;
  const unitNumber =
    level === "unit"
      ? firstPositiveInteger(
          firstBlockLabel(text, ["剧情单元号", "单元号"]) ||
            firstTableLabel(text, ["剧情单元号", "单元号"]) ||
            "",
        ) || targetUnitNumberFromSummary(inputContextSummary)
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
    ...(unitNumber ? { unitNumber } : {}),
  };
}

function selectUnitSuggestionBlock(
  text: string,
  inputContextSummary?: string | null,
) {
  const blocks = unitOutlineBlocks(text);

  if (blocks.length === 0) {
    return {
      text,
      errorMessage: "",
    };
  }

  const targetStartChapter = targetUnitStartChapterFromSummary(
    inputContextSummary,
  );

  if (!targetStartChapter) {
    return blocks.length === 1
      ? {
          text: blocks[0] ?? text,
          errorMessage: "",
        }
      : {
          text: "",
          errorMessage:
            "草稿包含多个剧情单元，但任务没有记录建议起始章，请手动整理或重新生成。",
        };
  }

  const exactBlock = blocks.find((block) => {
    const rangeText =
      firstBlockLabel(block, ["章节范围", "章范围", "范围"]) ||
      firstTableLabel(block, ["章节范围", "章范围", "范围"]);

    return chapterRangeFromText(rangeText)?.startChapter === targetStartChapter;
  });

  return exactBlock
    ? {
        text: exactBlock,
        errorMessage: "",
      }
    : {
        text: "",
        errorMessage: `未能在草稿中定位到从第 ${targetStartChapter} 章开始的剧情单元，请手动整理或重新生成。`,
      };
}

function unitOutlineBlocks(text: string) {
  const headings = [...text.matchAll(/^(#{1,6})\s+(.+)$/gm)];
  const headingBlocks: string[] = [];

  headings.forEach((heading, index) => {
    const headingText = cleanInlineText(heading[2] ?? "");

    if (!isUnitOutlineHeading(headingText)) {
      return;
    }

    const depth = heading[1]?.length ?? 1;
    const nextHeading = headings
      .slice(index + 1)
      .find((candidate) => (candidate[1]?.length ?? 1) <= depth);
    const start = heading.index ?? 0;
    const end = nextHeading?.index ?? text.length;

    headingBlocks.push(text.slice(start, end).trim());
  });

  if (headingBlocks.length > 0) {
    return headingBlocks;
  }

  // Prompt-v5 single-unit output normally reaches this label-based path.
  // Heading blocks above are compatibility recovery for older mixed responses.
  return labelBasedUnitOutlineBlocks(text);
}

function labelBasedUnitOutlineBlocks(text: string) {
  const lines = text.split(/\r?\n/);
  const titleLineIndexes = lines.flatMap((line, index) =>
    unitTitleLabelPattern.test(line) ? [index] : [],
  );
  const blockStartIndexes = titleLineIndexes.map((titleLineIndex, index) => {
    const previousTitleLineIndex = titleLineIndexes[index - 1] ?? -1;
    let blockStartIndex = titleLineIndex;

    for (
      let lineIndex = titleLineIndex - 1;
      lineIndex > previousTitleLineIndex;
      lineIndex -= 1
    ) {
      const line = lines[lineIndex] ?? "";

      if (!line.trim()) {
        continue;
      }

      if (!unitPreambleLabelPattern.test(line)) {
        break;
      }

      blockStartIndex = lineIndex;
    }

    return blockStartIndex;
  });

  return blockStartIndexes.map((blockStartIndex, index) => {
    const blockEndIndex = blockStartIndexes[index + 1] ?? lines.length;

    return lines.slice(blockStartIndex, blockEndIndex).join("\n").trim();
  });
}

const unitTitleLabelPattern =
  /^\s*(?:[-*]\s*)?\*{0,2}(?:剧情单元标题|单元标题|标题)\*{0,2}\s*[：:]/;
const unitPreambleLabelPattern =
  /^\s*(?:[-*]\s*)?\*{0,2}(?:所属卷号|剧情单元号|单元号)\*{0,2}\s*[：:]/;

function isUnitOutlineHeading(heading: string) {
  return /剧情单元大纲|单元大纲|(?:第?[一二三四五六七八九十百\d]+|子)单元/.test(
    heading,
  );
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
    firstHeadingSection(block, ["节拍总览", "章节总览", "章节概览"], {
      firstParagraphOnly: true,
    }) ||
    firstBlockLabel(block, ["核心事件"]) ||
    firstHeadingSection(block, ["核心事件"]) ||
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

function firstTableLabel(text: string, labels: readonly string[]) {
  for (const label of labels) {
    const value = tableLabels(text, [label])[0];

    if (value) {
      return value;
    }
  }

  return "";
}

function tableLabels(text: string, labels: readonly string[]) {
  const normalizedLabels = labels.map(normalizeLabel);
  const values: string[] = [];

  for (const line of text.split(/\r?\n/)) {
    const cells = markdownTableCells(line);

    if (cells.length < 2) {
      continue;
    }

    const label = normalizeLabel(cells[0] ?? "");

    if (!normalizedLabels.includes(label)) {
      continue;
    }

    const value = cells.slice(1).join(" | ").trim();

    if (value) {
      values.push(value);
    }
  }

  return values;
}

function markdownTableCells(line: string) {
  const trimmed = line.trim();

  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
    return [];
  }

  const cells = trimmed
    .slice(1, -1)
    .split("|")
    .map(cleanInlineText)
    .filter(Boolean);

  if (
    cells.length === 0 ||
    cells.every((cell) => /^:?-{2,}:?$/.test(cell.replace(/\s/g, "")))
  ) {
    return [];
  }

  return cells;
}

function firstHeadingSection(
  text: string,
  labels: readonly string[],
  options: {
    firstParagraphOnly?: boolean;
  } = {},
) {
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

      if (
        /^\s*#{1,6}\s+/.test(nextLine) ||
        labelStopPattern.test(nextLine.replace(/\*\*/g, ""))
      ) {
        break;
      }

      const cleanedLine = cleanInlineText(nextLine);

      if (!cleanedLine) {
        if (options.firstParagraphOnly && collected.length > 0) {
          break;
        }

        continue;
      }

      collected.push(cleanedLine);
    }

    return collected.join("\n").trim();
  }

  return "";
}

function headingTitle(text: string, level: "volume" | "unit") {
  const heading = text.match(/^#{1,6}\s+(.+)$/m)?.[1] ?? "";
  const quotedTitles = [...heading.matchAll(/[「《]([^」》]+)[」》]/g)];
  const quotedTitle =
    level === "unit" || /第[一二三四五六七八九十百\d]+卷/.test(heading)
      ? quotedTitles.at(-1)?.[1]?.trim()
      : undefined;

  if (quotedTitle) {
    return cleanInlineText(quotedTitle);
  }

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

function targetUnitStartChapterFromSummary(
  inputContextSummary?: string | null,
) {
  const summary = inputContextSummary ?? "";

  return firstPositiveInteger(
    summary.match(/建议起始第\s*(\d+)\s*章/)?.[1] ??
      summary.match(/建议第\s*\d+\s*单元从第\s*(\d+)\s*章/)?.[1] ??
      "",
  );
}

function targetUnitNumberFromSummary(inputContextSummary?: string | null) {
  return firstPositiveInteger(
    inputContextSummary?.match(/建议第\s*(\d+)\s*单元/)?.[1] ?? "",
  );
}

function chapterRangeFromText(
  text: string,
  options: {
    useAllRanges?: boolean;
  } = {},
) {
  if (!text.trim()) {
    return null;
  }

  const rangedChapterNumbers = [
    ...text.matchAll(
      /第\s*(\d+)\s*[-~—–至到]+\s*(\d+)\s*章/g,
    ),
  ].flatMap((match) => [Number(match[1]), Number(match[2])]);

  if (options.useAllRanges && rangedChapterNumbers.length >= 2) {
    return {
      startChapter: Math.min(...rangedChapterNumbers),
      endChapter: Math.max(...rangedChapterNumbers),
    };
  }

  if (rangedChapterNumbers.length >= 2) {
    return {
      startChapter: rangedChapterNumbers[0],
      endChapter: rangedChapterNumbers[1],
    };
  }

  const chapterNumbers = [...text.matchAll(/第\s*(\d+)\s*章/g)].map((match) =>
    Number(match[1]),
  );

  if (chapterNumbers.length >= 2) {
    return {
      startChapter: chapterNumbers[0],
      endChapter: chapterNumbers[1],
    };
  }

  const numericRange = text.match(/(\d+)\s*[-~—–至到]+\s*(\d+)\s*章?/);

  if (numericRange) {
    return {
      startChapter: Number(numericRange[1]),
      endChapter: Number(numericRange[2]),
    };
  }

  return chapterNumbers[0]
    ? {
        startChapter: chapterNumbers[0],
        endChapter: undefined,
      }
    : null;
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

function normalizeLabel(value: string) {
  return cleanInlineText(value).replace(/\s/g, "");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

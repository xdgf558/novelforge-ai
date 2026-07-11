import {
  countCjkAwareWords,
  normalizeFanqieChapterBody,
} from "@/lib/fanqie-layout-export";

export const shortStorySigningWordMinimum = 6_000;
export const shortStorySigningWordMaximum = 80_000;

export const shortStoryManuscriptHeadingModeOptions = [
  {
    value: "none",
    label: "无单元标题",
    description: "移除内部单元边界，合并为连续正文。",
  },
  {
    value: "separators",
    label: "分隔符",
    description: "在单元之间保留简洁场景分隔符，不显示内部标题。",
  },
  {
    value: "short_headings",
    label: "保留短标题",
    description: "用写作单元标题作为正文内的小节标题。",
  },
] as const;

export type ShortStoryManuscriptHeadingMode =
  (typeof shortStoryManuscriptHeadingModeOptions)[number]["value"];

export type ShortStoryManuscriptUnit = {
  id: string;
  chapterNumber: number;
  title: string;
  status: string;
  finalText?: string | null;
};

export type ShortStoryManuscriptExportInput = {
  headingMode?: ShortStoryManuscriptHeadingMode;
  projectTitle: string;
  units: readonly ShortStoryManuscriptUnit[];
};

export type ShortStoryManuscriptIncludedUnit = {
  body: string;
  chapterNumber: number;
  id: string;
  shortHeading: string;
  sourceLength: number;
  title: string;
  wordCount: number;
};

export type ShortStoryManuscriptOmittedUnit = {
  chapterNumber: number;
  id: string;
  reason: "empty_after_cleanup" | "missing_final_text" | "not_confirmed";
  title: string;
};

export type ShortStoryManuscriptExport = {
  filenameBase: string;
  headingMode: ShortStoryManuscriptHeadingMode;
  includedUnits: ShortStoryManuscriptIncludedUnit[];
  markdown: string;
  omittedUnits: ShortStoryManuscriptOmittedUnit[];
  plainText: string;
  validation: {
    hasCompleteConfirmedUnits: boolean;
    isAboveSigningRange: boolean;
    isBelowSigningRange: boolean;
    isWithinSigningRange: boolean;
    messages: string[];
  };
  wordCount: number;
};

const confirmedUnitStatuses = new Set(["final", "published"]);
const manuscriptSeparator = "* * *";

export function buildShortStoryManuscriptExport(
  input: ShortStoryManuscriptExportInput,
): ShortStoryManuscriptExport {
  const headingMode = normalizeHeadingMode(input.headingMode);
  const projectTitle = clean(input.projectTitle) || "未命名短故事";
  const includedUnits: ShortStoryManuscriptIncludedUnit[] = [];
  const omittedUnits: ShortStoryManuscriptOmittedUnit[] = [];
  const sortedUnits = [...input.units].sort(
    (left, right) =>
      left.chapterNumber - right.chapterNumber || left.id.localeCompare(right.id),
  );

  for (const unit of sortedUnits) {
    if (!confirmedUnitStatuses.has(unit.status)) {
      omittedUnits.push(omittedUnit(unit, "not_confirmed"));
      continue;
    }

    if (!unit.finalText?.trim()) {
      omittedUnits.push(omittedUnit(unit, "missing_final_text"));
      continue;
    }

    const body = normalizeShortStoryManuscriptUnit(unit.finalText, unit);

    if (!body) {
      omittedUnits.push(omittedUnit(unit, "empty_after_cleanup"));
      continue;
    }

    includedUnits.push({
      body,
      chapterNumber: unit.chapterNumber,
      id: unit.id,
      shortHeading: shortUnitHeading(unit),
      sourceLength: unit.finalText.trim().length,
      title: unit.title,
      wordCount: countCjkAwareWords(body),
    });
  }

  const plainText = joinManuscriptUnits(includedUnits, headingMode, false);
  const markdownBody = joinManuscriptUnits(includedUnits, headingMode, true);
  const markdown = markdownBody
    ? [`# ${projectTitle}`, "", markdownBody].join("\n")
    : "";
  const wordCount = includedUnits.reduce(
    (total, unit) => total + unit.wordCount,
    0,
  );
  const isBelowSigningRange =
    wordCount > 0 && wordCount < shortStorySigningWordMinimum;
  const isAboveSigningRange = wordCount > shortStorySigningWordMaximum;
  const isWithinSigningRange =
    wordCount >= shortStorySigningWordMinimum &&
    wordCount <= shortStorySigningWordMaximum;
  const hasCompleteConfirmedUnits =
    input.units.length > 0 && omittedUnits.length === 0;
  const messages = [
    includedUnits.length === 0
      ? "还没有可组装的已确认定稿单元。"
      : "",
    omittedUnits.length > 0
      ? `${omittedUnits.length} 个写作单元尚未确认定稿或清理后无正文，本次未纳入成稿。`
      : "",
    isBelowSigningRange
      ? `当前正文低于 ${shortStorySigningWordMinimum.toLocaleString()} 字的短故事签约参考下限。`
      : "",
    isAboveSigningRange
      ? `当前正文超过 ${shortStorySigningWordMaximum.toLocaleString()} 字的短故事签约参考上限。`
      : "",
  ].filter(Boolean);

  return {
    filenameBase: safeFilename(`${projectTitle}-短故事成稿`),
    headingMode,
    includedUnits,
    markdown,
    omittedUnits,
    plainText,
    validation: {
      hasCompleteConfirmedUnits,
      isAboveSigningRange,
      isBelowSigningRange,
      isWithinSigningRange,
      messages,
    },
    wordCount,
  };
}

export function normalizeShortStoryManuscriptUnit(
  value: string,
  unit: Pick<ShortStoryManuscriptUnit, "chapterNumber" | "title">,
) {
  const sourceLines = normalizeNewlines(value).split("\n");

  stripLeadingBlankLines(sourceLines);

  while (isLeadingUnitDecoration(sourceLines[0], unit)) {
    sourceLines.shift();
    stripLeadingBlankLines(sourceLines);
  }

  const normalized = normalizeFanqieChapterBody(sourceLines.join("\n"), unit);
  const lines = normalized
    .split("\n")
    .filter((line) => !isShortStoryStructureTrace(line));

  stripLeadingBlankLines(lines);

  while (isLeadingUnitDecoration(lines[0], unit)) {
    lines.shift();
    stripLeadingBlankLines(lines);
  }

  stripTrailingFollowHooks(lines);

  return normalizeSpacing(lines);
}

function joinManuscriptUnits(
  units: readonly ShortStoryManuscriptIncludedUnit[],
  headingMode: ShortStoryManuscriptHeadingMode,
  markdown: boolean,
) {
  const separator =
    headingMode === "separators" ? `\n\n${manuscriptSeparator}\n\n` : "\n\n";
  const sections = units.map((unit) => {
    if (headingMode !== "short_headings") {
      return unit.body;
    }

    const heading = markdown ? `## ${unit.shortHeading}` : unit.shortHeading;

    return [heading, "", unit.body].join("\n");
  });

  return sections.join(separator).trim();
}

function isLeadingUnitDecoration(
  line: string | undefined,
  unit: Pick<ShortStoryManuscriptUnit, "chapterNumber" | "title">,
) {
  const compactLine = compactDecoration(line);
  const compactTitle = compactDecoration(unit.title);

  if (!compactLine) {
    return false;
  }

  if (compactTitle && compactLine === compactTitle) {
    return true;
  }

  const numberForms = [
    String(unit.chapterNumber),
    numberToChineseUnit(unit.chapterNumber),
  ].filter(Boolean);

  return numberForms.some((numberText) =>
    [
      `写作单元${numberText}`,
      `单元${numberText}`,
      `第${numberText}单元`,
      `第${numberText}节`,
      `第${numberText}章`,
    ].some(
      (prefix) =>
        compactLine === prefix ||
        Boolean(compactTitle && compactLine === `${prefix}${compactTitle}`),
    ),
  );
}

function isShortStoryStructureTrace(line: string) {
  const text = line.trim();

  return /^(?:(?:写作)?单元\s*[\d一二三四五六七八九十百]+(?:\s*(?:节拍|草案|正文))?|第[\d一二三四五六七八九十百]+单元|节拍总览|单元目标|场景推进|核心冲突|关键转折|兑现推进|剧情动作|情绪作用|写作要求|输出要求|状态)(?:\s*[：:].*)?$/.test(
    text,
  );
}

function stripTrailingFollowHooks(lines: string[]) {
  while (lines.length > 0) {
    const lastLine = lines.at(-1)?.trim() ?? "";

    if (!lastLine || isSerialFollowHook(lastLine)) {
      lines.pop();
      continue;
    }

    break;
  }
}

function isSerialFollowHook(line: string) {
  return /^(?:未完待续|敬请期待(?:下一(?:章|节|单元))?|(?:下章|下一(?:章|节|单元))预告[：:]?.*|下一(?:章|节|单元)(?:见|继续|[：:].*)|欲知后事如何.*|请继续阅读下一(?:章|节|单元).*)[。.!！\s]*$/.test(
    line,
  );
}

function shortUnitHeading(
  unit: Pick<ShortStoryManuscriptUnit, "chapterNumber" | "title">,
) {
  const cleanedTitle = clean(unit.title)
    .replace(
      /^(?:(?:写作)?单元\s*[\d一二三四五六七八九十百]+|第[\d一二三四五六七八九十百]+(?:章|节|单元))[\s:：\-_—–·]*/,
      "",
    )
    .replace(/^[《【(（]|[》】)）]$/g, "")
    .trim();

  return cleanedTitle || `第${unit.chapterNumber}节`;
}

function omittedUnit(
  unit: ShortStoryManuscriptUnit,
  reason: ShortStoryManuscriptOmittedUnit["reason"],
): ShortStoryManuscriptOmittedUnit {
  return {
    chapterNumber: unit.chapterNumber,
    id: unit.id,
    reason,
    title: unit.title,
  };
}

function normalizeHeadingMode(value?: string | null) {
  return shortStoryManuscriptHeadingModeOptions.some(
    (option) => option.value === value,
  )
    ? (value as ShortStoryManuscriptHeadingMode)
    : "none";
}

function normalizeSpacing(lines: string[]) {
  const result: string[] = [];
  let previousBlank = true;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      if (!previousBlank && result.length > 0) {
        result.push("");
      }

      previousBlank = true;
      continue;
    }

    result.push(line);
    previousBlank = false;
  }

  while (result.at(-1) === "") {
    result.pop();
  }

  return result.join("\n").trim();
}

function stripLeadingBlankLines(lines: string[]) {
  while (lines[0]?.trim() === "") {
    lines.shift();
  }
}

function compactDecoration(value?: string | null) {
  return clean(value)
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\*\*|\*\*$/g, "")
    .replace(/[\s《》【】()（）:：\-_—–·]/g, "");
}

function numberToChineseUnit(value: number) {
  const digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

  if (!Number.isInteger(value) || value <= 0 || value >= 100) {
    return "";
  }

  if (value < 10) {
    return digits[value];
  }

  const tens = Math.floor(value / 10);
  const ones = value % 10;

  return `${tens > 1 ? digits[tens] : ""}十${ones > 0 ? digits[ones] : ""}`;
}

function safeFilename(value: string) {
  return (
    clean(value)
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "short-story-manuscript"
  );
}

function normalizeNewlines(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function clean(value?: string | null) {
  return value?.trim() ?? "";
}

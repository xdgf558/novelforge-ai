export type ContinuityReplacementFix = {
  from: string;
  replacements?: ContinuityReplacement[];
  to: string;
};

export type ContinuityReplacement = {
  from: string;
  to: string;
};

export type ContinuityFixContext = {
  description?: string | null;
  evidence?: string | null;
  sourceText?: string | null;
};

const quotedReplacementPattern =
  /(?:将|把)\s*"([^"]{1,240})"\s*(?:改为|改成|替换为|换成)\s*"([^"]{1,240})"/;
const timeTargetPattern =
  /(?:修正为|调整为|更正为|修正|调整|更正|改为|改成|改至|改到|设置为|设为)\s*((?:\d{4}年)?\d{1,2}月\d{1,2}日(?:凌晨|上午|中午|下午|晚上|晚间|深夜)?[零〇一二两三四五六七八九十\d点:：半分]{0,24})/;
const dateTimePattern =
  /(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日((?:凌晨|上午|中午|下午|晚上|晚间|深夜)?[零〇一二两三四五六七八九十\d点:：半分]{0,24})/g;

export function parseContinuityReplacementFix(
  suggestedFix?: string | null,
  context: ContinuityFixContext = {},
): ContinuityReplacementFix | null {
  const normalized = normalizeQuotes(suggestedFix?.trim() ?? "");

  if (!normalized) {
    return null;
  }

  const match = normalized.match(quotedReplacementPattern);

  if (match) {
    const from = match[1]?.trim();
    const to = match[2]?.trim();

    if (!from || !to || from === to) {
      return null;
    }

    return {
      from,
      to,
    };
  }

  return inferDateTimeReplacement(normalized, context);
}

export function describeContinuityReplacementFix(
  fix: ContinuityReplacementFix,
) {
  return getContinuityReplacements(fix)
    .map((replacement) => `将“${replacement.from}”替换为“${replacement.to}”`)
    .join("；");
}

export function getContinuityReplacements(fix: ContinuityReplacementFix) {
  return fix.replacements?.length
    ? fix.replacements
    : [{ from: fix.from, to: fix.to }];
}

export function applyContinuityReplacement(
  text: string,
  fix: ContinuityReplacementFix,
) {
  let nextText = text;
  let count = 0;

  for (const replacement of getContinuityReplacements(fix)) {
    if (!replacement.from || replacement.from === replacement.to) {
      continue;
    }

    if (!nextText.includes(replacement.from)) {
      continue;
    }

    const parts = nextText.split(replacement.from);
    count += parts.length - 1;
    nextText = parts.join(replacement.to);
  }

  return {
    count,
    text: nextText,
  };
}

function inferDateTimeReplacement(
  suggestedFix: string,
  context: ContinuityFixContext,
): ContinuityReplacementFix | null {
  const target = parseDateTime(suggestedFix.match(timeTargetPattern)?.[1]);

  if (!target?.suffix) {
    return null;
  }

  const contextText = normalizeQuotes(
    [context.evidence, context.description, context.sourceText]
      .filter((value): value is string => Boolean(value?.trim()))
      .join("\n"),
  );

  const candidates = extractDateTimes(contextText)
    .filter((candidate) => candidate.suffix === target.suffix)
    .filter(
      (candidate) =>
        candidate.month !== target.month ||
        candidate.day !== target.day ||
        (candidate.year && target.year && candidate.year !== target.year),
    );
  const uniqueCandidates = Array.from(
    new Map(candidates.map((candidate) => [candidate.raw, candidate])).values(),
  );

  if (uniqueCandidates.length !== 1) {
    return null;
  }

  const source = uniqueCandidates[0];
  const primary = {
    from: source.raw,
    to: formatDateTime({
      ...target,
      year: target.year ?? source.year,
    }),
  };

  if (primary.from === primary.to) {
    return null;
  }

  const replacements: ContinuityReplacement[] = [primary];
  const presentDatePrefix = source.year
    ? `现在是${source.year}年${source.month}月${source.day}日`
    : "";

  if (presentDatePrefix && contextText.includes(presentDatePrefix)) {
    replacements.push({
      from: presentDatePrefix,
      to: `现在是${source.year}年${target.month}月${target.day}日`,
    });
  }

  return {
    ...primary,
    replacements,
  };
}

function parseDateTime(value?: string | null) {
  const normalized = normalizeDateTimeTail(value ?? "");
  const match = new RegExp(dateTimePattern.source).exec(normalized);

  if (!match) {
    return null;
  }

  return {
    raw: normalizeDateTimeTail(match[0] ?? ""),
    year: match[1] ? Number(match[1]) : null,
    month: Number(match[2]),
    day: Number(match[3]),
    suffix: normalizeDateTimeTail(match[4] ?? ""),
  };
}

function extractDateTimes(value: string) {
  return Array.from(value.matchAll(dateTimePattern))
    .map((match) => parseDateTime(match[0]))
    .filter((dateTime): dateTime is NonNullable<ReturnType<typeof parseDateTime>> =>
      Boolean(dateTime),
    );
}

function formatDateTime(dateTime: NonNullable<ReturnType<typeof parseDateTime>>) {
  return `${dateTime.year ? `${dateTime.year}年` : ""}${dateTime.month}月${
    dateTime.day
  }日${dateTime.suffix}`;
}

function normalizeDateTimeTail(value: string) {
  return value.trim().replace(/[，。；、,.!?！？;：:）)\]]+$/g, "");
}

function normalizeQuotes(value: string) {
  return value
    .replace(/[“”「」『』]/g, '"')
    .replace(/[‘’]/g, '"');
}

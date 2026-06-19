export type ContinuityReplacementFix = {
  from: string;
  to: string;
};

const quotedReplacementPattern =
  /(?:将|把)\s*"([^"]{1,240})"\s*(?:改为|改成|替换为|换成)\s*"([^"]{1,240})"/;

export function parseContinuityReplacementFix(
  suggestedFix?: string | null,
): ContinuityReplacementFix | null {
  const normalized = normalizeQuotes(suggestedFix?.trim() ?? "");

  if (!normalized) {
    return null;
  }

  const match = normalized.match(quotedReplacementPattern);

  if (!match) {
    return null;
  }

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

export function applyContinuityReplacement(
  text: string,
  fix: ContinuityReplacementFix,
) {
  if (!text.includes(fix.from)) {
    return {
      count: 0,
      text,
    };
  }

  const parts = text.split(fix.from);

  return {
    count: parts.length - 1,
    text: parts.join(fix.to),
  };
}

function normalizeQuotes(value: string) {
  return value
    .replace(/[“”「」『』]/g, '"')
    .replace(/[‘’]/g, '"');
}

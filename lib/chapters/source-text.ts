import { createHash } from "node:crypto";

export function normalizeChapterFinalText(value?: string | null) {
  return value?.trim() ?? "";
}

export function chapterFinalTextHash(value?: string | null) {
  const normalized = normalizeChapterFinalText(value);

  if (!normalized) {
    return null;
  }

  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

export function chapterSourceMatches(
  sourceTextHash: string | null | undefined,
  finalText: string | null | undefined,
) {
  const currentHash = chapterFinalTextHash(finalText);

  return Boolean(sourceTextHash && currentHash && sourceTextHash === currentHash);
}

export function readAiTaskFinalTextHash(inputJson?: string | null) {
  if (!inputJson?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(inputJson) as unknown;

    if (
      parsed &&
      typeof parsed === "object" &&
      "finalTextHash" in parsed &&
      typeof parsed.finalTextHash === "string"
    ) {
      return parsed.finalTextHash.trim() || null;
    }
  } catch {
    return null;
  }

  return null;
}

export function aiTaskFinalTextIsStale(
  inputJson: string | null | undefined,
  finalText: string | null | undefined,
) {
  const sourceTextHash = readAiTaskFinalTextHash(inputJson);

  return sourceTextHash
    ? !chapterSourceMatches(sourceTextHash, finalText)
    : false;
}

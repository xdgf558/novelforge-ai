import { createHash } from "node:crypto";

export type AudioSourceTextType = "auto" | "polishedText" | "finalText" | "draftText";

export type AudioSourceChapter = {
  draftText?: string | null;
  finalText?: string | null;
  polishedText?: string | null;
};

export type ResolvedAudioSourceText = {
  type: Exclude<AudioSourceTextType, "auto">;
  text: string;
  hash: string;
};

export function resolveChapterAudioSourceText(
  chapter: AudioSourceChapter,
  requestedSource: AudioSourceTextType = "auto",
): ResolvedAudioSourceText | null {
  const sources: Array<Exclude<AudioSourceTextType, "auto">> =
    requestedSource === "auto"
      ? ["polishedText", "finalText", "draftText"]
      : [requestedSource];

  for (const source of sources) {
    const text = chapter[source]?.trim();

    if (text) {
      return {
        type: source,
        text,
        hash: hashAudioSourceText(text),
      };
    }
  }

  return null;
}

export function hashAudioSourceText(text: string) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function audioSourceTextTypeLabel(type: string) {
  if (type === "polishedText") {
    return "精修正文";
  }

  if (type === "finalText") {
    return "定稿正文";
  }

  if (type === "draftText") {
    return "草稿正文";
  }

  return "自动选择";
}

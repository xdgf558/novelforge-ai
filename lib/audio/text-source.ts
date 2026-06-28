import { createHash } from "node:crypto";

export type AudioSourceTextType =
  | "auto"
  | "publishedText"
  | "polishedText"
  | "finalText"
  | "draftText";
type LocalAudioSourceTextType = Exclude<
  AudioSourceTextType,
  "auto" | "publishedText"
>;

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
  if (requestedSource === "publishedText") {
    return null;
  }

  const sources: LocalAudioSourceTextType[] =
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
  if (type === "publishedText") {
    return "个人网站正式发布版";
  }

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

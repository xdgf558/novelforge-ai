import { describe, expect, it } from "vitest";
import { resolveChapterAudioSourceText } from "./text-source";

describe("resolveChapterAudioSourceText", () => {
  it("prefers polished text before final and draft text", () => {
    const source = resolveChapterAudioSourceText({
      draftText: "草稿",
      finalText: "定稿",
      polishedText: "精修",
    });

    expect(source).toMatchObject({
      text: "精修",
      type: "polishedText",
    });
    expect(source?.hash).toHaveLength(64);
  });

  it("falls back to final text then draft text", () => {
    expect(
      resolveChapterAudioSourceText({
        draftText: "草稿",
        finalText: "定稿",
      })?.type,
    ).toBe("finalText");

    expect(
      resolveChapterAudioSourceText({
        draftText: "草稿",
      })?.type,
    ).toBe("draftText");
  });

  it("honors explicit source selection", () => {
    const source = resolveChapterAudioSourceText(
      {
        draftText: "草稿",
        finalText: "定稿",
        polishedText: "精修",
      },
      "draftText",
    );

    expect(source).toMatchObject({
      text: "草稿",
      type: "draftText",
    });
  });

  it("returns null when selected source has no text", () => {
    expect(
      resolveChapterAudioSourceText(
        {
          draftText: "草稿",
        },
        "finalText",
      ),
    ).toBeNull();
  });
});

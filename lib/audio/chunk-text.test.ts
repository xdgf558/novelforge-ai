import { describe, expect, it } from "vitest";
import { chunkAudioText, normalizeAudioSourceText } from "./chunk-text";

describe("chunkAudioText", () => {
  it("normalizes redundant blank lines", () => {
    expect(normalizeAudioSourceText(" 第一段 \n\n\n 第二段 ")).toBe(
      "第一段\n\n第二段",
    );
  });

  it("chunks Chinese paragraphs without empty segments", () => {
    const segments = chunkAudioText(
      "第一段。第二段很短。\n\n第三段继续推进剧情。第四段收束。",
      {
        maxChars: 18,
      },
    );

    expect(segments.length).toBeGreaterThan(1);
    expect(segments.every((segment) => segment.text.trim())).toBe(true);
    expect(segments.every((segment) => segment.charCount <= 18)).toBe(true);
    expect(segments[0].index).toBe(1);
  });

  it("hard-splits very long text when sentence boundaries are not enough", () => {
    const segments = chunkAudioText("a".repeat(650), {
      maxChars: 200,
    });

    expect(segments).toHaveLength(4);
    expect(segments.every((segment) => segment.charCount <= 200)).toBe(true);
  });
});

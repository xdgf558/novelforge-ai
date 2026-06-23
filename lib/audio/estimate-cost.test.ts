import { describe, expect, it } from "vitest";
import { maxAudioSegmentBytes } from "./audio-assets";
import {
  estimateGeminiWavBytesForChars,
  geminiTtsInputLimit,
  modelInputLimit,
} from "./estimate-cost";

describe("TTS cost and segment estimates", () => {
  it("keeps Gemini TTS input limits under the local WAV segment budget", () => {
    const limit = modelInputLimit("gemini-2.5-flash-preview-tts");

    expect(limit).toBe(geminiTtsInputLimit());
    expect(limit).toBeLessThanOrEqual(1800);
    expect(estimateGeminiWavBytesForChars(limit)).toBeLessThan(
      maxAudioSegmentBytes,
    );
  });
});

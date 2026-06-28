import { describe, expect, it } from "vitest";
import { maxAudioSegmentBytes } from "./audio-assets";
import {
  estimateGeminiWavBytesForChars,
  geminiTtsInputLimit,
  glmTtsInputLimit,
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

  it("keeps GLM-TTS input limits conservative for WAV output", () => {
    const limit = modelInputLimit("glm-tts");

    expect(limit).toBe(glmTtsInputLimit());
    expect(limit).toBeLessThanOrEqual(1600);
    expect(estimateGeminiWavBytesForChars(limit)).toBeLessThan(
      maxAudioSegmentBytes,
    );
  });
});

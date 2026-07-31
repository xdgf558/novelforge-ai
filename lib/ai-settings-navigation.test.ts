import { describe, expect, it } from "vitest";
import {
  aiSettingsTabIds,
  buildAiSettingsHref,
} from "./ai-settings-navigation";

describe("AI settings navigation", () => {
  it("keeps save results on the originating tab", () => {
    expect(
      buildAiSettingsHref(aiSettingsTabIds.defaultConnection, {
        saved: "ai",
      }),
    ).toBe("/ai-settings?saved=ai#default-ai-connection");
    expect(
      buildAiSettingsHref(aiSettingsTabIds.stationCatPublish, {
        saved: "station-cat",
      }),
    ).toBe("/ai-settings?saved=station-cat#station-cat-publish");
  });

  it("preserves encoded preview parameters on the TTS tab", () => {
    expect(
      buildAiSettingsHref(aiSettingsTabIds.tts, {
        saved: "tts-preview",
        ttsPreviewPath: "audio previews/试听.wav",
      }),
    ).toBe(
      "/ai-settings?saved=tts-preview&ttsPreviewPath=audio+previews%2F%E8%AF%95%E5%90%AC.wav#tts-settings",
    );
  });
});

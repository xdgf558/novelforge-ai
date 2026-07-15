import { describe, expect, it } from "vitest";
import {
  appliedShortStoryWritingStylePresetId,
  applyShortStoryWritingStylePreset,
  shortStoryWritingStylePresetIds,
  shortStoryWritingStylePresets,
} from "./writing-style-presets";

describe("short-story writing style presets", () => {
  it("keeps unique ids and complete explainable dimensions", () => {
    expect(new Set(shortStoryWritingStylePresetIds).size).toBe(
      shortStoryWritingStylePresetIds.length,
    );
    expect(shortStoryWritingStylePresets.map((preset) => preset.id)).toEqual(
      shortStoryWritingStylePresetIds,
    );

    for (const preset of shortStoryWritingStylePresets) {
      expect(preset.label).toBeTruthy();
      expect(preset.referenceLabel).toContain("灵感参考");
      expect(preset.dimensions).toHaveLength(4);
      expect(preset.styleGuide).toContain("原创边界");
      expect(preset.emotionalTone).toBeTruthy();
    }
  });

  it("keeps author references in the UI metadata instead of model guidance", () => {
    const protectedNames = ["卫斯理", "海因莱因", "阿西莫夫", "菲利普", "迪克"];

    for (const preset of shortStoryWritingStylePresets) {
      for (const name of protectedNames) {
        expect(preset.styleGuide).not.toContain(name);
        expect(preset.emotionalTone).not.toContain(name);
      }
    }
  });

  it("applies a preset while preserving existing custom guidance", () => {
    const applied = applyShortStoryWritingStylePreset(
      "对白需要保持克制，不使用网络流行语。",
      "logical-thought-experiment",
    );

    expect(applied).not.toBeNull();
    expect(applied?.styleSample).toContain("【短故事文风预设：逻辑推演与思想实验】");
    expect(applied?.styleSample).toContain("【作者补充】");
    expect(applied?.styleSample).toContain("不使用网络流行语");
    expect(applied?.emotionalTone).toContain("智性张力");
    expect(appliedShortStoryWritingStylePresetId(applied?.styleSample)).toBe(
      "logical-thought-experiment",
    );
  });

  it("replaces an old preset without stacking its generated guidance", () => {
    const first = applyShortStoryWritingStylePreset(
      "对白需要保持克制。",
      "logical-thought-experiment",
    );
    const second = applyShortStoryWritingStylePreset(
      first?.styleSample ?? "",
      "reality-dislocation",
    );

    expect(second?.styleSample).toContain("【短故事文风预设：现实错位与身份疑云】");
    expect(second?.styleSample).not.toContain("【短故事文风预设：逻辑推演与思想实验】");
    expect(second?.styleSample).toContain("对白需要保持克制");
  });
});

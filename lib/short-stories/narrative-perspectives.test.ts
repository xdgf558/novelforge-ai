import { describe, expect, it } from "vitest";
import {
  appliedShortStoryNarrativePerspectiveId,
  applyShortStoryNarrativePerspective,
  shortStoryNarrativePerspectiveIds,
  shortStoryNarrativePerspectives,
} from "./narrative-perspectives";

describe("short-story narrative perspectives", () => {
  it("keeps four unique explainable options", () => {
    expect(new Set(shortStoryNarrativePerspectiveIds).size).toBe(
      shortStoryNarrativePerspectiveIds.length,
    );
    expect(shortStoryNarrativePerspectives.map((item) => item.id)).toEqual(
      shortStoryNarrativePerspectiveIds,
    );

    for (const perspective of shortStoryNarrativePerspectives) {
      expect(perspective.label).toBeTruthy();
      expect(perspective.summary).toBeTruthy();
      expect(perspective.dimensions).toHaveLength(4);
      expect(perspective.guide).toContain(`【短故事叙事视角：${perspective.label}】`);
      expect(perspective.guide).toMatch(/信息|观察/);
    }
  });

  it("defines the immersive third-person boundary and self-check", () => {
    const perspective = shortStoryNarrativePerspectives.find(
      (item) => item.id === "immersive-third-person-limited",
    );

    expect(perspective?.recommended).toBe(true);
    expect(perspective?.guide).toContain("主角看不见的，读者不能直接看见");
    expect(perspective?.guide).toContain("不得直接进入其他人物");
    expect(perspective?.guide).toContain("他看见");
    expect(perspective?.guide).toContain("临时替换为“我”");
  });

  it("applies a perspective while preserving author guidance", () => {
    const applied = applyShortStoryNarrativePerspective(
      "危险场景可以短暂强化听觉细节。",
      "immersive-third-person-limited",
    );

    expect(applied).toContain("【短故事叙事视角：沉浸式第三人称限制】");
    expect(applied).toContain("【作者补充】");
    expect(applied).toContain("强化听觉细节");
    expect(appliedShortStoryNarrativePerspectiveId(applied)).toBe(
      "immersive-third-person-limited",
    );
  });

  it("replaces an old perspective without stacking generated rules", () => {
    const first = applyShortStoryNarrativePerspective(
      "对话场景仍需保持空间方位清楚。",
      "immersive-third-person-limited",
    );
    const second = applyShortStoryNarrativePerspective(
      first ?? "",
      "multi-character-limited",
    );

    expect(second).toContain("【短故事叙事视角：多人物限制视角】");
    expect(second).not.toContain("【短故事叙事视角：沉浸式第三人称限制】");
    expect(second).toContain("空间方位清楚");
  });
});

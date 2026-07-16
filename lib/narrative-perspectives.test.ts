import { describe, expect, it } from "vitest";
import {
  appliedNarrativePerspectiveId,
  applyNarrativePerspective,
  narrativePerspectiveIds,
  narrativePerspectives,
} from "./narrative-perspectives";

describe("narrative perspectives", () => {
  it("keeps four unique explainable options", () => {
    expect(new Set(narrativePerspectiveIds).size).toBe(
      narrativePerspectiveIds.length,
    );
    expect(narrativePerspectives.map((item) => item.id)).toEqual(
      narrativePerspectiveIds,
    );

    for (const perspective of narrativePerspectives) {
      expect(perspective.label).toBeTruthy();
      expect(perspective.legacyLabels.length).toBeGreaterThan(0);
      expect(perspective.summary).toBeTruthy();
      expect(perspective.dimensions).toHaveLength(4);
      expect(perspective.guide).toContain(`【叙事视角:${perspective.id}】`);
      expect(perspective.guide).toContain(`视角名称：${perspective.label}`);
      expect(perspective.guide).toMatch(/信息|观察/);
    }
  });

  it("defines the immersive third-person boundary and self-check", () => {
    const perspective = narrativePerspectives.find(
      (item) => item.id === "immersive-third-person-limited",
    );

    expect(perspective?.recommended).toBe(true);
    expect(perspective?.guide).toContain("主角看不见的，读者不能直接看见");
    expect(perspective?.guide).toContain("不得直接进入其他人物");
    expect(perspective?.guide).toContain("他看见");
    expect(perspective?.guide).toContain("临时替换为“我”");
  });

  it("applies a perspective while preserving author guidance", () => {
    const applied = applyNarrativePerspective(
      "危险场景可以短暂强化听觉细节。",
      "immersive-third-person-limited",
    );

    expect(applied).toContain("【叙事视角:immersive-third-person-limited】");
    expect(applied).toContain("【作者补充】");
    expect(applied).toContain("强化听觉细节");
    expect(appliedNarrativePerspectiveId(applied)).toBe(
      "immersive-third-person-limited",
    );
  });

  it("replaces an old perspective without stacking generated rules", () => {
    const first = applyNarrativePerspective(
      "对话场景仍需保持空间方位清楚。",
      "immersive-third-person-limited",
    );
    const second = applyNarrativePerspective(
      first ?? "",
      "multi-character-limited",
    );

    expect(second).toContain("【叙事视角:multi-character-limited】");
    expect(second).not.toContain(
      "【叙事视角:immersive-third-person-limited】",
    );
    expect(second).toContain("空间方位清楚");
  });

  it("recognizes legacy short-story markers", () => {
    expect(
      appliedNarrativePerspectiveId(
        "【短故事叙事视角：多人物限制视角】\n旧版正式规则。",
      ),
    ).toBe("multi-character-limited");
    expect(
      appliedNarrativePerspectiveId(
        "【短故事叙事视角:objective-camera】\n旧版正式规则。",
      ),
    ).toBe("objective-camera");
  });
});

import { describe, expect, it } from "vitest";
import {
  formatShortStoryBlueprintForContext,
  hasShortStoryBlueprintContent,
  shortStoryBlueprintFieldLabel,
  shortStoryBlueprintCompletedFieldCount,
  shortStoryBlueprintSnapshot,
  shortStoryBlueprintValuesFromRecord,
} from "./blueprint-fields";

describe("short-story blueprint fields", () => {
  it("normalizes missing fields into a stable snapshot", () => {
    const snapshot = shortStoryBlueprintSnapshot({
      premise: "  一个失忆者收到未来寄来的遗书。  ",
      ending: "他选择保留真实记忆。",
    });

    expect(snapshot.premise).toBe("一个失忆者收到未来寄来的遗书。");
    expect(snapshot.ending).toBe("他选择保留真实记忆。");
    expect(snapshot.coreConflict).toBe("");
    expect(Object.keys(snapshot)).toHaveLength(10);
  });

  it("counts completed fields and detects empty records", () => {
    const values = shortStoryBlueprintValuesFromRecord({
      premise: "前提",
      coreConflict: "冲突",
      ending: "结局",
    });

    expect(shortStoryBlueprintCompletedFieldCount(values)).toBe(3);
    expect(hasShortStoryBlueprintContent(values)).toBe(true);
    expect(hasShortStoryBlueprintContent(shortStoryBlueprintSnapshot({}))).toBe(
      false,
    );
  });

  it("formats labeled, bounded blueprint context for writing tasks", () => {
    const context = formatShortStoryBlueprintForContext(
      {
        premise: "  一个失忆者收到未来寄来的遗书。  ",
        reversalChain: "第一次误判；第二次揭示；最终反转。",
        ending: "他选择保留真实记忆。",
      },
      8,
    );

    expect(shortStoryBlueprintFieldLabel("reversalChain")).toBe("反转链");
    expect(context).toContain("## 核心前提");
    expect(context).toContain("一个失忆者收到未...");
    expect(context).toContain("## 反转链");
    expect(context).toContain("第一次误判；第二...");
    expect(context).toContain("## 结局");
    expect(context).not.toContain("## 核心冲突");
  });
});

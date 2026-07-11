import { describe, expect, it } from "vitest";
import {
  hasShortStoryBlueprintContent,
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
});

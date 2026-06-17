import { describe, expect, it } from "vitest";
import { aiTaskAdoptionLabel, aiTaskStatusLabel } from "./status";

describe("AI task labels", () => {
  it("labels known and unknown task statuses", () => {
    expect(aiTaskStatusLabel("pending")).toBe("待执行");
    expect(aiTaskStatusLabel("running")).toBe("执行中");
    expect(aiTaskStatusLabel("completed")).toBe("已完成");
    expect(aiTaskStatusLabel("unknown-status")).toBe("未知");
  });

  it("labels known and unknown adoption states", () => {
    expect(aiTaskAdoptionLabel("not_reviewed")).toBe("未审阅");
    expect(aiTaskAdoptionLabel("adopted")).toBe("已采纳");
    expect(aiTaskAdoptionLabel("rejected")).toBe("已拒绝");
    expect(aiTaskAdoptionLabel("unknown-state")).toBe("未知");
  });
});

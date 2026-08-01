import { describe, expect, it } from "vitest";
import {
  activeAiTaskStatuses,
  aiTaskAdoptionLabel,
  aiTaskStatusLabel,
  aiTaskStatusOptions,
  isActiveAiTaskStatus,
  type ActiveAiTaskStatus,
} from "./status";

describe("AI task labels", () => {
  it("labels known and unknown task statuses", () => {
    expect(aiTaskStatusLabel("pending")).toBe("待执行");
    expect(aiTaskStatusLabel("running")).toBe("执行中");
    expect(aiTaskStatusLabel("completed")).toBe("已完成");
    expect(aiTaskStatusLabel("unknown-status")).toBe("未知");
  });

  it("detects active task statuses", () => {
    expect(isActiveAiTaskStatus("pending")).toBe(true);
    expect(isActiveAiTaskStatus("running")).toBe(true);
    expect(isActiveAiTaskStatus("completed")).toBe(false);
    expect(isActiveAiTaskStatus(null)).toBe(false);
  });

  it("keeps shared active statuses literal and supported", () => {
    const expectedStatuses = [
      "pending",
      "running",
    ] satisfies readonly ActiveAiTaskStatus[];
    const supportedStatuses = new Set<string>(
      aiTaskStatusOptions.map((option) => option.value),
    );

    expect(activeAiTaskStatuses).toEqual(expectedStatuses);
    expect(
      activeAiTaskStatuses.every((status) => supportedStatuses.has(status)),
    ).toBe(true);
  });

  it("labels known and unknown adoption states", () => {
    expect(aiTaskAdoptionLabel("not_reviewed")).toBe("未审阅");
    expect(aiTaskAdoptionLabel("adopted")).toBe("已采纳");
    expect(aiTaskAdoptionLabel("rejected")).toBe("已拒绝");
    expect(aiTaskAdoptionLabel("unknown-state")).toBe("未知");
  });
});

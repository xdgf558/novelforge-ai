import { describe, expect, it } from "vitest";
import {
  aiTaskStatusLabel,
  aiTaskStatusTone,
  aiTaskTypeLabel,
  aiTaskTypeLabels,
} from "@/lib/ai/task-presentation";

describe("AI task presentation", () => {
  it("uses the task type keys written by the chapter workflow", () => {
    expect(aiTaskTypeLabel("chapter_beat_generation")).toBe("章节节拍生成");
    expect(aiTaskTypeLabel("chapter_summary_extraction")).toBe(
      "章节摘要提取",
    );
  });

  it("provides a Chinese label for every centrally registered task type", () => {
    for (const taskType of Object.keys(aiTaskTypeLabels)) {
      const label = aiTaskTypeLabel(taskType);
      expect(label).not.toContain("_");
      expect(label).not.toBe("其他 AI 任务");
    }
  });

  it("does not present a cancelled task as successfully completed", () => {
    expect(aiTaskStatusLabel("cancelled")).toBe("已取消");
    expect(aiTaskStatusTone("cancelled")).toBe("cancelled");
    expect(aiTaskStatusTone("completed")).toBe("success");
  });

  it("does not expose unknown internal task keys in the interface", () => {
    expect(aiTaskTypeLabel("future_internal_task")).toBe("其他 AI 任务");
  });
});

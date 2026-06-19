import { describe, expect, it } from "vitest";
import {
  aiTaskIdsToPrune,
  projectAiTaskRetentionLimit,
} from "./task-retention";

function task(id: string, offset: number, status = "completed") {
  return {
    id,
    status,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, offset)),
  };
}

describe("AI task retention", () => {
  it("keeps the newest project task records within the retention limit", () => {
    const tasks = Array.from({ length: 12 }, (_, index) =>
      task(`task_${index}`, index),
    );

    expect(aiTaskIdsToPrune(tasks)).toEqual(["task_1", "task_0"]);
  });

  it("keeps pending and running tasks even when they are older than the limit", () => {
    const tasks = Array.from(
      { length: projectAiTaskRetentionLimit + 2 },
      (_, index) => task(`task_${index}`, index),
    );

    tasks[0].status = "pending";
    tasks[1].status = "running";

    expect(aiTaskIdsToPrune(tasks)).toEqual([]);
  });
});
